/**
 * Wonder Pads — Cloudflare Worker
 *
 * FOUR jobs:
 *   1. /images/*            → serve images from the R2 bucket (this replaces Cloudinary)
 *   2. /admin/migrate        → one-time page to copy your existing 242 Cloudinary
 *                              photos into R2. Delete this section once done — see
 *                              the note at the bottom of this file.
 *   3. /api/upload            → NEW: lets your Fabric Photo Tool upload straight to
 *                              R2 instead of Cloudinary, for all future photos.
 *   4. everything else        → your normal website, unchanged
 *
 * IMPORTANT: change APP_SECRET below to your own private word before you
 * deploy this. Treat it like a password — it protects both the migration
 * page and the upload endpoint from randoms on the internet.
 */

const APP_SECRET = 'wonderpads-2026';

// ─────────────────────────────────────────────
// 0. Admin panel auth — real username/password login backed by the
//    admin_users table (username TEXT PRIMARY KEY, password_hash TEXT).
//    Sessions are stateless signed tokens (HMAC-SHA256 over a JSON
//    payload, keyed with APP_SECRET) so there's no sessions table to
//    manage — a token is valid if its signature checks out and it
//    hasn't expired. isAuthed() accepts EITHER a valid session token OR
//    the raw APP_SECRET, so every endpoint that used to gate on
//    APP_SECRET keeps working exactly as before if you ever need to
//    fall back to it; nothing that used the old shared secret breaks.
// ─────────────────────────────────────────────
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}
function base64UrlEncode(bytes) {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signSessionToken(username) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + SESSION_DURATION_MS });
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(payload));
  const key = await hmacKey();
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return { token: `${payloadB64}.${base64UrlEncode(new Uint8Array(sigBuf))}`, expiresAt: JSON.parse(payload).exp };
}

async function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadB64, sigB64] = token.split('.');
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(sigB64),
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload.u;
  } catch {
    return null;
  }
}

// True if `value` is either a still-valid session token or the raw
// master secret. Use this everywhere the old code did `x !== APP_SECRET`.
async function isAuthed(value) {
  if (!value) return false;
  if (value === APP_SECRET) return true;
  return !!(await verifySessionToken(value));
}

async function hashPassword(password, saltHex) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return `${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [saltHex] = stored.split(':');
  return (await hashPassword(password, saltHex)) === stored;
}

async function handleAdminLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Bad request body' }, 400);
  }
  const { username, password } = body;
  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400);
  }
  const row = await env.DB.prepare('SELECT username, password_hash FROM admin_users WHERE username = ?')
    .bind(username)
    .first();
  if (!row || !(await verifyPassword(password, row.password_hash))) {
    return jsonResponse({ error: 'Wrong username or password' }, 401);
  }
  const { token, expiresAt } = await signSessionToken(username);
  return jsonResponse({ success: true, token, expiresAt });
}

// One admin account only. Gated by the master secret (APP_SECRET) rather
// than a session token, since this is how you create the very first
// account — there's no session to have yet — and also how you reset the
// password later if you forget it.
async function handleAdminSetupAccount(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Bad request body' }, 400);
  }
  const { masterSecret, username, password } = body;
  if (masterSecret !== APP_SECRET) {
    return jsonResponse({ error: 'Wrong master secret' }, 403);
  }
  if (!username || !password) {
    return jsonResponse({ error: 'Username and password are required' }, 400);
  }
  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
  }
  const passwordHash = await hashPassword(password);
  await env.DB.prepare(
    `INSERT INTO admin_users (username, password_hash) VALUES (?, ?)
     ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`
  )
    .bind(username, passwordHash)
    .run();
  return jsonResponse({ success: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/images/')) {
      return handleImageRequest(url, env, ctx);
    }

    if (url.pathname === '/admin/migrate') {
      return new Response(ADMIN_PAGE_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/admin/migrate-batch' && request.method === 'POST') {
      return handleMigrateBatch(request, env);
    }

    if (url.pathname === '/api/upload' && request.method === 'POST') {
      return handleUpload(request, env);
    }

    // CORS preflight for the upload endpoint (needed if the tool is ever
    // hosted on a different domain than the Worker)
    if (url.pathname === '/api/upload' && request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // 5. Admin catalog — lists what's already sitting in an R2 folder
    if (url.pathname === '/api/r2-list' && request.method === 'GET') {
      return handleR2List(url, env);
    }

    // 5b. Admin panel auth — login and one-time account setup/reset
    if (url.pathname === '/api/admin/login' && request.method === 'POST') {
      return handleAdminLogin(request, env);
    }
    if (url.pathname === '/api/admin/setup-account' && request.method === 'POST') {
      return handleAdminSetupAccount(request, env);
    }

    // 6. Admin catalog — CRUD for the fabrics table (D1)
    if (url.pathname === '/api/admin/fabrics') {
      return handleAdminFabrics(request, url, env);
    }

    // 6b. Admin catalog — bulk-insert many fabrics at once (bulk import)
    if (url.pathname === '/api/admin/fabrics/bulk' && request.method === 'POST') {
      return handleAdminFabricsBulk(request, env);
    }

    // 7. Admin catalog — CRUD for the ready-made-stock table (D1)
    if (url.pathname === '/api/admin/stock') {
      return handleAdminStock(request, url, env);
    }

    // 7a. Admin catalog — bulk-insert many ready-made-stock items at once
    if (url.pathname === '/api/admin/stock/bulk' && request.method === 'POST') {
      return handleAdminStockBulk(request, env);
    }

    // 7b. Admin catalog — CRUD for the backing-fabrics table (D1)
    if (url.pathname === '/api/admin/backing') {
      return handleAdminBacking(request, url, env);
    }

    // 7c. Admin catalog — CRUD for the size-options table (D1)
    if (url.pathname === '/api/admin/sizes') {
      return handleAdminSizes(request, url, env);
    }

    // 7d. Admin catalog — CRUD for the absorbency-options table (D1)
    if (url.pathname === '/api/admin/absorbency') {
      return handleAdminAbsorbency(request, url, env);
    }

    // 7e. Admin catalog — CRUD for the shape-options table (D1)
    if (url.pathname === '/api/admin/shapes') {
      return handleAdminShapes(request, url, env);
    }

    // 7f. Admin catalog — CRUD for the blog_posts table (D1)
    if (url.pathname === '/api/admin/blog') {
      return handleAdminBlog(request, url, env);
    }

    // 7g. Admin catalog — CRUD for the faq table (D1)
    if (url.pathname === '/api/admin/faq') {
      return handleAdminFaq(request, url, env);
    }

    // 7h. Admin catalog — CRUD for the reviews table (D1)
    if (url.pathname === '/api/admin/reviews') {
      return handleAdminReviews(request, url, env);
    }

    // 7i. Admin catalog — read + status update + delete for the feedback
    //     table (D1). No create — feedback only ever comes from the site.
    if (url.pathname === '/api/admin/feedback') {
      return handleAdminFeedback(request, url, env);
    }

    // 7j. Admin catalog — CRUD for the settings table (D1, key/value)
    if (url.pathname === '/api/admin/settings') {
      return handleAdminSettings(request, url, env);
    }

    // 8. Public reads — for the storefront to eventually switch from
    //    static config.json to live D1 data (not wired up yet, see note
    //    at the bottom of this file)
    if (url.pathname === '/api/fabrics' && request.method === 'GET') {
      return handlePublicFabrics(env);
    }
    if (url.pathname === '/api/stock' && request.method === 'GET') {
      return handlePublicStock(env);
    }
    if (url.pathname === '/api/backing' && request.method === 'GET') {
      return handlePublicBacking(env);
    }
    if (url.pathname === '/api/sizes' && request.method === 'GET') {
      return handlePublicSizes(env);
    }
    if (url.pathname === '/api/absorbency' && request.method === 'GET') {
      return handlePublicAbsorbency(env);
    }
    if (url.pathname === '/api/shapes' && request.method === 'GET') {
      return handlePublicShapes(env);
    }
    if (url.pathname === '/api/blog' && request.method === 'GET') {
      return handlePublicBlog(env);
    }
    if (url.pathname === '/api/faq' && request.method === 'GET') {
      return handlePublicFaq(env);
    }
    if (url.pathname === '/api/reviews' && request.method === 'GET') {
      return handlePublicReviews(env);
    }

    // Everything else — your normal built site
    return env.ASSETS.fetch(request);
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ─────────────────────────────────────────────
// 1. Serving images from R2
// ─────────────────────────────────────────────
async function handleImageRequest(url, env, ctx) {
  const key = decodeURIComponent(url.pathname.replace(/^\/images\//, ''));
  if (!key) return new Response('Not found', { status: 404 });

  const cache = caches.default;
  const cacheKey = new Request(url.toString());
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const object = await env.IMAGES.get(key);
  if (!object) return new Response('Image not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  const response = new Response(object.body, { headers });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// ─────────────────────────────────────────────
// 2. The migration — copies your existing 242 Cloudinary photos into R2.
//    Runs in small batches so it never times out, skips images already
//    copied (safe to stop and restart).
// ─────────────────────────────────────────────
const CATEGORY_FOLDERS = {
  fabricsTop: 'fabrics-top',
  readyMadeStocks: 'ready-made',
};

function extFromUrl(u) {
  const m = u.match(/\.(jpg|jpeg|png|webp|gif|avif)(\?|$)/i);
  return m ? m[1].toLowerCase() : 'jpg';
}

async function handleMigrateBatch(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Bad request body' }, 400);
  }

  const { type, start = 0, count = 20, secret } = body;

  if (secret !== APP_SECRET) {
    return jsonResponse({ error: 'Wrong secret' }, 403);
  }
  if (!CATEGORY_FOLDERS[type]) {
    return jsonResponse({ error: `Unknown type: ${type}` }, 400);
  }

  const configReq = new Request(new URL('/config.json', request.url));
  const configRes = await env.ASSETS.fetch(configReq);
  if (!configRes.ok) {
    return jsonResponse({ error: 'Could not load config.json' }, 500);
  }
  const config = await configRes.json();
  const items = config[type] || [];
  const folder = CATEGORY_FOLDERS[type];
  const batch = items.slice(start, start + count);

  const results = [];

  for (const item of batch) {
    const imageUrl = item.imageUrl;
    if (!imageUrl || !imageUrl.includes('res.cloudinary.com')) {
      continue;
    }

    const ext = extFromUrl(imageUrl);
    const filename = `${item.id}.${ext}`;
    const r2Key = `${folder}/${filename}`;
    const newUrl = `/images/${folder}/${filename}`;

    const existing = await env.IMAGES.head(r2Key);
    if (!existing) {
      try {
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);
        const bytes = await imgRes.arrayBuffer();
        await env.IMAGES.put(r2Key, bytes, {
          httpMetadata: { contentType: imgRes.headers.get('content-type') || 'image/jpeg' },
        });
      } catch (err) {
        results.push({ id: item.id, error: String(err) });
        continue;
      }
    }

    results.push({ id: item.id, newUrl });
  }

  const nextStart = start + count < items.length ? start + count : null;

  return jsonResponse({
    type,
    total: items.length,
    processed: start + batch.length,
    results,
    nextStart,
  });
}

// ─────────────────────────────────────────────
// 3. NEW — Upload endpoint for the Fabric Photo Tool.
//    Accepts a compressed photo + tags from the browser tool and stores
//    it directly in R2, then returns the URL to use in config.json.
// ─────────────────────────────────────────────
function sanitizeFilename(name) {
  return String(name)
    .toLowerCase()
    .replace(/\.[^.]+$/, '') // strip extension, we always save as .jpg
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

async function handleUpload(request, env) {
  const headers = corsHeaders();

  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: 'Bad form data' }, 400, headers);
  }

  const secret = form.get('secret');
  if (secret !== APP_SECRET) {
    return jsonResponse({ error: 'Wrong secret' }, 403, headers);
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return jsonResponse({ error: 'No file provided' }, 400, headers);
  }

  const tags = (form.get('tags') || '').toString();
  const folder = (form.get('folder') || 'fabrics').toString().replace(/[^a-zA-Z0-9-_]/g, '') || 'fabrics';

  const baseName = sanitizeFilename(file.name || 'photo');
  const filename = `${Date.now()}-${baseName}.jpg`;
  const r2Key = `${folder}/${filename}`;

  try {
    const bytes = await file.arrayBuffer();
    await env.IMAGES.put(r2Key, bytes, {
      httpMetadata: { contentType: 'image/jpeg' },
      customMetadata: { tags },
    });
  } catch (err) {
    return jsonResponse({ error: 'Upload failed: ' + String(err) }, 500, headers);
  }

  return jsonResponse(
    {
      success: true,
      key: r2Key,
      url: `/images/${r2Key}`,
      tags,
    },
    200,
    headers
  );
}

function jsonResponse(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json', ...extraHeaders },
  });
}

// ─────────────────────────────────────────────
// 4. The migration admin page — plain HTML + JS, no build step needed.
//    Visit yoursite.workers.dev/admin/migrate to use it.
// ─────────────────────────────────────────────
const ADMIN_PAGE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Wonder Pads — Image Migration</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; line-height: 1.5; }
  button { font-size: 16px; padding: 10px 20px; cursor: pointer; }
  #progress { margin-top: 20px; white-space: pre-wrap; font-family: monospace; background: #f4f4f4; padding: 12px; border-radius: 6px; max-height: 300px; overflow-y: auto; }
  textarea { width: 100%; height: 300px; margin-top: 20px; font-family: monospace; font-size: 12px; }
  #secretInput { font-size: 16px; padding: 8px; width: 250px; }
</style>
</head>
<body>
  <h2>Wonder Pads — Move Images to R2</h2>
  <p>This copies all your Cloudinary images into your new storage bucket. Safe to stop and re-click — it skips images already copied.</p>

  <p>
    <label>Secret word: <input id="secretInput" type="password" placeholder="enter your APP_SECRET"></label>
  </p>
  <button id="startBtn">Start Migration</button>

  <div id="progress"></div>

  <div id="result" style="display:none">
    <h3>✅ Done! Copy the text below and paste it over your config.json on GitHub:</h3>
    <button id="copyBtn">Copy to clipboard</button>
    <textarea id="output" readonly></textarea>
  </div>

<script>
const progressEl = document.getElementById('progress');
const log = (msg) => { progressEl.textContent += msg + '\\n'; progressEl.scrollTop = progressEl.scrollHeight; };

async function runBatch(type, start, secret) {
  const res = await fetch('/admin/migrate-batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type, start, count: 20, secret }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || ('HTTP ' + res.status));
  }
  return res.json();
}

document.getElementById('startBtn').addEventListener('click', async () => {
  const secret = document.getElementById('secretInput').value;
  if (!secret) { alert('Enter the secret word first'); return; }

  document.getElementById('startBtn').disabled = true;
  const urlMap = {};

  try {
    for (const type of ['fabricsTop', 'readyMadeStocks']) {
      let start = 0;
      log('Starting ' + type + '...');
      while (start !== null) {
        const data = await runBatch(type, start, secret);
        for (const r of data.results) {
          if (r.newUrl) urlMap[type + ':' + r.id] = r.newUrl;
          if (r.error) log('  ⚠️ id ' + r.id + ' failed: ' + r.error);
        }
        log(type + ': ' + data.processed + ' / ' + data.total);
        start = data.nextStart;
      }
      log(type + ' complete.\\n');
    }

    log('Fetching config.json to rewrite it...');
    const configRes = await fetch('/config.json');
    const config = await configRes.json();

    for (const type of ['fabricsTop', 'readyMadeStocks']) {
      if (!Array.isArray(config[type])) continue;
      for (const item of config[type]) {
        const key = type + ':' + item.id;
        if (urlMap[key]) item.imageUrl = urlMap[key];
      }
    }

    document.getElementById('output').value = JSON.stringify(config, null, 2);
    document.getElementById('result').style.display = 'block';
    log('\\n✅ ALL DONE. Copy the text below into config.json on GitHub.');
  } catch (err) {
    log('❌ ERROR: ' + err.message);
    document.getElementById('startBtn').disabled = false;
  }
});

document.getElementById('copyBtn').addEventListener('click', () => {
  const ta = document.getElementById('output');
  ta.select();
  document.execCommand('copy');
  alert('Copied! Now paste this over config.json on GitHub.');
});
</script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 5. Admin catalog — browse what's already uploaded to an R2 folder
//    (so you can pick from photos your Fabric Photo Tool already sent
//    to R2, instead of re-uploading)
// ─────────────────────────────────────────────
async function handleR2List(url, env) {
  const secret = url.searchParams.get('secret');
  if (!(await isAuthed(secret))) {
    return jsonResponse({ error: 'Wrong secret' }, 403);
  }

  const folder = (url.searchParams.get('folder') || '').replace(/[^a-zA-Z0-9-_ ]/g, '');
  if (!folder) {
    return jsonResponse({ error: 'folder is required' }, 400);
  }

  const listed = await env.IMAGES.list({ prefix: `${folder}/`, limit: 500, include: ['customMetadata'] });
  const files = listed.objects.map((obj) => ({
    key: obj.key,
    url: `/images/${obj.key}`,
    size: obj.size,
    uploaded: obj.uploaded,
    tags: (obj.customMetadata && obj.customMetadata.tags) || '',
  }));

  return jsonResponse({ folder, files });
}

// ─────────────────────────────────────────────
// 6. Admin catalog — fabrics table (D1)
//    GET    /api/admin/fabrics?secret=...            -> list every fabric
//    POST   /api/admin/fabrics   { secret, fabric }   -> add or update one
//    DELETE /api/admin/fabrics?id=...&secret=...      -> remove one
// ─────────────────────────────────────────────
async function handleAdminFabrics(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM fabrics_top ORDER BY category, name'
    ).all();
    return jsonResponse({ fabrics: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const f = body.fabric || {};
    if (!f.id || !f.name) {
      return jsonResponse({ error: 'fabric.id and fabric.name are required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO fabrics_top (id, name, category, material, description, color_hex, image_url, premium, hidden, stock_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         category = excluded.category,
         material = excluded.material,
         description = excluded.description,
         color_hex = excluded.color_hex,
         image_url = excluded.image_url,
         premium = excluded.premium,
         hidden = excluded.hidden,
         stock_status = excluded.stock_status`
    )
      .bind(
        f.id,
        f.name,
        f.category || 'General',
        f.material || '',
        f.description || '',
        f.color_hex || '',
        f.image_url || '',
        f.premium || 0,
        f.hidden || 0,
        f.stock_status || 'in_stock'
      )
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM fabrics_top WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 6b. Admin catalog — bulk fabric import. Takes an array of fabrics
//    (same shape as a single POST /api/admin/fabrics body) and writes
//    them all in one D1 batch, so importing 20+ photos at once from
//    the Bulk Import tab doesn't mean 20+ round trips. All-or-nothing:
//    if one row is malformed the whole batch is rejected before any
//    writes happen, so a partial import can't silently leave the
//    catalog half-updated.
// ─────────────────────────────────────────────
async function handleAdminFabricsBulk(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Bad request body' }, 400);
  }
  if (!(await isAuthed(body.secret))) {
    return jsonResponse({ error: 'Wrong secret' }, 403);
  }
  const list = Array.isArray(body.fabrics) ? body.fabrics : [];
  if (list.length === 0) {
    return jsonResponse({ error: 'fabrics must be a non-empty array' }, 400);
  }
  for (const f of list) {
    if (!f.id || !f.name) {
      return jsonResponse({ error: `Every fabric needs an id and name — "${f.name || f.id || '(untitled)'}" is missing one` }, 400);
    }
  }

  const stmt = env.DB.prepare(
    `INSERT INTO fabrics_top (id, name, category, material, description, color_hex, image_url, premium, hidden, stock_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       category = excluded.category,
       material = excluded.material,
       description = excluded.description,
       color_hex = excluded.color_hex,
       image_url = excluded.image_url,
       premium = excluded.premium,
       hidden = excluded.hidden,
       stock_status = excluded.stock_status`
  );

  const batch = list.map((f) =>
    stmt.bind(
      f.id,
      f.name,
      f.category || 'General',
      f.material || '',
      f.description || '',
      f.color_hex || '',
      f.image_url || '',
      f.premium || 0,
      f.hidden || 0,
      f.stock_status || 'in_stock'
    )
  );

  await env.DB.batch(batch);
  return jsonResponse({ success: true, count: list.length });
}

// ─────────────────────────────────────────────
// 7. Admin catalog — ready_made_stocks table (D1)
//    Same GET / POST / DELETE shape as fabrics, above.
// ─────────────────────────────────────────────
async function handleAdminStock(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM ready_made_stocks ORDER BY size_category, name'
    ).all();
    return jsonResponse({ stocks: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const s = body.stock || {};
    if (!s.id || !s.name || !s.size_category) {
      return jsonResponse({ error: 'stock.id, stock.name and stock.size_category are required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO ready_made_stocks (id, name, size_category, price, qty_available, image_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         size_category = excluded.size_category,
         price = excluded.price,
         qty_available = excluded.qty_available,
         image_url = excluded.image_url,
         notes = excluded.notes`
    )
      .bind(
        s.id,
        s.name,
        s.size_category,
        s.price || 0,
        s.qty_available ?? 1,
        s.image_url || '',
        s.notes || ''
      )
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM ready_made_stocks WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7a. Admin catalog — bulk RTS import. Same shape and same all-or-
//    nothing batch behavior as the fabrics bulk import above.
// ─────────────────────────────────────────────
async function handleAdminStockBulk(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Bad request body' }, 400);
  }
  if (!(await isAuthed(body.secret))) {
    return jsonResponse({ error: 'Wrong secret' }, 403);
  }
  const list = Array.isArray(body.stocks) ? body.stocks : [];
  if (list.length === 0) {
    return jsonResponse({ error: 'stocks must be a non-empty array' }, 400);
  }
  for (const s of list) {
    if (!s.id || !s.name || !s.size_category) {
      return jsonResponse({ error: `Every item needs an id, name, and size category — "${s.name || s.id || '(untitled)'}" is missing one` }, 400);
    }
  }

  const stmt = env.DB.prepare(
    `INSERT INTO ready_made_stocks (id, name, size_category, price, qty_available, image_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       size_category = excluded.size_category,
       price = excluded.price,
       qty_available = excluded.qty_available,
       image_url = excluded.image_url,
       notes = excluded.notes`
  );

  const batch = list.map((s) =>
    stmt.bind(
      s.id,
      s.name,
      s.size_category,
      s.price || 0,
      s.qty_available ?? 1,
      s.image_url || '',
      s.notes || ''
    )
  );

  await env.DB.batch(batch);
  return jsonResponse({ success: true, count: list.length });
}


//    Same GET / POST / DELETE shape as fabrics, above. No photos —
//    backing fabrics are shown by color swatch (color_hex), not an image.
//    "properties" is stored as a JSON array (e.g. ["Soft & breathable"]).
// ─────────────────────────────────────────────
async function handleAdminBacking(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM fabrics_backing ORDER BY name'
    ).all();
    return jsonResponse({ backings: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const b = body.backing || {};
    if (!b.id || !b.name) {
      return jsonResponse({ error: 'backing.id and backing.name are required' }, 400);
    }
    let propertiesJson = '[]';
    try {
      propertiesJson = JSON.stringify(Array.isArray(b.properties) ? b.properties : []);
    } catch {
      propertiesJson = '[]';
    }
    await env.DB.prepare(
      `INSERT INTO fabrics_backing (id, name, type, material, description, color_hex, premium, properties, stock_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         type = excluded.type,
         material = excluded.material,
         description = excluded.description,
         color_hex = excluded.color_hex,
         premium = excluded.premium,
         properties = excluded.properties,
         stock_status = excluded.stock_status`
    )
      .bind(
        b.id,
        b.name,
        b.type || 'backing',
        b.material || '',
        b.description || '',
        b.color_hex || '',
        b.premium || 0,
        propertiesJson,
        b.stock_status || 'in_stock'
      )
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM fabrics_backing WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7c. Admin catalog — size_options table (D1)
//    Same GET / POST / DELETE shape as fabrics, above. Column names
//    confirmed against the live schema via sqlite_master.
// ─────────────────────────────────────────────
async function handleAdminSizes(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM size_options ORDER BY sort_order, length_inches'
    ).all();
    return jsonResponse({ sizes: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const s = body.size || {};
    if (!s.id || !s.name) {
      return jsonResponse({ error: 'size.id and size.name are required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO size_options (id, name, length_inches, width_cm, description, price_base, best_for, color_label, min_length, max_length, layer_upgrade, backing_upgrade, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         length_inches = excluded.length_inches,
         width_cm = excluded.width_cm,
         description = excluded.description,
         price_base = excluded.price_base,
         best_for = excluded.best_for,
         color_label = excluded.color_label,
         min_length = excluded.min_length,
         max_length = excluded.max_length,
         layer_upgrade = excluded.layer_upgrade,
         backing_upgrade = excluded.backing_upgrade,
         sort_order = excluded.sort_order`
    )
      .bind(
        s.id,
        s.name,
        s.length_inches || 0,
        s.width_cm || 0,
        s.description || '',
        s.price_base || 0,
        s.best_for || '',
        s.color_label || '',
        s.min_length || 0,
        s.max_length || 0,
        s.layer_upgrade || 0,
        s.backing_upgrade || 0,
        s.sort_order || 0
      )
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM size_options WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7d. Admin catalog — absorbency_options table (D1)
// ─────────────────────────────────────────────
async function handleAdminAbsorbency(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM absorbency_options ORDER BY sort_order, core_layers'
    ).all();
    return jsonResponse({ absorbency: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const a = body.absorbency || {};
    if (!a.id || !a.name) {
      return jsonResponse({ error: 'absorbency.id and absorbency.name are required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO absorbency_options (id, name, core_layers, description, icon, price_modifier, capacity_ml, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         core_layers = excluded.core_layers,
         description = excluded.description,
         icon = excluded.icon,
         price_modifier = excluded.price_modifier,
         capacity_ml = excluded.capacity_ml,
         sort_order = excluded.sort_order`
    )
      .bind(
        a.id,
        a.name,
        a.core_layers || 1,
        a.description || '',
        a.icon || '',
        a.price_modifier || 0,
        a.capacity_ml || 0,
        a.sort_order || 0
      )
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM absorbency_options WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7e. Admin catalog — shape_options table (D1). Simplest of the three —
//    just id, name, description.
// ─────────────────────────────────────────────
async function handleAdminShapes(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM shape_options ORDER BY sort_order, name'
    ).all();
    return jsonResponse({ shapes: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const sh = body.shape || {};
    if (!sh.id || !sh.name) {
      return jsonResponse({ error: 'shape.id and shape.name are required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO shape_options (id, name, description, sort_order)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         sort_order = excluded.sort_order`
    )
      .bind(sh.id, sh.name, sh.description || '', sh.sort_order || 0)
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM shape_options WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7f. Admin catalog — blog_posts table (D1)
//    Same GET / POST / DELETE shape as fabrics, above. IDs are generated
//    from the title (slug + random suffix) since the admin form doesn't
//    ask for one directly.
// ─────────────────────────────────────────────
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

async function handleAdminBlog(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM blog_posts ORDER BY created_at DESC'
    ).all();
    return jsonResponse({ posts: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const p = body.post || {};
    if (!p.title) {
      return jsonResponse({ error: 'post.title is required' }, 400);
    }
    const id = p.id || `${slugify(p.title)}-${Date.now().toString(36)}`;
    await env.DB.prepare(
      `INSERT INTO blog_posts (id, title, content, image_url, author)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         content = excluded.content,
         image_url = excluded.image_url,
         author = excluded.author`
    )
      .bind(id, p.title, p.content || '', p.image_url || '', p.author || '')
      .run();
    return jsonResponse({ success: true, id });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7g. Admin catalog — faq table (D1)
//    "source" defaults to 'wpn' in the schema — used to tell WPN's own
//    FAQ entries apart from the ECP washing Q&As merged in alongside
//    them. IDs are generated from the question.
// ─────────────────────────────────────────────
async function handleAdminFaq(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM faq ORDER BY sort_order, question'
    ).all();
    return jsonResponse({ faqs: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const f = body.faq || {};
    if (!f.question || !f.answer) {
      return jsonResponse({ error: 'faq.question and faq.answer are required' }, 400);
    }
    const id = f.id || `${slugify(f.question)}-${Date.now().toString(36)}`;
    await env.DB.prepare(
      `INSERT INTO faq (id, question, answer, source, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         question = excluded.question,
         answer = excluded.answer,
         source = excluded.source,
         sort_order = excluded.sort_order`
    )
      .bind(id, f.question, f.answer, f.source || 'wpn', f.sort_order || 0)
      .run();
    return jsonResponse({ success: true, id });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM faq WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7h. Admin catalog — reviews table (D1)
//    Handles both cases: admin pastes in a testimonial manually, or a
//    future public submission form inserts one with verified = 0 for
//    admin to approve (flip verified to 1) or delete. IDs are generated
//    from the customer name.
// ─────────────────────────────────────────────
async function handleAdminReviews(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM reviews ORDER BY sort_order, created_at DESC'
    ).all();
    return jsonResponse({ reviews: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const r = body.review || {};
    if (!r.quote) {
      return jsonResponse({ error: 'review.quote is required' }, 400);
    }
    const id = r.id || `${slugify(r.customer_name || 'review')}-${Date.now().toString(36)}`;
    await env.DB.prepare(
      `INSERT INTO reviews (id, customer_name, quote, verified, sort_order)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         customer_name = excluded.customer_name,
         quote = excluded.quote,
         verified = excluded.verified,
         sort_order = excluded.sort_order`
    )
      .bind(id, r.customer_name || '', r.quote, r.verified ?? 1, r.sort_order || 0)
      .run();
    return jsonResponse({ success: true, id });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM reviews WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7i. Admin catalog — feedback table (D1). Read-only inbox from the site
//    plus a status field for triage. NOTE: the live schema doesn't have
//    a status column yet — run this once against your D1 before using
//    this tab:
//      ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT 'new';
//    No POST/create here — feedback only ever comes from the storefront.
// ─────────────────────────────────────────────
async function handleAdminFeedback(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM feedback ORDER BY created_at DESC'
    ).all();
    return jsonResponse({ feedback: results });
  }

  // Status update only — PATCH { secret, id, status }
  if (request.method === 'PATCH') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    if (!body.id || !body.status) {
      return jsonResponse({ error: 'id and status are required' }, 400);
    }
    await env.DB.prepare('UPDATE feedback SET status = ? WHERE id = ?')
      .bind(body.status, body.id)
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const id = url.searchParams.get('id');
    if (!id) return jsonResponse({ error: 'id is required' }, 400);
    await env.DB.prepare('DELETE FROM feedback WHERE id = ?').bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}

// ─────────────────────────────────────────────
// 7j. Admin catalog — settings table (D1). Generic key/value store —
//    no fixed columns, so this is a plain list of rows rather than a
//    single form. Delete uses "key" as the identifier, not "id".
// ─────────────────────────────────────────────
async function handleAdminSettings(request, url, env) {
  if (request.method === 'GET') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const { results } = await env.DB.prepare(
      'SELECT * FROM settings ORDER BY key'
    ).all();
    return jsonResponse({ settings: results });
  }

  if (request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'Bad request body' }, 400);
    }
    if (!(await isAuthed(body.secret))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const key = body.key;
    if (!key) {
      return jsonResponse({ error: 'key is required' }, 400);
    }
    await env.DB.prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
      .bind(key, body.value ?? '')
      .run();
    return jsonResponse({ success: true });
  }

  if (request.method === 'DELETE') {
    if (!(await isAuthed(url.searchParams.get('secret')))) {
      return jsonResponse({ error: 'Wrong secret' }, 403);
    }
    const key = url.searchParams.get('key');
    if (!key) return jsonResponse({ error: 'key is required' }, 400);
    await env.DB.prepare('DELETE FROM settings WHERE key = ?').bind(key).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Method not allowed' }, 405);
}


// ─────────────────────────────────────────────
async function handlePublicFabrics(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM fabrics_top WHERE hidden = 0 AND stock_status != 'hidden' ORDER BY category, name"
  ).all();
  return jsonResponse({ fabrics: results });
}

async function handlePublicStock(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM ready_made_stocks WHERE qty_available > 0 ORDER BY size_category, name'
  ).all();
  return jsonResponse({ stocks: results });
}

async function handlePublicBacking(env) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM fabrics_backing WHERE stock_status != 'hidden' ORDER BY name"
  ).all();
  return jsonResponse({ backings: results });
}

async function handlePublicSizes(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM size_options ORDER BY sort_order, length_inches'
  ).all();
  return jsonResponse({ sizes: results });
}

async function handlePublicAbsorbency(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM absorbency_options ORDER BY sort_order, core_layers'
  ).all();
  return jsonResponse({ absorbency: results });
}

async function handlePublicShapes(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM shape_options ORDER BY sort_order, name'
  ).all();
  return jsonResponse({ shapes: results });
}

async function handlePublicBlog(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM blog_posts ORDER BY created_at DESC'
  ).all();
  return jsonResponse({ posts: results });
}

async function handlePublicFaq(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM faq ORDER BY sort_order, question'
  ).all();
  return jsonResponse({ faqs: results });
}

async function handlePublicReviews(env) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM reviews WHERE verified = 1 ORDER BY sort_order, created_at DESC'
  ).all();
  return jsonResponse({ reviews: results });
}

// ─────────────────────────────────────────────
// CLEANUP — once the migration (job #2) is done and confirmed working,
//   tell Claude "migration is done" and it will give you a trimmed
//   version of this file with the /admin/* routes removed, so no one
//   can trigger it again. Keep /api/upload — that one's permanent,
//   your Fabric Photo Tool needs it going forward.
// ─────────────────────────────────────────────

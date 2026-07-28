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

    // 6. Admin catalog — CRUD for the fabrics table (D1)
    if (url.pathname === '/api/admin/fabrics') {
      return handleAdminFabrics(request, url, env);
    }

    // 7. Admin catalog — CRUD for the ready-made-stock table (D1)
    if (url.pathname === '/api/admin/stock') {
      return handleAdminStock(request, url, env);
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
  if (secret !== APP_SECRET) {
    return jsonResponse({ error: 'Wrong secret' }, 403);
  }

  const folder = (url.searchParams.get('folder') || '').replace(/[^a-zA-Z0-9-_ ]/g, '');
  if (!folder) {
    return jsonResponse({ error: 'folder is required' }, 400);
  }

  const listed = await env.IMAGES.list({ prefix: `${folder}/`, limit: 500 });
  const files = listed.objects.map((obj) => ({
    key: obj.key,
    url: `/images/${obj.key}`,
    size: obj.size,
    uploaded: obj.uploaded,
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
    if (url.searchParams.get('secret') !== APP_SECRET) {
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
    if (body.secret !== APP_SECRET) {
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
    if (url.searchParams.get('secret') !== APP_SECRET) {
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
// 7. Admin catalog — ready_made_stocks table (D1)
//    Same GET / POST / DELETE shape as fabrics, above.
// ─────────────────────────────────────────────
async function handleAdminStock(request, url, env) {
  if (request.method === 'GET') {
    if (url.searchParams.get('secret') !== APP_SECRET) {
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
    if (body.secret !== APP_SECRET) {
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
    if (url.searchParams.get('secret') !== APP_SECRET) {
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
// 8. Public reads — no secret required. Not wired into the storefront
//    yet (App.jsx still reads the static /config.json) — that's the
//    next step once the D1 catalog actually has real data in it.
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

// ─────────────────────────────────────────────
// CLEANUP — once the migration (job #2) is done and confirmed working,
//   tell Claude "migration is done" and it will give you a trimmed
//   version of this file with the /admin/* routes removed, so no one
//   can trigger it again. Keep /api/upload — that one's permanent,
//   your Fabric Photo Tool needs it going forward.
// ─────────────────────────────────────────────

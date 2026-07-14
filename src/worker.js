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

const APP_SECRET = 'wonderpads-secret-2026'; // <-- change this to anything you like, then remember it

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
// CLEANUP — once the migration (job #2) is done and confirmed working,
//   tell Claude "migration is done" and it will give you a trimmed
//   version of this file with the /admin/* routes removed, so no one
//   can trigger it again. Keep /api/upload — that one's permanent,
//   your Fabric Photo Tool needs it going forward.
// ─────────────────────────────────────────────

import { useState, useEffect } from 'react'

// Wonder Pads — Admin Catalog
//
// Lets you pull photos you've already uploaded to R2 (via the Fabric Photo
// Tool) into real catalog entries — replacing the old batch-imported
// placeholder junk in config.json. Two tabs: Fabrics and Ready-Made Stock.
//
// Auth is the same simple secret-word pattern as /admin/migrate and the
// Fabric Photo Tool — type it once per visit, nothing is stored.

const c = {
  rose: '#8b3a52',
  roseLight: '#fdf0ed',
  green: '#7a9e80',
  text: '#3a2020',
  muted: '#9a7070',
  border: '#e8d0d0',
  white: '#ffffff',
  bg: '#fdf8f5',
}

// Same folder list as the Fabric Photo Tool's dropdown. If a folder was
// uploaded under different casing/spelling there, just type the exact
// name in the "or type a folder name" box below instead.
const FOLDERS = [
  'General', 'Flowers', 'Kimmi', 'Characters', 'Abstract', 'Halloween',
  'Animal', 'Solid', 'Organic', 'Batik', 'New arrivals', 'Leaving soon',
  'Ready-made stock', 'Blog',
]

const SIZE_CATEGORIES = [
  { id: 'liner', name: 'Liner' },
  { id: 'light', name: 'Light' },
  { id: 'moderate', name: 'Moderate' },
  { id: 'heavy', name: 'Heavy' },
  { id: 'extra_long', name: 'Extra Long' },
]

export default function AdminCatalog({ onBack }) {
  const [secret, setSecret] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [secretInput, setSecretInput] = useState('')
  const [authError, setAuthError] = useState('')

  const [tab, setTab] = useState('fabrics') // see TABS array below for all valid ids

  function tryUnlock() {
    if (!secretInput) return
    setSecret(secretInput)
    setUnlocked(true)
    setAuthError('')
  }

  if (!unlocked) {
    return (
      <div style={styles.container}>
        <div style={styles.lockCard}>
          <div style={styles.lockTitle}>🔒 Admin Catalog</div>
          <input
            type="password"
            style={styles.input}
            placeholder="Secret word"
            value={secretInput}
            onChange={e => setSecretInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && tryUnlock()}
          />
          <button style={styles.btnPrimary} onClick={tryUnlock}>Unlock</button>
          {authError && <div style={styles.errorText}>{authError}</div>}
          <button style={styles.linkBtn} onClick={onBack}>← Back to site</button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <button style={styles.linkBtn} onClick={onBack}>← Back to site</button>
        <div style={styles.topTitle}>Admin Catalog</div>
        <div style={{ width: 80 }} />
      </div>

      <div style={styles.tabRow}>
        {TABS.map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(tab === t.id ? styles.tabActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fabrics' && <FabricsTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'stock' && <StockTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'backing' && <BackingTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'sizes' && <SizesTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'absorbency' && <AbsorbencyTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'shapes' && <ShapesTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'blog' && <BlogTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'faq' && <FaqTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'reviews' && <ReviewsTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'feedback' && <FeedbackTab secret={secret} onAuthError={setAuthError} />}
      {tab === 'settings' && <SettingsTab secret={secret} onAuthError={setAuthError} />}
    </div>
  )
}

const TABS = [
  { id: 'fabrics', label: 'Fabrics' },
  { id: 'stock', label: 'Ready-Made Stock' },
  { id: 'backing', label: 'Backing Fabrics' },
  { id: 'sizes', label: 'Sizes' },
  { id: 'absorbency', label: 'Absorbency' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'blog', label: 'Blog' },
  { id: 'faq', label: 'FAQ' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'settings', label: 'Settings' },
]

// ─────────────────────────────────────────────
// Shared: browse an R2 folder, pick a photo not yet in the catalog
// ─────────────────────────────────────────────
function useR2Browser(secret) {
  const [folder, setFolder] = useState(FOLDERS[0])
  const [customFolder, setCustomFolder] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function browse() {
    const target = customFolder.trim() || folder
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/r2-list?folder=${encodeURIComponent(target)}&secret=${encodeURIComponent(secret)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to browse folder')
      setFiles(data.files)
    } catch (err) {
      setError(String(err.message || err))
      setFiles([])
    }
    setLoading(false)
  }

  return { folder, setFolder, customFolder, setCustomFolder, files, loading, error, browse }
}

function FolderBrowser({ browser, existingImageUrls, onPick }) {
  const unpicked = browser.files.filter(f => !existingImageUrls.includes(f.url))
  return (
    <div style={styles.card}>
      <div style={styles.label}>BROWSE AN R2 FOLDER</div>
      <div style={styles.row}>
        <select style={styles.select} value={browser.folder} onChange={e => browser.setFolder(e.target.value)}>
          {FOLDERS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button style={styles.btnSecondary} onClick={browser.browse}>
          {browser.loading ? 'Loading…' : 'Browse'}
        </button>
      </div>
      <input
        style={{ ...styles.input, marginTop: 8 }}
        placeholder="...or type the exact folder name if it's not in the list above"
        value={browser.customFolder}
        onChange={e => browser.setCustomFolder(e.target.value)}
      />
      {browser.error && <div style={styles.errorText}>{browser.error}</div>}
      {browser.files.length > 0 && (
        <div style={styles.smallNote}>
          {unpicked.length} of {browser.files.length} photo{browser.files.length === 1 ? '' : 's'} not yet in the catalog
        </div>
      )}
      <div style={styles.thumbGrid}>
        {unpicked.map(f => (
          <div key={f.key} style={styles.thumbCard} onClick={() => onPick(f)}>
            <img src={f.url} alt="" style={styles.thumbImg} />
            <div style={styles.thumbKey}>{f.key.split('/').pop()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Fabrics tab
// ─────────────────────────────────────────────
function FabricsTab({ secret, onAuthError }) {
  const [fabrics, setFabrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null) // { id, name, category, material, description, color_hex, image_url, premium }
  const browser = useR2Browser(secret)

  async function loadFabrics() {
    setLoading(true)
    const res = await fetch(`/api/admin/fabrics?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setFabrics(data.fabrics)
    setLoading(false)
  }

  useEffect(() => { loadFabrics() }, [])

  function startNewFromFile(file) {
    const guessedName = file.key.split('/').pop().replace(/\.[^.]+$/, '').replace(/^\d+-/, '').replace(/-/g, ' ')
    setForm({
      id: guessedName.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
      name: guessedName,
      category: browser.folder,
      material: '',
      description: '',
      color_hex: '',
      image_url: file.url,
      premium: 0,
    })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('Name is required'); return }
    const res = await fetch('/api/admin/fabrics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, fabric: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadFabrics()
  }

  async function deleteFabric(id) {
    if (!confirm(`Remove "${id}" from the catalog?`)) return
    await fetch(`/api/admin/fabrics?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadFabrics()
  }

  const existingUrls = fabrics.map(f => f.image_url).filter(Boolean)

  return (
    <div>
      <FolderBrowser browser={browser} existingImageUrls={existingUrls} onPick={startNewFromFile} />

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>ADD FABRIC</div>
          <img src={form.image_url} alt="" style={styles.previewImg} />
          <input style={styles.input} placeholder="Display name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <input style={styles.input} placeholder="Category" value={form.category}
            onChange={e => setForm({ ...form, category: e.target.value })} />
          <input style={styles.input} placeholder="Material (e.g. Cotton Woven)" value={form.material}
            onChange={e => setForm({ ...form, material: e.target.value })} />
          <input style={styles.input} placeholder="Swatch color (hex, optional, e.g. #6d8374)" value={form.color_hex}
            onChange={e => setForm({ ...form, color_hex: e.target.value })} />
          <textarea style={styles.textarea} placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} type="number" step="0.5" placeholder="Premium (extra $, or 0)" value={form.premium}
            onChange={e => setForm({ ...form, premium: Number(e.target.value) })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Catalog</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>CATALOG ({fabrics.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {fabrics.map(f => (
              <div key={f.id} style={styles.entryRow}>
                {f.image_url && <img src={f.image_url} alt="" style={styles.entryThumb} />}
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{f.name}</div>
                  <div style={styles.entrySub}>{f.category} · {f.material || 'no material set'} · {f.stock_status}</div>
                </div>
                <button style={styles.deleteBtn} onClick={() => deleteFabric(f.id)}>✕</button>
              </div>
            ))}
            {fabrics.length === 0 && <div style={styles.smallNote}>No fabrics saved yet — browse a folder above to add your first one.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Ready-Made Stock tab
// ─────────────────────────────────────────────
function StockTab({ secret, onAuthError }) {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const browser = useR2Browser(secret)

  async function loadStocks() {
    setLoading(true)
    const res = await fetch(`/api/admin/stock?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setStocks(data.stocks)
    setLoading(false)
  }

  useEffect(() => { loadStocks() }, [])

  function startNewFromFile(file) {
    const guessedName = file.key.split('/').pop().replace(/\.[^.]+$/, '').replace(/^\d+-/, '').replace(/-/g, ' ')
    setForm({
      id: guessedName.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
      name: guessedName,
      size_category: 'light',
      price: 0,
      qty_available: 1,
      image_url: file.url,
      notes: '',
    })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('Name is required'); return }
    const res = await fetch('/api/admin/stock', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, stock: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadStocks()
  }

  async function deleteStock(id) {
    if (!confirm(`Remove "${id}" from ready-made stock?`)) return
    await fetch(`/api/admin/stock?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadStocks()
  }

  const existingUrls = stocks.map(s => s.image_url).filter(Boolean)

  return (
    <div>
      <FolderBrowser browser={browser} existingImageUrls={existingUrls} onPick={startNewFromFile} />

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>ADD READY-MADE STOCK ITEM</div>
          <img src={form.image_url} alt="" style={styles.previewImg} />
          <input style={styles.input} placeholder="Display name" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <select style={styles.select} value={form.size_category}
            onChange={e => setForm({ ...form, size_category: e.target.value })}>
            {SIZE_CATEGORIES.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
          </select>
          <input style={styles.input} type="number" step="0.5" placeholder="Price (S$)" value={form.price}
            onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
          <input style={styles.input} type="number" placeholder="Qty available" value={form.qty_available}
            onChange={e => setForm({ ...form, qty_available: Number(e.target.value) })} />
          <textarea style={styles.textarea} placeholder="Notes (optional)" value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Stock</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>READY-MADE STOCK ({stocks.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {stocks.map(s => (
              <div key={s.id} style={styles.entryRow}>
                {s.image_url && <img src={s.image_url} alt="" style={styles.entryThumb} />}
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{s.name}</div>
                  <div style={styles.entrySub}>{s.size_category} · S${Number(s.price).toFixed(2)} · qty {s.qty_available}</div>
                </div>
                <button style={styles.deleteBtn} onClick={() => deleteStock(s.id)}>✕</button>
              </div>
            ))}
            {stocks.length === 0 && <div style={styles.smallNote}>No stock items saved yet — browse a folder above to add your first one.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Backing Fabrics tab — no photos, shown by color swatch instead
// ─────────────────────────────────────────────
const BLANK_BACKING = {
  id: '', name: '', type: 'backing', material: '', description: '',
  color_hex: '#cccccc', premium: 0, properties: ['', ''], stock_status: 'in_stock',
}

function BackingTab({ secret, onAuthError }) {
  const [backings, setBackings] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadBackings() {
    setLoading(true)
    const res = await fetch(`/api/admin/backing?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setBackings(data.backings.map(b => ({
      ...b,
      properties: (() => { try { return JSON.parse(b.properties || '[]') } catch { return [] } })(),
    })))
    setLoading(false)
  }

  useEffect(() => { loadBackings() }, [])

  function startNew() {
    setForm({ ...BLANK_BACKING })
  }

  function startEdit(b) {
    setForm({ ...b, properties: [b.properties[0] || '', b.properties[1] || ''] })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('ID and name are required'); return }
    const res = await fetch('/api/admin/backing', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        secret,
        backing: { ...form, properties: form.properties.filter(Boolean) },
      }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadBackings()
  }

  async function deleteBacking(id) {
    if (!confirm(`Remove "${id}" from backing fabrics?`)) return
    await fetch(`/api/admin/backing?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadBackings()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Backing Fabric</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{backings.some(b => b.id === form.id) ? 'EDIT' : 'ADD'} BACKING FABRIC</div>
          <input style={styles.input} placeholder="Display name (e.g. Black Softshell Fleece)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <input style={styles.input} placeholder="Material (e.g. Softshell Fleece)" value={form.material}
            onChange={e => setForm({ ...form, material: e.target.value })} />
          <div style={styles.row}>
            <input style={{ ...styles.input, flex: 1 }} type="color" value={form.color_hex}
              onChange={e => setForm({ ...form, color_hex: e.target.value })} />
            <input style={{ ...styles.input, flex: 2 }} placeholder="#hexcode" value={form.color_hex}
              onChange={e => setForm({ ...form, color_hex: e.target.value })} />
          </div>
          <textarea style={styles.textarea} placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} placeholder="Tag 1 (e.g. Soft & breathable)" value={form.properties[0]}
            onChange={e => setForm({ ...form, properties: [e.target.value, form.properties[1]] })} />
          <input style={styles.input} placeholder="Tag 2 (e.g. Everyday durability)" value={form.properties[1]}
            onChange={e => setForm({ ...form, properties: [form.properties[0], e.target.value] })} />
          <select style={styles.select} value={form.stock_status}
            onChange={e => setForm({ ...form, stock_status: e.target.value })}>
            <option value="in_stock">In stock</option>
            <option value="leaving_soon">Leaving soon</option>
            <option value="hidden">Hidden</option>
          </select>
          <label style={{ ...styles.smallNote, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!form.premium}
              onChange={e => setForm({ ...form, premium: e.target.checked ? 1 : 0 })} />
            Premium fabric (extra cost)
          </label>
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Catalog</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>BACKING FABRICS ({backings.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {backings.map(b => (
              <div key={b.id} style={styles.entryRow} onClick={() => startEdit(b)}>
                <div style={{ ...styles.swatchDot, background: b.color_hex || '#ccc' }} />
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{b.name}</div>
                  <div style={styles.entrySub}>{b.material || 'no material set'} · {b.stock_status}{b.premium ? ' · premium' : ''}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteBacking(b.id) }}>✕</button>
              </div>
            ))}
            {backings.length === 0 && <div style={styles.smallNote}>No backing fabrics saved yet — add your first one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Sizes tab — the 5 fixed size categories (Liner, Light, Moderate, Heavy,
// Extra Long). No photos — edit in place. Liner is the only size with
// layer_upgrade / backing_upgrade fields, so those two inputs only show
// up when editing an entry whose id is "liner".
// ─────────────────────────────────────────────
const BLANK_SIZE = {
  id: '', name: '', length_inches: 0, width_cm: 0, description: '',
  price_base: 0, best_for: '', color_label: '', min_length: 0, max_length: 0,
  layer_upgrade: 0, backing_upgrade: 0, sort_order: 0,
}

function SizesTab({ secret, onAuthError }) {
  const [sizes, setSizes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadSizes() {
    setLoading(true)
    const res = await fetch(`/api/admin/sizes?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setSizes(data.sizes)
    setLoading(false)
  }

  useEffect(() => { loadSizes() }, [])

  function startNew() {
    setForm({ ...BLANK_SIZE })
  }

  function startEdit(s) {
    setForm({ ...BLANK_SIZE, ...s })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('ID and name are required'); return }
    const res = await fetch('/api/admin/sizes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, size: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadSizes()
  }

  async function deleteSize(id) {
    if (!confirm(`Remove "${id}" from sizes?`)) return
    await fetch(`/api/admin/sizes?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadSizes()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Size</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{sizes.some(s => s.id === form.id) ? 'EDIT' : 'ADD'} SIZE</div>
          <input style={styles.input} placeholder="Display name (e.g. Moderate)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces, e.g. moderate)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <div style={styles.row}>
            <input style={styles.input} type="number" placeholder="Length (inches)" value={form.length_inches}
              onChange={e => setForm({ ...form, length_inches: Number(e.target.value) })} />
            <input style={styles.input} type="number" placeholder="Width (cm)" value={form.width_cm}
              onChange={e => setForm({ ...form, width_cm: Number(e.target.value) })} />
          </div>
          <div style={styles.row}>
            <input style={styles.input} type="number" placeholder="Min length (inches)" value={form.min_length}
              onChange={e => setForm({ ...form, min_length: Number(e.target.value) })} />
            <input style={styles.input} type="number" placeholder="Max length (inches)" value={form.max_length}
              onChange={e => setForm({ ...form, max_length: Number(e.target.value) })} />
          </div>
          <textarea style={styles.textarea} placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} placeholder="Best for (e.g. Medium cycles, daytime)" value={form.best_for}
            onChange={e => setForm({ ...form, best_for: e.target.value })} />
          <div style={styles.row}>
            <input style={styles.input} placeholder="Color label (e.g. amber)" value={form.color_label}
              onChange={e => setForm({ ...form, color_label: e.target.value })} />
            <input style={styles.input} type="number" step="0.5" placeholder="Base price (S$)" value={form.price_base}
              onChange={e => setForm({ ...form, price_base: Number(e.target.value) })} />
          </div>
          {form.id === 'liner' && (
            <>
              <div style={styles.smallNote}>Liner-only fields (extra cost, S$):</div>
              <div style={styles.row}>
                <input style={styles.input} type="number" step="0.5" placeholder="Layer upgrade (S$)" value={form.layer_upgrade}
                  onChange={e => setForm({ ...form, layer_upgrade: Number(e.target.value) })} />
                <input style={styles.input} type="number" step="0.5" placeholder="Backing upgrade (S$)" value={form.backing_upgrade}
                  onChange={e => setForm({ ...form, backing_upgrade: Number(e.target.value) })} />
              </div>
            </>
          )}
          <input style={styles.input} type="number" placeholder="Sort order (optional, lower shows first)" value={form.sort_order}
            onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Catalog</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>SIZES ({sizes.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {sizes.map(s => (
              <div key={s.id} style={styles.entryRow} onClick={() => startEdit(s)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{s.name}</div>
                  <div style={styles.entrySub}>{s.length_inches}" · S${Number(s.price_base).toFixed(2)} · {s.best_for || 'no "best for" set'}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteSize(s.id) }}>✕</button>
              </div>
            ))}
            {sizes.length === 0 && <div style={styles.smallNote}>No sizes saved yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Absorbency tab — the 4 fixed absorbency levels (Standard, Moderate,
// Heavy, Super). No photos — edit in place.
// ─────────────────────────────────────────────
const BLANK_ABSORBENCY = {
  id: '', name: '', core_layers: 1, description: '', icon: '', price_modifier: 0, capacity_ml: 0, sort_order: 0,
}

function AbsorbencyTab({ secret, onAuthError }) {
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadLevels() {
    setLoading(true)
    const res = await fetch(`/api/admin/absorbency?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setLevels(data.absorbency)
    setLoading(false)
  }

  useEffect(() => { loadLevels() }, [])

  function startNew() {
    setForm({ ...BLANK_ABSORBENCY })
  }

  function startEdit(a) {
    setForm({ ...BLANK_ABSORBENCY, ...a })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('ID and name are required'); return }
    const res = await fetch('/api/admin/absorbency', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, absorbency: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadLevels()
  }

  async function deleteLevel(id) {
    if (!confirm(`Remove "${id}" from absorbency levels?`)) return
    await fetch(`/api/admin/absorbency?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadLevels()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Absorbency Level</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{levels.some(a => a.id === form.id) ? 'EDIT' : 'ADD'} ABSORBENCY LEVEL</div>
          <input style={styles.input} placeholder="Display name (e.g. Heavy absorbency)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces, e.g. heavy)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <div style={styles.row}>
            <input style={styles.input} type="number" placeholder="Core layers" value={form.core_layers}
              onChange={e => setForm({ ...form, core_layers: Number(e.target.value) })} />
            <input style={styles.input} type="number" placeholder="Capacity (ml)" value={form.capacity_ml}
              onChange={e => setForm({ ...form, capacity_ml: Number(e.target.value) })} />
          </div>
          <textarea style={styles.textarea} placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <div style={styles.row}>
            <input style={styles.input} placeholder="Icon (e.g. droplets-3)" value={form.icon}
              onChange={e => setForm({ ...form, icon: e.target.value })} />
            <input style={styles.input} type="number" step="0.5" placeholder="Price modifier (S$)" value={form.price_modifier}
              onChange={e => setForm({ ...form, price_modifier: Number(e.target.value) })} />
          </div>
          <input style={styles.input} type="number" placeholder="Sort order (optional, lower shows first)" value={form.sort_order}
            onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Catalog</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>ABSORBENCY LEVELS ({levels.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {levels.map(a => (
              <div key={a.id} style={styles.entryRow} onClick={() => startEdit(a)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{a.name}</div>
                  <div style={styles.entrySub}>{a.core_layers} layer{a.core_layers === 1 ? '' : 's'} · {a.capacity_ml}ml · +S${Number(a.price_modifier).toFixed(2)}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteLevel(a.id) }}>✕</button>
              </div>
            ))}
            {levels.length === 0 && <div style={styles.smallNote}>No absorbency levels saved yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Shapes tab — the 5 fixed shapes (Moon Rise, Sunglow, Staple, Mega Pad,
// Surged/Curvy). Simplest tab — just id, name, description.
// ─────────────────────────────────────────────
const BLANK_SHAPE = { id: '', name: '', description: '', sort_order: 0 }

function ShapesTab({ secret, onAuthError }) {
  const [shapes, setShapes] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadShapes() {
    setLoading(true)
    const res = await fetch(`/api/admin/shapes?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setShapes(data.shapes)
    setLoading(false)
  }

  useEffect(() => { loadShapes() }, [])

  function startNew() {
    setForm({ ...BLANK_SHAPE })
  }

  function startEdit(s) {
    setForm({ ...BLANK_SHAPE, ...s })
  }

  async function saveForm() {
    if (!form.id || !form.name) { alert('ID and name are required'); return }
    const res = await fetch('/api/admin/shapes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, shape: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadShapes()
  }

  async function deleteShape(id) {
    if (!confirm(`Remove "${id}" from shapes?`)) return
    await fetch(`/api/admin/shapes?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadShapes()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Shape</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{shapes.some(s => s.id === form.id) ? 'EDIT' : 'ADD'} SHAPE</div>
          <input style={styles.input} placeholder="Display name (e.g. Moon Rise)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input style={styles.input} placeholder="Catalog ID (unique, no spaces, e.g. moon_rise)" value={form.id}
            onChange={e => setForm({ ...form, id: e.target.value })} />
          <textarea style={styles.textarea} placeholder="Description" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
          <input style={styles.input} type="number" placeholder="Sort order (optional, lower shows first)" value={form.sort_order}
            onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save to Catalog</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>SHAPES ({shapes.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {shapes.map(s => (
              <div key={s.id} style={styles.entryRow} onClick={() => startEdit(s)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{s.name}</div>
                  <div style={styles.entrySub}>{s.description}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteShape(s.id) }}>✕</button>
              </div>
            ))}
            {shapes.length === 0 && <div style={styles.smallNote}>No shapes saved yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Blog tab — blog_posts. Cover photo is optional; browse an R2 folder
// (the "Blog" folder by default) right inside the form to pick one.
// ─────────────────────────────────────────────
const BLANK_POST = { id: '', title: '', content: '', image_url: '', author: '' }

function BlogTab({ secret, onAuthError }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const browser = useR2Browser(secret)

  async function loadPosts() {
    setLoading(true)
    const res = await fetch(`/api/admin/blog?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setPosts(data.posts)
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  function startNew() {
    setForm({ ...BLANK_POST })
    setShowBrowser(false)
  }

  function startEdit(p) {
    setForm({ ...BLANK_POST, ...p })
    setShowBrowser(false)
  }

  async function saveForm() {
    if (!form.title) { alert('Title is required'); return }
    const res = await fetch('/api/admin/blog', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, post: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadPosts()
  }

  async function deletePost(id) {
    if (!confirm(`Delete this post?`)) return
    await fetch(`/api/admin/blog?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadPosts()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ New Post</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{form.id ? 'EDIT' : 'NEW'} BLOG POST</div>
          {form.image_url && <img src={form.image_url} alt="" style={styles.previewImg} />}
          <input style={styles.input} placeholder="Title" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ ...styles.textarea, minHeight: 140 }} placeholder="Post content" value={form.content}
            onChange={e => setForm({ ...form, content: e.target.value })} />
          <input style={styles.input} placeholder="Author (optional)" value={form.author}
            onChange={e => setForm({ ...form, author: e.target.value })} />
          <input style={styles.input} placeholder="Cover image URL (or pick one below)" value={form.image_url}
            onChange={e => setForm({ ...form, image_url: e.target.value })} />
          <button style={styles.btnSecondary} onClick={() => setShowBrowser(v => !v)}>
            {showBrowser ? 'Hide photo browser' : 'Choose cover photo from R2'}
          </button>
          {showBrowser && (
            <FolderBrowser
              browser={browser}
              existingImageUrls={[]}
              onPick={f => { setForm({ ...form, image_url: f.url }); setShowBrowser(false) }}
            />
          )}
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save Post</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>BLOG POSTS ({posts.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {posts.map(p => (
              <div key={p.id} style={styles.entryRow} onClick={() => startEdit(p)}>
                {p.image_url && <img src={p.image_url} alt="" style={styles.entryThumb} />}
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{p.title}</div>
                  <div style={styles.entrySub}>{p.author || 'no author set'}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deletePost(p.id) }}>✕</button>
              </div>
            ))}
            {posts.length === 0 && <div style={styles.smallNote}>No posts yet — add your first one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// FAQ tab — faq table. "source" tells apart WPN's own entries from the
// ECP washing Q&As merged in alongside them; shown as a small tag.
// ─────────────────────────────────────────────
const BLANK_FAQ = { id: '', question: '', answer: '', source: 'wpn', sort_order: 0 }

function FaqTab({ secret, onAuthError }) {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadFaqs() {
    setLoading(true)
    const res = await fetch(`/api/admin/faq?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setFaqs(data.faqs)
    setLoading(false)
  }

  useEffect(() => { loadFaqs() }, [])

  function startNew() {
    setForm({ ...BLANK_FAQ })
  }

  function startEdit(f) {
    setForm({ ...BLANK_FAQ, ...f })
  }

  async function saveForm() {
    if (!form.question || !form.answer) { alert('Question and answer are required'); return }
    const res = await fetch('/api/admin/faq', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, faq: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadFaqs()
  }

  async function deleteFaq(id) {
    if (!confirm(`Remove this FAQ entry?`)) return
    await fetch(`/api/admin/faq?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadFaqs()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add FAQ</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{form.id ? 'EDIT' : 'ADD'} FAQ</div>
          <input style={styles.input} placeholder="Question" value={form.question}
            onChange={e => setForm({ ...form, question: e.target.value })} />
          <textarea style={styles.textarea} placeholder="Answer" value={form.answer}
            onChange={e => setForm({ ...form, answer: e.target.value })} />
          <div style={styles.row}>
            <input style={styles.input} placeholder="Source (e.g. wpn, ecp)" value={form.source}
              onChange={e => setForm({ ...form, source: e.target.value })} />
            <input style={styles.input} type="number" placeholder="Sort order" value={form.sort_order}
              onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          </div>
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save FAQ</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>FAQ ENTRIES ({faqs.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {faqs.map(f => (
              <div key={f.id} style={styles.entryRow} onClick={() => startEdit(f)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{f.question}</div>
                  <div style={styles.entrySub}>{f.source}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteFaq(f.id) }}>✕</button>
              </div>
            ))}
            {faqs.length === 0 && <div style={styles.smallNote}>No FAQ entries yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Reviews tab — reviews table. Covers both cases: paste in a testimonial
// manually, or approve one that came in through a future public
// submission form (verified = 0) by ticking "verified" and saving.
// ─────────────────────────────────────────────
const BLANK_REVIEW = { id: '', customer_name: '', quote: '', verified: 1, sort_order: 0 }

function ReviewsTab({ secret, onAuthError }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadReviews() {
    setLoading(true)
    const res = await fetch(`/api/admin/reviews?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setReviews(data.reviews)
    setLoading(false)
  }

  useEffect(() => { loadReviews() }, [])

  function startNew() {
    setForm({ ...BLANK_REVIEW })
  }

  function startEdit(r) {
    setForm({ ...BLANK_REVIEW, ...r })
  }

  async function saveForm() {
    if (!form.quote) { alert('Quote is required'); return }
    const res = await fetch('/api/admin/reviews', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, review: form }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadReviews()
  }

  async function deleteReview(id) {
    if (!confirm(`Delete this review?`)) return
    await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadReviews()
  }

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Review</button>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{form.id ? 'EDIT' : 'ADD'} REVIEW</div>
          <input style={styles.input} placeholder="Customer name (optional)" value={form.customer_name}
            onChange={e => setForm({ ...form, customer_name: e.target.value })} />
          <textarea style={styles.textarea} placeholder="Review quote" value={form.quote}
            onChange={e => setForm({ ...form, quote: e.target.value })} />
          <input style={styles.input} type="number" placeholder="Sort order" value={form.sort_order}
            onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} />
          <label style={{ ...styles.smallNote, display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={!!form.verified}
              onChange={e => setForm({ ...form, verified: e.target.checked ? 1 : 0 })} />
            Verified (shows on the site — uncheck to hide/hold for review)
          </label>
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save Review</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>REVIEWS ({reviews.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {reviews.map(r => (
              <div key={r.id} style={styles.entryRow} onClick={() => startEdit(r)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{r.customer_name || 'Anonymous'}</div>
                  <div style={styles.entrySub}>{r.quote.slice(0, 60)}{r.quote.length > 60 ? '…' : ''} {r.verified ? '' : '· pending'}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteReview(r.id) }}>✕</button>
              </div>
            ))}
            {reviews.length === 0 && <div style={styles.smallNote}>No reviews yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Feedback tab — feedback table. Read-only survey inbox (no create —
// entries only ever come from the storefront), plus a status dropdown
// for triage.
//
// NOTE: the live D1 schema doesn't have a status column yet. Run this
// once against your database before using this tab:
//   ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT 'new';
// ─────────────────────────────────────────────
const FEEDBACK_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'archived', label: 'Archived' },
]

function FeedbackTab({ secret, onAuthError }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  async function loadFeedback() {
    setLoading(true)
    const res = await fetch(`/api/admin/feedback?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setItems(data.feedback)
    setLoading(false)
  }

  useEffect(() => { loadFeedback() }, [])

  async function setStatus(id, status) {
    setItems(items.map(it => it.id === id ? { ...it, status } : it))
    await fetch('/api/admin/feedback', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, id, status }),
    })
  }

  async function deleteFeedback(id) {
    if (!confirm(`Delete this feedback entry?`)) return
    await fetch(`/api/admin/feedback?id=${encodeURIComponent(id)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadFeedback()
  }

  return (
    <div>
      <div style={styles.card}>
        <div style={styles.label}>FEEDBACK ({items.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {items.map(it => (
              <div key={it.id} style={{ ...styles.entryRow, flexDirection: 'column', alignItems: 'stretch', cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === it.id ? null : it.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={styles.entryInfo}>
                    <div style={styles.entryName}>{it.inquiry_number || 'No inquiry #'} · {it.rating ? `${it.rating}★` : 'no rating'}</div>
                    <div style={styles.entrySub}>{it.would_recommend || ''}</div>
                  </div>
                  <select style={{ ...styles.select, flex: 'none', width: 110, marginBottom: 0 }} value={it.status || 'new'}
                    onClick={e => e.stopPropagation()}
                    onChange={e => setStatus(it.id, e.target.value)}>
                    {FEEDBACK_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteFeedback(it.id) }}>✕</button>
                </div>
                {expanded === it.id && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: c.text, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div><b>Ease of ordering:</b> {it.ease_of_ordering || '—'}</div>
                    <div><b>What could be simpler:</b> {it.what_could_be_simpler || '—'}</div>
                    <div><b>Other comments:</b> {it.other_comments || '—'}</div>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && <div style={styles.smallNote}>No feedback submitted yet.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Settings tab — settings table (key/value). No fixed shape, so this is
// just a plain editable list of rows rather than a form matching a
// specific schema.
// ─────────────────────────────────────────────
const SUGGESTED_SETTINGS_KEYS = ['adminPassword', 'categories', 'shopLogoUrl', 'merchantEmail', 'merchantPhone']

function SettingsTab({ secret, onAuthError }) {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(null)

  async function loadSettings() {
    setLoading(true)
    const res = await fetch(`/api/admin/settings?secret=${encodeURIComponent(secret)}`)
    const data = await res.json()
    if (!res.ok) { onAuthError(data.error || 'Failed to load'); setLoading(false); return }
    setSettings(data.settings)
    setLoading(false)
  }

  useEffect(() => { loadSettings() }, [])

  function startNew() {
    setForm({ key: '', value: '' })
  }

  function startEdit(s) {
    setForm({ ...s })
  }

  async function saveForm() {
    if (!form.key) { alert('Key is required'); return }
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, key: form.key, value: form.value }),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error || 'Save failed'); return }
    setForm(null)
    loadSettings()
  }

  async function deleteSetting(key) {
    if (!confirm(`Remove the "${key}" setting?`)) return
    await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}&secret=${encodeURIComponent(secret)}`, { method: 'DELETE' })
    loadSettings()
  }

  const existingKeys = settings.map(s => s.key)

  return (
    <div>
      <div style={styles.card}>
        <button style={styles.btnPrimary} onClick={startNew}>+ Add Setting</button>
        <div style={styles.smallNote}>Suggested keys: {SUGGESTED_SETTINGS_KEYS.filter(k => !existingKeys.includes(k)).join(', ') || 'all set'}</div>
      </div>

      {form && (
        <div style={styles.card}>
          <div style={styles.label}>{existingKeys.includes(form.key) ? 'EDIT' : 'ADD'} SETTING</div>
          <input style={styles.input} placeholder="Key (e.g. merchantEmail)" value={form.key}
            onChange={e => setForm({ ...form, key: e.target.value })} />
          <textarea style={styles.textarea} placeholder="Value" value={form.value}
            onChange={e => setForm({ ...form, value: e.target.value })} />
          <div style={styles.row}>
            <button style={styles.btnPrimary} onClick={saveForm}>Save Setting</button>
            <button style={styles.btnSecondary} onClick={() => setForm(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>SETTINGS ({settings.length})</div>
        {loading ? <div style={styles.smallNote}>Loading…</div> : (
          <div style={styles.entryList}>
            {settings.map(s => (
              <div key={s.key} style={styles.entryRow} onClick={() => startEdit(s)}>
                <div style={styles.entryInfo}>
                  <div style={styles.entryName}>{s.key}</div>
                  <div style={styles.entrySub}>{(s.value || '').slice(0, 60)}</div>
                </div>
                <button style={styles.deleteBtn} onClick={e => { e.stopPropagation(); deleteSetting(s.key) }}>✕</button>
              </div>
            ))}
            {settings.length === 0 && <div style={styles.smallNote}>No settings saved yet — add one above.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { fontFamily: "'Inter', sans-serif", color: c.text, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: c.bg, padding: '16px' },
  lockCard: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: 24, marginTop: 80, display: 'flex', flexDirection: 'column', gap: 10 },
  lockTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 6 },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  topTitle: { fontWeight: 700, fontSize: 16 },
  tabRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  tab: { flex: '1 1 30%', minWidth: 90, padding: '9px 4px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.white, color: c.muted, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' },
  tabActive: { background: c.rose, color: c.white, border: `1.5px solid ${c.rose}` },
  card: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 14, padding: 14, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: c.muted, marginBottom: 8 },
  row: { display: 'flex', gap: 8 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`, fontSize: 14, marginBottom: 8, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`, fontSize: 14, marginBottom: 8, minHeight: 60, boxSizing: 'border-box', fontFamily: 'inherit' },
  select: { flex: 1, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${c.border}`, fontSize: 14, marginBottom: 8 },
  btnPrimary: { flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: c.rose, color: c.white, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.white, color: c.text, fontWeight: 600, cursor: 'pointer' },
  linkBtn: { border: 'none', background: 'none', color: c.muted, fontSize: 13, cursor: 'pointer', textAlign: 'center' },
  errorText: { color: '#c0392b', fontSize: 13, marginTop: 4 },
  smallNote: { fontSize: 12, color: c.muted, marginTop: 6, marginBottom: 6 },
  thumbGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 },
  thumbCard: { cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `1px solid ${c.border}` },
  thumbImg: { width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' },
  thumbKey: { fontSize: 9, color: c.muted, padding: '3px 5px', background: c.roseLight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  previewImg: { width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 8 },
  entryList: { display: 'flex', flexDirection: 'column', gap: 8 },
  entryRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px', borderRadius: 8, background: c.roseLight, cursor: 'pointer' },
  entryThumb: { width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 },
  swatchDot: { width: 32, height: 32, borderRadius: '50%', flexShrink: 0, border: `1.5px solid ${c.border}` },
  entryInfo: { flex: 1, minWidth: 0 },
  entryName: { fontSize: 13, fontWeight: 600 },
  entrySub: { fontSize: 11, color: c.muted },
  deleteBtn: { border: 'none', background: 'none', color: c.muted, fontSize: 16, cursor: 'pointer', flexShrink: 0 },
}

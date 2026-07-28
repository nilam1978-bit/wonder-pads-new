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
  'Ready-made stock',
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

  const [tab, setTab] = useState('fabrics') // 'fabrics' | 'stock'

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
        <button
          style={{ ...styles.tab, ...(tab === 'fabrics' ? styles.tabActive : {}) }}
          onClick={() => setTab('fabrics')}
        >
          Fabrics
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'stock' ? styles.tabActive : {}) }}
          onClick={() => setTab('stock')}
        >
          Ready-Made Stock
        </button>
        <button
          style={{ ...styles.tab, ...(tab === 'backing' ? styles.tabActive : {}) }}
          onClick={() => setTab('backing')}
        >
          Backing Fabrics
        </button>
      </div>

      {tab === 'fabrics'
        ? <FabricsTab secret={secret} onAuthError={setAuthError} />
        : tab === 'stock'
          ? <StockTab secret={secret} onAuthError={setAuthError} />
          : <BackingTab secret={secret} onAuthError={setAuthError} />}
    </div>
  )
}

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

const styles = {
  container: { fontFamily: "'Inter', sans-serif", color: c.text, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: c.bg, padding: '16px' },
  lockCard: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: 24, marginTop: 80, display: 'flex', flexDirection: 'column', gap: 10 },
  lockTitle: { fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 6 },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  topTitle: { fontWeight: 700, fontSize: 16 },
  tabRow: { display: 'flex', gap: 8, marginBottom: 14 },
  tab: { flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${c.border}`, background: c.white, color: c.muted, fontWeight: 600, cursor: 'pointer' },
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

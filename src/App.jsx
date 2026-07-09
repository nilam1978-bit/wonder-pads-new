import { useState, useEffect } from 'react'
import { PadShape } from './components/PadShapes'
import DesignStudio from './components/DesignStudio'

const WHATSAPP = '6583397556'

const PLACEHOLDER_COLORS = [
  '#f2c4ce', '#c4d9f2', '#c4f2d0', '#f2e4c4',
  '#d9c4f2', '#f2c4e4', '#c4f2f2', '#f2d9c4',
  '#e4f2c4', '#f2c4c4',
]

export default function App() {
  const [config, setConfig] = useState(null)
  const [path, setPath] = useState('home')

  useEffect(() => {
    fetch('/config.json')
      .then(r => r.json())
      .then(setConfig)
  }, [])

  if (!config) return (
    <div style={styles.loading}>
      <div style={styles.loadingDot}>🌸</div>
      <p style={styles.loadingText}>Loading WonderPads...</p>
    </div>
  )

  return (
    <div style={styles.app}>
      {path === 'studio'
        ? <DesignStudio config={config} onBack={() => setPath('home')} />
        : <>
            <Header config={config} onNav={setPath} />
            {path === 'home' && <Landing config={config} onNav={setPath} />}
            {path === 'rts' && <ComingSoon title="Ready Stock" onBack={() => setPath('home')} />}
          </>
      }
    </div>
  )
}

function Header({ config, onNav }) {
  return (
    <header style={styles.header}>
      <div style={styles.headerInner}>
        <div style={styles.logo} onClick={() => onNav('home')}>
          {config.settings.shopLogoUrl
            ? <img src={config.settings.shopLogoUrl} alt="WonderPads" style={styles.logoImg} />
            : <div style={styles.logoFallback}>WP</div>
          }
          <div>
            <div style={styles.logoName}>WonderPads Reusables</div>
            <div style={styles.logoSub}>Singapore · Handmade Cloth Pads</div>
          </div>
        </div>
      </div>
    </header>
  )
}

function Landing({ config, onNav }) {
  const [activeShape, setActiveShape] = useState('moon_rise')
  const shapes = config.shapeOptions || []
  const categories = config.settings.categories || []

  return (
    <main>
      {/* Hero */}
      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Made for your body.<br />By a real maker.</h1>
        <p style={styles.heroSub}>Pick your fabric. Choose your size. Send your order straight to Nilam — no account, no checkout, just a real message to a real maker.</p>
        <div style={styles.heroBtns}>
          <button style={styles.btnPrimary} onClick={() => onNav('studio')}>✂ Design Studio</button>
          <button style={styles.btnSecondary} onClick={() => onNav('rts')}>📦 Ready Stock</button>
        </div>
      </section>

      {/* Trust strip */}
      <section style={styles.trustStrip}>
        {['🌿 Organic options', '✂ Handmade to order', '💬 WhatsApp ordering', '🇸🇬 Ships SG + MY'].map(t => (
          <div key={t} style={styles.trustItem}>{t}</div>
        ))}
      </section>

      {/* First time tip */}
      <section style={styles.section}>
        <div style={styles.tipBox}>
          <span style={styles.tipIcon}>🌸</span>
          <div>
            <div style={styles.tipTitle}>First time using cloth pads?</div>
            <div style={styles.tipText}>Start with a liner or light pad — the easiest introduction to reusable period care.</div>
          </div>
        </div>
      </section>

      {/* Shape preview */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>PAD SHAPES</div>
        <h2 style={styles.sectionTitle}>Choose your silhouette</h2>
        <div style={styles.shapePreviewBox}>
          <PadShape
            shapeId={activeShape}
            lengthInches={10}
            backingColor='#e8c4d0'
            showSnaps={true}
            width={160}
          />
        </div>
        <div style={styles.shapePills}>
          {shapes.map(s => (
            <button
              key={s.id}
              style={{
                ...styles.shapePill,
                ...(activeShape === s.id ? styles.shapePillActive : {})
              }}
              onClick={() => setActiveShape(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      </section>

      {/* Fabric teaser */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>BROWSE FABRICS</div>
        <h2 style={styles.sectionTitle}>195 prints to choose from</h2>
        <div style={styles.fabricGrid}>
          {PLACEHOLDER_COLORS.slice(0, 6).map((color, i) => (
            <div
              key={i}
              style={{ ...styles.fabricCard, background: color }}
              onClick={() => onNav('studio')}
            >
              <div style={styles.fabricLabel}>{categories[i] || 'Fabric'}</div>
            </div>
          ))}
        </div>
        <button style={styles.btnOutline} onClick={() => onNav('studio')}>See all fabrics →</button>
      </section>

      {/* Sizes */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>PAD SIZES</div>
        <h2 style={styles.sectionTitle}>Find your fit</h2>
        <div style={styles.sizeList}>
          {config.sizeOptions.map(s => (
            <div key={s.id} style={styles.sizeCard}>
              <div style={styles.sizeName}>{s.name}</div>
              <div style={styles.sizeLength}>{s.lengthInches}"</div>
              <div style={styles.sizeBest}>{s.bestFor}</div>
              <div style={styles.sizePrice}>from S${s.priceBase.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{...styles.section, background: '#fdf0ed', padding: '2rem 1rem'}}>
        <div style={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 style={styles.sectionTitle}>Simple as 1-2-3</h2>
        <div style={styles.steps}>
          {[
            { n: '1', t: 'Pick your fabric', d: 'Browse 195 prints across 9 categories' },
            { n: '2', t: 'Choose your size', d: 'Liner through Extra Long, fully customisable' },
            { n: '3', t: 'Send to Nilam', d: 'Via WhatsApp or email — she confirms and begins' },
          ].map(s => (
            <div key={s.n} style={styles.step}>
              <div style={styles.stepNum}>{s.n}</div>
              <div style={styles.stepTitle}>{s.t}</div>
              <div style={styles.stepDesc}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerName}>WonderPads Reusables</div>
        <div style={styles.footerSub}>Handcrafted with care · Sustainable personal wellness</div>
        <a href={`https://wa.me/${WHATSAPP}`} style={styles.footerWa}>💬 Chat on WhatsApp</a>
      </footer>
    </main>
  )
}

function ComingSoon({ title, onBack }) {
  return (
    <div style={styles.comingSoon}>
      <button style={styles.backBtn} onClick={onBack}>← Back</button>
      <div style={styles.comingSoonIcon}>🌸</div>
      <h2 style={styles.comingSoonTitle}>{title}</h2>
      <p style={styles.comingSoonText}>This section is being built. Check back soon!</p>
    </div>
  )
}

const c = {
  rose: '#8b3a52',
  roseLight: '#fdf0ed',
  green: '#7a9e80',
  text: '#3a2020',
  muted: '#9a7070',
  border: '#e8d0d0',
  white: '#ffffff',
}

const styles = {
  app: { fontFamily: "'Inter', sans-serif", color: c.text, maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#fdf8f5' },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 },
  loadingDot: { fontSize: 48 },
  loadingText: { color: c.muted, fontSize: 14 },
  header: { background: c.white, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 100 },
  headerInner: { padding: '10px 16px' },
  logo: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  logoImg: { width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' },
  logoFallback: { width: 44, height: 44, borderRadius: '50%', background: c.roseLight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.rose, fontWeight: 600 },
  logoName: { fontSize: 15, fontWeight: 600, color: c.rose, fontFamily: "'Playfair Display', serif" },
  logoSub: { fontSize: 10, color: c.muted, letterSpacing: '0.05em' },
  hero: { background: `linear-gradient(135deg, #fdf0ed 0%, #f5e8f0 100%)`, padding: '2.5rem 1.5rem 2rem', textAlign: 'center' },
  heroTitle: { fontSize: 26, fontWeight: 700, color: c.rose, fontFamily: "'Playfair Display', serif", lineHeight: 1.3, margin: '0 0 12px' },
  heroSub: { fontSize: 13, color: c.muted, lineHeight: 1.7, margin: '0 0 20px', maxWidth: 340, marginLeft: 'auto', marginRight: 'auto' },
  heroBtns: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' },
  btnPrimary: { background: c.green, color: c.white, border: 'none', borderRadius: 20, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { background: c.white, color: c.rose, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnOutline: { background: 'transparent', color: c.rose, border: `1.5px solid ${c.rose}`, borderRadius: 20, padding: '8px 18px', fontSize: 13, cursor: 'pointer', marginTop: 12 },
  trustStrip: { display: 'flex', overflowX: 'auto', gap: 0, background: '#f7ede9', padding: '10px 0' },
  trustItem: { flex: '0 0 auto', fontSize: 11, color: c.muted, padding: '4px 16px', whiteSpace: 'nowrap', borderRight: `1px solid ${c.border}` },
  section: { padding: '1.5rem 1rem' },
  sectionLabel: { fontSize: 10, letterSpacing: '0.12em', color: c.muted, marginBottom: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 600, color: c.rose, fontFamily: "'Playfair Display', serif", margin: '0 0 16px' },
  tipBox: { display: 'flex', gap: 12, background: c.white, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', alignItems: 'flex-start' },
  tipIcon: { fontSize: 22, flexShrink: 0 },
  tipTitle: { fontSize: 13, fontWeight: 600, color: c.rose, marginBottom: 4 },
  tipText: { fontSize: 12, color: c.muted, lineHeight: 1.6 },
  shapePreviewBox: { display: 'flex', justifyContent: 'center', padding: '16px 0', background: c.white, borderRadius: 12, border: `1px solid ${c.border}`, marginBottom: 12 },
  shapePills: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  shapePill: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: c.muted },
  shapePillActive: { background: c.rose, border: `1.5px solid ${c.rose}`, color: c.white },
  fabricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  fabricCard: { borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative', aspectRatio: '1' },
  fabricLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9, padding: '3px 6px', textAlign: 'center' },
  sizeList: { display: 'flex', flexDirection: 'column', gap: 8 },
  sizeCard: { background: c.white, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 },
  sizeName: { fontWeight: 600, fontSize: 13, color: c.rose, width: 70 },
  sizeLength: { fontSize: 12, color: c.muted, width: 30 },
  sizeBest: { fontSize: 12, color: c.muted, flex: 1 },
  sizePrice: { fontSize: 13, fontWeight: 600, color: c.green },
  steps: { display: 'flex', flexDirection: 'column', gap: 16 },
  step: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  stepNum: { width: 32, height: 32, borderRadius: '50%', background: c.green, color: c.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 },
  stepTitle: { fontSize: 14, fontWeight: 600, color: c.rose, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: c.muted, lineHeight: 1.6 },
  footer: { background: c.rose, padding: '2rem 1rem', textAlign: 'center' },
  footerName: { color: c.white, fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif", marginBottom: 4 },
  footerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: '0.05em', marginBottom: 14 },
  footerWa: { display: 'inline-block', background: '#25D366', color: c.white, borderRadius: 20, padding: '8px 18px', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
  comingSoon: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem', textAlign: 'center', gap: 12 },
  backBtn: { alignSelf: 'flex-start', background: 'none', border: 'none', color: c.rose, fontSize: 14, cursor: 'pointer', marginBottom: 20 },
  comingSoonIcon: { fontSize: 48 },
  comingSoonTitle: { fontSize: 22, color: c.rose, fontFamily: "'Playfair Display', serif" },
  comingSoonText: { color: c.muted, fontSize: 14 },
}

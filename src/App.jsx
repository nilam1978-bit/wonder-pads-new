import { useState, useEffect } from 'react'

const WHATSAPP = '6583397556'

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
      <Header config={config} onNav={setPath} />
      {path === 'home' && <Landing config={config} onNav={setPath} />}
      {path === 'studio' && <ComingSoon title="Design Studio" onBack={() => setPath('home')} />}
      {path === 'rts' && <ComingSoon title="Ready Stock" onBack={() => setPath('home')} />}
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
  const categories = config.settings.categories || []
  const fabrics = config.fabricsTop.filter(f => !f.hidden).slice(0, 6)

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

      {/* Fabric teaser */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>BROWSE FABRICS</div>
        <h2 style={styles.sectionTitle}>195 prints to choose from</h2>
        <div style={styles.fabricGrid}>
          {fabrics.map(f => (
            <div key={f.id} style={styles.fabricCard} onClick={() => onNav('studio')}>
              <img src={f.imageUrl} alt={f.name} style={styles.fabricImg} loading="lazy" />
              <div style={styles.fabricLabel}>{f.category}</div>
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
  fabricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 },
  fabricCard: { borderRadius: 10, overflow: 'hidden', cursor: 'pointer', position: 'relative', aspectRatio: '1' },
  fabricImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  fabricLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.35)', color: '#fff', fontSize: 9, padding: '3px 6px', textAlign: 'center' },
  sizeList: { display: 'flex', flexDirection: 'column', gap: 8 },
  sizeCard: { background: c.white, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 },
  sizeName: { fontWeight: 600,

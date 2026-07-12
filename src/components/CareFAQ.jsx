import { useEffect } from 'react'

const WHATSAPP = '6583397556'

const FAQS = [
  {
    q: "My cloth pad got stained and won't come clean — is it ruined?",
    a: "No, and please don't feel bad about it — staining is completely normal, even for people who've used cloth pads for years. The single biggest cause of a stain that won't budge is accidentally letting it go through a hot wash or the dryer before the stain was fully out, since heat sets blood into the fabric. If that's happened to you: soak the pad in cold water with a spoonful of OxiClean or a splash of hydrogen peroxide for 30 minutes to a few hours, then gently rub the stained area with a paste of baking soda and water before rinsing. If you can, finish with a few hours of direct sunlight — it naturally bleaches out what soaking alone can't. Most stains fade significantly over a few more washes, even if they don't disappear completely. A little staining on a well-loved pad is normal — it doesn't mean it's dirty or unsafe to use, as long as it's been properly washed."
  },
  {
    q: "How do I dry my cloth pads properly in Singapore's humidity?",
    a: "This is one of the most common questions we get, and fair enough — our weather doesn't make it easy! The key rule is: never store a pad while it's still damp, even slightly. In humid HDB flats, pads can take much longer to fully dry than guides written for drier climates assume. A few things that help: hang pads somewhere with airflow rather than a closed bathroom (a rack near a window or fan works well), avoid stacking pads together while drying, and if you're relying on aircon-room drying, give it extra time and check that the inner absorbent layers (not just the surface) are fully dry before folding them away — that's usually where dampness hides. If a pad still feels even slightly cool or damp to the touch, it's not ready to store yet."
  },
  {
    q: "Are cloth pads actually hygienic? I've read mixed things.",
    a: "This is a fair question, and we'd rather give you an honest answer than an empty reassurance. Some research has found a higher rate of reported infections among reusable pad users compared to disposable pad users — but importantly, that research couldn't pin the cause on any specific washing or drying habit. Our take, after years of using and making these ourselves: the risk isn't in the pad itself, it's almost always in the washing and drying routine. A pad that's properly rinsed promptly, washed with a normal detergent, and completely dried before its next use is just as hygienic as a disposable one. Where people run into trouble is letting used pads sit unwashed for days, or storing them before they're fully dry (see our humidity tips above!). Change your pad every 4-6 hours during the day just as you would a disposable, and wash promptly — that's really the whole secret."
  },
  {
    q: "I forgot to wash my pads for a few days — are they still okay to use?",
    a: "Don't panic — they're very likely still salvageable. First, give them a longer soak than usual (a few hours, or even overnight) in cold water with a little detergent or a splash of white vinegar to help lift any odour. Wash as normal afterward, and let them dry fully in sunlight if you can — sunlight is great at neutralising smells, not just stains. The one thing to watch for is any lingering musty or sour smell even after a full wash and complete drying — if that happens, an extra soak with a spoonful of OxiClean before the next wash usually clears it. A few forgotten days won't damage the pad or make it unsafe once it's been properly washed and dried again."
  },
  {
    q: "How do I manage cloth pads discreetly at school or work?",
    a: "Totally doable, and you won't need anyone to know. Keep a small wet bag (a zippered, waterproof pouch) in your school or work bag — it's the same size as a makeup pouch and looks completely ordinary. When you need to change, fold the used pad in on itself (fresh side out) and pop it straight into the wet bag — it's leak-proof, so nothing will show or smell through your bag until you're home. No rinsing needed at school or in the office; just deal with it properly once you're home. Most people find that after the first time, it becomes just as routine as changing a disposable."
  },
  {
    q: "My pad has reached the end of its life after years of use — how do I dispose of it responsibly?",
    a: "First — if a pad has lasted you 5-6 years, that's genuinely something to feel good about, not guilty over. When it's finally time to retire one, a little extra care at disposal makes a real difference, because a cloth pad isn't one single material. Here's how to break it down properly: unpick or snip off the metal snaps first — these are proper metal and can go into scrap metal recycling rather than the bin (save up a few from multiple retired pads before making a trip, or drop them in with other small metal recycling). The top layer and absorbent core (cotton, bamboo fleece, or hemp-bamboo fleece) are natural fibres and can go into a home compost bin — just know that our stitching uses polyester thread for durability, so you'll likely find small threads still intact even after the fabric around them has broken down. That's normal; simply pick out any leftover thread when you turn your compost, the same way you'd remove a twist-tie from a compostable produce bag. The backing layer (antipill or softshell fleece) is a polyester-based fabric, so unfortunately it isn't compostable and doesn't have an easy recycling path in Singapore yet — this part goes into general waste. It's honest to say a cloth pad isn't 100% zero-waste at the very end of its life, but by separating out the metal and composting the natural fibres, you're keeping the vast majority of the pad out of landfill — and that's still a meaningful difference after years of use replacing dozens of disposables."
  },
]

export default function CareFAQ({ onBack }) {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": FAQS.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": f.a
        }
      }))
    }
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = 'faq-schema'
    script.text = JSON.stringify(schema)
    document.head.appendChild(script)
    return () => {
      const existing = document.getElementById('faq-schema')
      if (existing) existing.remove()
    }
  }, [])

  return (
    <div style={styles.page}>
      <button style={styles.backBtn} onClick={onBack}>← Back</button>

      <div style={styles.heroBox}>
        <div style={styles.heroIcon}>🌸</div>
        <h1 style={styles.title}>Care & Common Questions</h1>
        <p style={styles.subtitle}>
          Real answers to the questions we get asked most — washing, staining,
          humidity, hygiene, and everyday life with cloth pads in Singapore.
        </p>
      </div>

      <div style={styles.faqList}>
        {FAQS.map((f, i) => (
          <div key={i} style={styles.faqItem}>
            <h2 style={styles.question}>{f.q}</h2>
            <p style={styles.answer}>{f.a}</p>
          </div>
        ))}
      </div>

      <div style={styles.ctaBox}>
        <p style={styles.ctaText}>Still have a question we didn't cover?</p>
        <a
          href={`https://wa.me/${WHATSAPP}`}
          style={styles.ctaBtn}
        >
          💬 Ask us on WhatsApp
        </a>
      </div>
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
  page: { padding: '1rem', maxWidth: 480, margin: '0 auto' },
  backBtn: { background: 'none', border: 'none', color: c.rose, fontSize: 14, cursor: 'pointer', marginBottom: 16, padding: 0 },
  heroBox: { textAlign: 'center', padding: '0.5rem 0.5rem 1.5rem' },
  heroIcon: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: 700, color: c.rose, fontFamily: "'Playfair Display', serif", margin: '0 0 10px' },
  subtitle: { fontSize: 13, color: c.muted, lineHeight: 1.7, margin: 0 },
  faqList: { display: 'flex', flexDirection: 'column', gap: 14 },
  faqItem: { background: c.white, border: `1px solid ${c.border}`, borderRadius: 12, padding: '16px 18px' },
  question: { fontSize: 15, fontWeight: 600, color: c.rose, fontFamily: "'Playfair Display', serif", margin: '0 0 10px', lineHeight: 1.4 },
  answer: { fontSize: 13, color: c.text, lineHeight: 1.75, margin: 0 },
  ctaBox: { textAlign: 'center', marginTop: 28, padding: '1.5rem 1rem', background: c.roseLight, borderRadius: 12 },
  ctaText: { fontSize: 13, color: c.muted, marginBottom: 12 },
  ctaBtn: { display: 'inline-block', background: '#25D366', color: c.white, borderRadius: 20, padding: '10px 22px', fontSize: 13, fontWeight: 600, textDecoration: 'none' },
}

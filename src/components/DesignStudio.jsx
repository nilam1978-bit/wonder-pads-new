import { useState } from 'react'
import { PadShape } from './PadShapes'

const STUDIO_CONFIG = {
  sizes: [
    {
      id: 'liner',
      name: 'Liner',
      emoji: '🌿',
      description: 'Daily freshness, spotting, very light days, or backup for cups and tampons.',
      tip: 'A simple place to begin if you\'re new to reusable pads.',
      priceBase: 5.50,
      minLength: 6,
      maxLength: 9,
      backing: null,
      backingNote: null,
      backingOptions: [
        { id: 'organic', name: 'Organic Cotton', extra: 0, note: null },
        { id: 'printed', name: 'Printed Cotton', extra: 0, note: 'Same print will be used for front and back.' },
        { id: 'antipill', name: 'Antipill Fleece', extra: 1.00, note: null },
      ],
      extraLayerPrice: 0.50,
      maxExtraLayers: 2,
      shapes: ['moon_rise', 'staple', 'sunglow'],
    },
    {
      id: 'light',
      name: 'Light',
      emoji: '🌸',
      description: 'Light flow days, the beginning or end of your period, or everyday backup.',
      tip: 'Comfortable, slim, and easy to wash. Perfect for lighter days.',
      priceBase: 8.00,
      minLength: 8,
      maxLength: 12,
      backing: 'White Softshell Fleece',
      backingNote: 'Backed in white soft shell fleece.',
      backingOptions: null,
      extraLayerPrice: 1.00,
      maxExtraLayers: 1,
      shapes: ['moon_rise', 'staple', 'sunglow'],
    },
    {
      id: 'moderate',
      name: 'Moderate',
      emoji: '🌺',
      description: 'Regular flow days when you need dependable everyday protection.',
      tip: 'A balanced choice for most period days.',
      priceBase: 11.00,
      minLength: 10,
      maxLength: 14,
      backing: 'Black Softshell Fleece',
      backingNote: 'Backed in black soft shell fleece.',
      backingOptions: null,
      extraLayerPrice: 1.50,
      maxExtraLayers: 1,
      shapes: ['moon_rise', 'staple', 'sunglow'],
    },
    {
      id: 'heavy',
      name: 'Heavy',
      emoji: '🌹',
      description: 'Heavy flow days, longer wear, or extra confidence when you need it most.',
      tip: 'Designed with added absorbency while remaining soft and breathable.',
      priceBase: 14.00,
      minLength: 12,
      maxLength: 14,
      backing: 'Black Softshell Fleece',
      backingNote: 'Backed in black soft shell fleece.',
      backingOptions: null,
      extraLayerPrice: 2.00,
      maxExtraLayers: 1,
      shapes: ['moon_rise', 'staple', 'sunglow'],
    },
    {
      id: 'extra_long',
      name: 'Extra Long',
      emoji: '🌻',
      description: 'Overnight use, postpartum recovery, or anyone who prefers extra coverage.',
      tip: 'Maximum coverage and confidence for your heaviest moments.',
      priceBase: 15.00,
      minLength: 15,
      maxLength: 20,
      backing: 'Black Softshell Fleece',
      backingNote: 'Backed in black soft shell fleece.',
      backingOptions: null,
      extraLayerPrice: 0,
      maxExtraLayers: 0,
      shapes: ['mega_pad'],
    },
  ],

  placeholderColors: [
    '#f2c4ce', '#c4d9f2', '#c4f2d0', '#f2e4c4',
    '#d9c4f2', '#f2c4e4', '#c4f2f2', '#f2d9c4',
    '#e4f2c4', '#f2c4c4', '#c4ccf2', '#f2f2c4',
  ],

  categories: [
    'All', 'Flowers', 'Kimmi', 'Characters',
    'Abstract', 'Halloween', 'Animal', 'Solid', 'Batik',
  ],
}

const SHAPE_NAMES = {
  moon_rise: 'Moon Rise',
  staple: 'Staple',
  sunglow: 'Sunglow',
  mega_pad: 'Mega Pad',
}

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

export default function DesignStudio({ config, onBack }) {
  const [step, setStep] = useState('size')
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedFabric, setSelectedFabric] = useState(null)
  const [selectedShape, setSelectedShape] = useState(null)
  const [selectedLength, setSelectedLength] = useState(null)
  const [selectedBacking, setSelectedBacking] = useState('organic')
  const [extraLayers, setExtraLayers] = useState(0)
  const [qty, setQty] = useState(1)
  const [activeCategory, setActiveCategory] = useState('All')
  const [basket, setBasket] = useState([])

  const sizeConfig = STUDIO_CONFIG.sizes.find(s => s.id === selectedSize)

  const totalPrice = sizeConfig
    ? sizeConfig.priceBase
      + (extraLayers * sizeConfig.extraLayerPrice)
      + (selectedBacking === 'antipill' ? 1.00 : 0)
    : 0

  function handleSizeSelect(sizeId) {
    const size = STUDIO_CONFIG.sizes.find(s => s.id === sizeId)
    setSelectedSize(sizeId)
    setSelectedLength(size.minLength)
    setSelectedShape(size.shapes[0])
    setSelectedBacking('organic')
    setExtraLayers(0)
    setQty(1)
    setStep('fabric')
  }

  function handleFabricSelect(fabric) {
    setSelectedFabric(fabric)
    setStep('configure')
  }

  function handleAddToBasket() {
    const size = STUDIO_CONFIG.sizes.find(s => s.id === selectedSize)
    const newItems = Array.from({ length: qty }, (_, i) => ({
      id: Date.now() + i,
      sizeName: size.name,
      length: selectedLength,
      shape: SHAPE_NAMES[selectedShape],
      fabric: selectedFabric,
      extraLayers,
      backing: selectedBacking,
      price: totalPrice,
    }))
    setBasket([...basket, ...newItems])
    setStep('size')
    setSelectedSize(null)
    setSelectedFabric(null)
    setSelectedShape(null)
    setSelectedLength(null)
    setExtraLayers(0)
    setQty(1)
  }

  const fabrics = config.fabricsTop
    .filter(f => !f.hidden)
    .filter(f => activeCategory === 'All' || f.category === activeCategory)

  return (
    <div style={styles.container}>
      {/* Back button */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>← Back</button>
        <div style={styles.topTitle}>Design Studio</div>
        {basket.length > 0 && (
          <button style={styles.basketBtn} onClick={() => setStep('checkout')}>
            🛒 {basket.length}
          </button>
        )}
      </div>

      {/* Step indicator */}
      <div style={styles.stepBar}>
        {['size', 'fabric', 'configure', 'checkout'].map((s, i) => (
          <div key={s} style={styles.stepItem}>
            <div style={{
              ...styles.stepDot,
              background: step === s ? c.rose : basket.length > 0 && i < ['size','fabric','configure','checkout'].indexOf(step) ? c.green : '#e8d0d0',
              color: step === s || (basket.length > 0 && i < ['size','fabric','configure','checkout'].indexOf(step)) ? c.white : c.muted,
            }}>
              {i + 1}
            </div>
            <div style={{...styles.stepLabel, color: step === s ? c.rose : c.muted}}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: SIZE */}
      {step === 'size' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>Choose your pad size</div>
          <div style={styles.stepSub}>Not sure? Start with Light or Liner.</div>
          {STUDIO_CONFIG.sizes.map(size => (
            <div
              key={size.id}
              style={styles.sizeCard}
              onClick={() => handleSizeSelect(size.id)}
            >
              <div style={styles.sizeCardTop}>
                <div style={styles.sizeCardName}>{size.emoji} {size.name}</div>
                <div style={styles.sizeCardPrice}>from S${size.priceBase.toFixed(2)}</div>
              </div>
              <div style={styles.sizeCardRange}>{size.minLength}"–{size.maxLength}" · {size.shapes.length} shape{size.shapes.length > 1 ? 's' : ''}</div>
              <div style={styles.sizeCardDesc}>{size.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 2: FABRIC */}
      {step === 'fabric' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>Pick your fabric</div>
          <div style={styles.stepSub}>Tap a print to select it.</div>

          {/* Category tabs */}
          <div style={styles.catScroll}>
            {STUDIO_CONFIG.categories.map(cat => (
              <button
                key={cat}
                style={{
                  ...styles.catTab,
                  ...(activeCategory === cat ? styles.catTabActive : {})
                }}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={styles.fabricCount}>
            Showing {fabrics.length} prints
          </div>

          {/* Fabric grid — placeholders for now */}
          <div style={styles.fabricGrid}>
            {fabrics.slice(0, 24).map((f, i) => (
              <div
                key={f.id}
                style={{
                  ...styles.fabricCard,
                  background: STUDIO_CONFIG.placeholderColors[i % STUDIO_CONFIG.placeholderColors.length],
                  outline: selectedFabric?.id === f.id ? `3px solid ${c.rose}` : 'none',
                }}
                onClick={() => handleFabricSelect(f)}
              >
                <div style={styles.fabricNum}>{f.id}</div>
              </div>
            ))}
          </div>

          <button
            style={{...styles.btnPrimary, opacity: selectedFabric ? 1 : 0.4, marginTop: 16}}
            onClick={() => selectedFabric && setStep('configure')}
          >
            Continue with Print {selectedFabric?.id || '—'} →
          </button>
        </div>
      )}

      {/* STEP 3: CONFIGURE */}
      {step === 'configure' && sizeConfig && (
        <div style={styles.stepContent}>
          <div style={styles.configCard}>

            {/* Header: name + unit price */}
            <div style={styles.configCardHeader}>
              <div style={styles.configCardName}>
                {sizeConfig.name} <span style={styles.configCardRange}>({sizeConfig.minLength}"–{sizeConfig.maxLength}")</span>
              </div>
              <div style={styles.configCardPriceWrap}>
                <div style={styles.configCardPriceLabel}>UNIT PRICE</div>
                <div style={styles.configCardPrice}>S${totalPrice.toFixed(2)}</div>
              </div>
            </div>
            <div style={styles.configCardFor}>For: {sizeConfig.description}</div>

            {/* Length pills */}
            <div style={styles.configSection}>
              <div style={styles.configLabel}>LENGTH</div>
              <div style={styles.shapePills}>
                {Array.from(
                  { length: sizeConfig.maxLength - sizeConfig.minLength + 1 },
                  (_, i) => sizeConfig.minLength + i
                ).map(len => (
                  <button
                    key={len}
                    style={{
                      ...styles.shapePill,
                      ...(selectedLength === len ? styles.shapePillActive : {})
                    }}
                    onClick={() => setSelectedLength(len)}
                  >
                    {len}"
                  </button>
                ))}
              </div>
            </div>

            {/* Shape pills */}
            <div style={styles.configSection}>
              <div style={styles.configLabel}>SHAPE</div>
              <div style={styles.shapePills}>
                {sizeConfig.shapes.map(shapeId => (
                  <button
                    key={shapeId}
                    style={{
                      ...styles.shapePill,
                      ...(selectedShape === shapeId ? styles.shapePillActive : {})
                    }}
                    onClick={() => setSelectedShape(shapeId)}
                  >
                    {SHAPE_NAMES[shapeId]}
                  </button>
                ))}
              </div>
            </div>

            {/* Extra layers + Backing dropdowns, side by side */}
            <div style={styles.dropdownRow}>
              <div style={styles.dropdownCol}>
                <div style={styles.configLabel}>EXTRA LAYERS</div>
                {sizeConfig.maxExtraLayers > 0 ? (
                  <select
                    style={styles.select}
                    value={extraLayers}
                    onChange={e => setExtraLayers(Number(e.target.value))}
                  >
                    <option value={0}>Standard core</option>
                    {Array.from({ length: sizeConfig.maxExtraLayers }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>
                        +{n} layer{n > 1 ? 's' : ''} (+S${(n * sizeConfig.extraLayerPrice).toFixed(2)})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select style={styles.select} disabled>
                    <option>Standard core</option>
                  </select>
                )}
              </div>

              <div style={styles.dropdownCol}>
                <div style={styles.configLabel}>BACKING</div>
                {sizeConfig.backingOptions ? (
                  <select
                    style={styles.select}
                    value={selectedBacking}
                    onChange={e => setSelectedBacking(e.target.value)}
                  >
                    {sizeConfig.backingOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}{opt.extra > 0 ? ` (+S$${opt.extra.toFixed(2)})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select style={styles.select} disabled>
                    <option>{sizeConfig.backing}</option>
                  </select>
                )}
              </div>
            </div>

            {/* Backing note, if the selected option has one */}
            {sizeConfig.backingOptions && (() => {
              const opt = sizeConfig.backingOptions.find(o => o.id === selectedBacking)
              return opt?.note ? <div style={styles.optionNote}>📌 {opt.note}</div> : null
            })()}

            {/* Qty + Add to basket */}
            <div style={styles.qtyAddRow}>
              <div style={styles.qtyStepper}>
                <button
                  style={styles.layerBtn}
                  onClick={() => setQty(Math.max(1, qty - 1))}
                >−</button>
                <span style={styles.layerCount}>{qty}</span>
                <button
                  style={styles.layerBtn}
                  onClick={() => setQty(qty + 1)}
                >+</button>
              </div>
              <button
                style={{...styles.btnPrimary, width: 'auto', flex: 1, marginBottom: 0}}
                onClick={handleAddToBasket}
              >
                🛒 Add to Basket
              </button>
            </div>

          </div>

          <button style={styles.btnOutline} onClick={() => setStep('fabric')}>
            ← Change fabric
          </button>
        </div>
      )}

      {/* STEP 4: CHECKOUT */}
      {step === 'checkout' && (
        <Checkout basket={basket} setBasket={setBasket} onBack={() => setStep('size')} />
      )}

      {/* Floating preview */}
      {selectedShape && selectedSize && step !== 'checkout' && (
        <div style={styles.floatingPreview}>
          <PadShape
            shapeId={selectedShape}
            lengthInches={selectedLength || sizeConfig?.minLength}
            backingColor='#e8c4d0'
            showSnaps={true}
            width={60}
          />
          <div style={styles.floatingInfo}>
            <div style={styles.floatingSize}>{sizeConfig?.name} {selectedLength}"</div>
            <div style={styles.floatingPrice}>S${totalPrice.toFixed(2)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function Checkout({ basket, setBasket, onBack }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  const total = basket.reduce((sum, item) => sum + item.price, 0)

  function buildWhatsAppMessage() {
    const orderRef = 'WP-' + Math.random().toString(36).substr(2, 6).toUpperCase()
    let msg = `🌸 *NEW WONDER PADS ORDER*\n`
    msg += `Order Ref: ${orderRef}\n\n`
    msg += `*Customer:*\n`
    msg += `• Name: ${name}\n`
    msg += `• Phone: ${phone}\n`
    if (email) msg += `• Email: ${email}\n`
    msg += `\n*Order:*\n`
    basket.forEach((item, i) => {
      msg += `${i + 1}. ${item.sizeName} (${item.length}") • ${item.shape} • Print ${item.fabric?.id || '—'}`
      if (item.extraLayers > 0) msg += ` • +${item.extraLayers} layer${item.extraLayers > 1 ? 's' : ''}`
      msg += ` → S$${item.price.toFixed(2)}\n`
    })
    msg += `\n*Total: S$${total.toFixed(2)}*`
    if (notes) msg += `\n\n*Notes:* ${notes}`
    msg += `\n\nThank you for your order! I'll confirm availability and send payment details before I begin stitching. 🌸`
    return encodeURIComponent(msg)
  }

  return (
    <div style={styles.stepContent}>
      <div style={styles.stepHeading}>Your order</div>

      {/* Order summary */}
      <div style={styles.orderSummary}>
        {basket.map((item, i) => (
          <div key={item.id} style={styles.orderItem}>
            <div style={styles.orderItemLeft}>
              <div style={styles.orderItemName}>{item.sizeName} ({item.length}")</div>
              <div style={styles.orderItemDetail}>
                {item.shape} · Print {item.fabric?.id || '—'}
                {item.extraLayers > 0 && ` · +${item.extraLayers} extra layer${item.extraLayers > 1 ? 's' : ''}`}
              </div>
            </div>
            <div style={styles.orderItemRight}>
              <div style={styles.orderItemPrice}>S${item.price.toFixed(2)}</div>
              <button
                style={styles.removeBtn}
                onClick={() => setBasket(basket.filter((_, idx) => idx !== i))}
              >✕</button>
            </div>
          </div>
        ))}
        <div style={styles.orderTotal}>
          <span>Estimated total</span>
          <span style={styles.orderTotalAmount}>S${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Form */}
      <div style={styles.formSection}>
        <div style={styles.formLabel}>LET'S GET YOUR ORDER READY 🌸</div>

        <div style={styles.formRow}>
          <div style={styles.formGroup}>
            <div style={styles.inputLabel}>YOUR NAME *</div>
            <input
              style={styles.input}
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div style={styles.formGroup}>
            <div style={styles.inputLabel}>PHONE *</div>
            <input
              style={styles.input}
              placeholder="+65 9123 456"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.inputLabel}>EMAIL ADDRESS</div>
        <input
          style={{...styles.input, width: '100%', boxSizing: 'border-box', marginBottom: 12}}
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <div style={styles.inputLabel}>NOTES (custom length, special requests)</div>
        <textarea
          style={styles.textarea}
          placeholder="E.g. Please make at 13 inches, or matching backing..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      
        <a 
          href={`https://wa.me/6583397556?text=${buildWhatsAppMessage()}`}
          style={{
          ...styles.btnWhatsApp,
          opacity: name && phone ? 1 : 0.4,
          pointerEvents: name && phone ? 'auto' : 'none',
        }}
      >
        💬 Send my order via WhatsApp
      </a>

      <button style={styles.btnOutline} onClick={onBack}>
        ← Add more pads
      </button>

      <div style={styles.checkoutNote}>
        I'll carefully review your order and get back to you with payment details and confirmation before I begin stitching. 🌸
      </div>
    </div>
  )
}

const styles = {
  container: { fontFamily: "'Inter', sans-serif", color: c.text, minHeight: '100vh', background: c.bg, paddingBottom: 100 },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: c.white, borderBottom: `1px solid ${c.border}`, position: 'sticky', top: 0, zIndex: 100 },
  backBtn: { background: 'none', border: 'none', color: c.rose, fontSize: 14, cursor: 'pointer' },
  topTitle: { fontSize: 15, fontWeight: 600, color: c.rose, fontFamily: "'Playfair Display', serif" },
  basketBtn: { background: c.green, color: c.white, border: 'none', borderRadius: 16, padding: '4px 12px', fontSize: 13, cursor: 'pointer' },
  stepBar: { display: 'flex', justifyContent: 'space-around', padding: '12px 16px', background: c.white, borderBottom: `1px solid ${c.border}` },
  stepItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  stepDot: { width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 },
  stepLabel: { fontSize: 9, letterSpacing: '0.05em' },
  stepContent: { padding: '1.5rem 1rem' },
  stepHeading: { fontSize: 20, fontWeight: 600, color: c.rose, fontFamily: "'Playfair Display', serif", marginBottom: 4 },
  stepSub: { fontSize: 12, color: c.muted, marginBottom: 16 },
  sizeCard: { background: c.white, border: `1px solid ${c.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10, cursor: 'pointer' },
  sizeCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sizeCardName: { fontSize: 15, fontWeight: 600, color: c.rose },
  sizeCardPrice: { fontSize: 13, fontWeight: 600, color: c.green },
  sizeCardRange: { fontSize: 11, color: c.muted, marginBottom: 4 },
  sizeCardDesc: { fontSize: 12, color: c.muted, lineHeight: 1.5 },
  catScroll: { display: 'flex', overflowX: 'auto', gap: 6, marginBottom: 12, paddingBottom: 4 },
  catTab: { flex: '0 0 auto', background: c.white, border: `1px solid ${c.border}`, borderRadius: 16, padding: '5px 12px', fontSize: 11, cursor: 'pointer', color: c.muted, whiteSpace: 'nowrap' },
  catTabActive: { background: c.rose, border: `1px solid ${c.rose}`, color: c.white },
  fabricCount: { fontSize: 11, color: c.muted, marginBottom: 8 },
  fabricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6, marginBottom: 8 },
  fabricCard: { borderRadius: 8, aspectRatio: '1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fabricNum: { fontSize: 9, color: 'rgba(0,0,0,0.4)', fontWeight: 600 },
  tipBox: { display: 'flex', gap: 8, background: '#fffef0', border: `1px solid #e8e0b0`, borderRadius: 8, padding: '10px 12px', marginBottom: 10, alignItems: 'flex-start' },
  tipText: { fontSize: 12, color: '#6a6020', lineHeight: 1.5 },
  noteBox: { display: 'flex', gap: 8, background: c.roseLight, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 10, alignItems: 'flex-start' },
  noteText: { fontSize: 12, color: c.rose, lineHeight: 1.5 },
  configSection: { marginBottom: 20 },
  configLabel: { fontSize: 10, letterSpacing: '0.12em', color: c.muted, marginBottom: 8, fontWeight: 600 },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 10 },
  sliderVal: { fontSize: 12, color: c.muted, width: 28, textAlign: 'center' },
  slider: { flex: 1, accentColor: c.rose },
  sliderCurrent: { fontSize: 13, color: c.rose, fontWeight: 600, marginTop: 6, textAlign: 'center' },
  shapePills: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  shapePill: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: c.muted },
  shapePillActive: { background: c.rose, border: `1.5px solid ${c.rose}`, color: c.white },
  optionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' },
  optionRowActive: { border: `1.5px solid ${c.rose}`, background: c.roseLight },
  optionName: { fontSize: 13, color: c.text },
  optionPrice: { fontSize: 12, color: c.green, fontWeight: 600 },
  optionNote: { fontSize: 11, color: c.rose, background: c.roseLight, borderRadius: 6, padding: '6px 10px', marginBottom: 6, marginTop: -2 },
  layerRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 },
  layerBtn: { width: 32, height: 32, borderRadius: '50%', border: `1.5px solid ${c.border}`, background: c.white, fontSize: 18, cursor: 'pointer', color: c.rose, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  layerCount: { fontSize: 18, fontWeight: 700, color: c.rose, width: 24, textAlign: 'center' },
  layerNote: { fontSize: 12, color: c.green, fontWeight: 600 },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: c.white, border: `1px solid ${c.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 12 },
  priceLabel: { fontSize: 11, color: c.muted, letterSpacing: '0.08em' },
  priceAmount: { fontSize: 22, fontWeight: 700, color: c.rose },
  btnPrimary: { display: 'block', width: '100%', background: c.green, color: c.white, border: 'none', borderRadius: 20, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, textAlign: 'center' },
  configCard: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '16px', marginBottom: 14 },
  configCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  configCardName: { fontSize: 17, fontWeight: 700, color: c.rose, fontFamily: "'Playfair Display', serif" },
  configCardRange: { fontSize: 12, fontWeight: 400, color: c.muted },
  configCardPriceWrap: { textAlign: 'right' },
  configCardPriceLabel: { fontSize: 9, color: c.muted, letterSpacing: '0.08em' },
  configCardPrice: { fontSize: 16, fontWeight: 700, color: c.green },
  configCardFor: { fontSize: 12, color: c.muted, lineHeight: 1.5, marginBottom: 16, fontStyle: 'italic' },
  dropdownRow: { display: 'flex', gap: 10, marginBottom: 14 },
  dropdownCol: { flex: 1 },
  select: { width: '100%', border: `1.5px solid ${c.border}`, borderRadius: 8, padding: '9px 10px', fontSize: 12, color: c.text, background: c.white, boxSizing: 'border-box' },
  qtyAddRow: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 },
  qtyStepper: { display: 'flex', alignItems: 'center', gap: 8, background: c.roseLight, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '4px 8px' },
  btnOutline: { display: 'block', width: '100%', background: 'transparent', color: c.rose, border: `1.5px solid ${c.rose}`, borderRadius: 20, padding: '10px', fontSize: 13, cursor: 'pointer', marginBottom: 10, textAlign: 'center' },
  btnWhatsApp: { display: 'block', width: '100%', background: '#25D366', color: c.white, border: 'none', borderRadius: 20, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' },
  floatingPreview: { position: 'fixed', bottom: 24, right: 16, background: c.white, border: `1px solid ${c.border}`, borderRadius: 16, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.12)', zIndex: 200 },
  floatingInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
  floatingSize: { fontSize: 11, color: c.muted },
  floatingPrice: { fontSize: 14, fontWeight: 700, color: c.rose },
  orderSummary: { background: c.white, border: `1px solid ${c.border}`, borderRadius: 12, padding: '12px', marginBottom: 16 },
  orderItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${c.border}` },
  orderItemLeft: { flex: 1 },
  orderItemName: { fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 2 },
  orderItemDetail: { fontSize: 11, color: c.muted },
  orderItemRight: { display: 'flex', alignItems: 'center', gap: 8 },
  orderItemPrice: { fontSize: 13, fontWeight: 600, color: c.rose },
  removeBtn: { background: 'none', border: 'none', color: c.muted, cursor: 'pointer', fontSize: 12 },
  orderTotal: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  orderTotalAmount: { fontSize: 18, fontWeight: 700, color: c.rose },
  formSection: { marginBottom: 16 },
  formLabel: { fontSize: 11, color: c.muted, letterSpacing: '0.08em', marginBottom: 12 },
  formRow: { display: 'flex', gap: 10, marginBottom: 12 },
  formGroup: { flex: 1 },
  inputLabel: { fontSize: 10, color: c.muted, letterSpacing: '0.08em', marginBottom: 4 },
  input: { width: '100%', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: c.text, background: c.white, boxSizing: 'border-box' },
  textarea: { width: '100%', border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: c.text, background: c.white, boxSizing: 'border-box', minHeight: 80, resize: 'vertical', marginBottom: 12 },
  checkoutNote: { fontSize: 12, color: c.muted, textAlign: 'center', lineHeight: 1.6, marginTop: 8 },
}

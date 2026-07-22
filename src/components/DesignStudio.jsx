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
      shapes: ['moon_rise', 'staple', 'sunglow', 'surged_curvy'],
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
      shapes: ['moon_rise', 'staple', 'sunglow', 'surged_curvy'],
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
      shapes: ['moon_rise', 'staple', 'sunglow', 'surged_curvy'],
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
      shapes: ['moon_rise', 'staple', 'sunglow', 'surged_curvy'],
    },
    {
      id: 'extra_long',
      name: 'Extra Long',
      emoji: '🌻',
      description: 'Overnight use, postpartum recovery, or anyone who prefers extra coverage.',
      tip: 'Maximum coverage and confidence for your heaviest moments.',
      priceBase: 15.00,
      pricePerInch: true,
      pricePerInchRate: 1.00,
      minLength: 15,
      maxLength: 20,
      backing: 'Black Softshell Fleece',
      backingNote: 'Backed in black soft shell fleece.',
      backingOptions: null,
      extraLayerPrice: 0,
      maxExtraLayers: 0,
      shapes: ['mega_pad', 'sunglow', 'moon_rise', 'staple', 'surged_curvy'],
      shapeMaxLength: { moon_rise: 18, staple: 18, surged_curvy: 18 },
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
  surged_curvy: 'Surged/Curvy',
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
  // step now walks through one of two paths, sharing the same
  // 'configure' + 'checkout' steps at the end:
  //   Path A "fabric": entry -> fabric1 (pick ONE print) -> fabric2 (tick sizes) -> configure -> checkout
  //   Path B "need":   entry -> need1   (pick ONE size)  -> need2   (tick prints) -> configure -> checkout
  const [step, setStep] = useState('entry')
  const [entryPath, setEntryPath] = useState(null) // 'fabric' | 'need' | null

  // Path A selections
  const [chosenFabric, setChosenFabric] = useState(null)     // single print, fabric1
  const [chosenSizeIds, setChosenSizeIds] = useState([])     // ticked sizes, fabric2

  // Path B selections
  const [chosenNeedSizeId, setChosenNeedSizeId] = useState(null) // single size, need1
  const [chosenFabrics, setChosenFabrics] = useState([])         // ticked prints, need2

  // The queue of pads left to configure, built once both path steps are done.
  // Each entry is { sizeId, fabric } — same shape regardless of which path built it,
  // so the shared Configure step doesn't need to know which path is active.
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)

  // Per-item configure state — reset every time we land on a new queue entry
  const [selectedShape, setSelectedShape] = useState(null)
  const [selectedLength, setSelectedLength] = useState(null)
  const [selectedBacking, setSelectedBacking] = useState('organic')
  const [extraLayers, setExtraLayers] = useState(0)
  const [qty, setQty] = useState(1)

  const [activeCategory, setActiveCategory] = useState('All')
  const [basket, setBasket] = useState([])
  const [cartOpen, setCartOpen] = useState(false)

  const currentQueueItem = queue[queueIndex] || null
  const sizeConfig = currentQueueItem ? STUDIO_CONFIG.sizes.find(s => s.id === currentQueueItem.sizeId) : null
  const currentFabric = currentQueueItem?.fabric || null

  const totalPrice = sizeConfig
    ? (sizeConfig.pricePerInch
        ? (selectedLength || sizeConfig.minLength) * sizeConfig.pricePerInchRate
        : sizeConfig.priceBase)
      + (extraLayers * sizeConfig.extraLayerPrice)
      + (selectedBacking === 'antipill' ? 1.00 : 0)
    : 0

  // Moves onto queue[index] and resets the per-item configure fields to that
  // size's defaults — same defaulting logic as the old handleSizeSelect,
  // including the backing fix: sizes with real choices (Liner) default to
  // their first option, every other size uses its one fixed backing.
  function goToQueueItem(index, overrideQueue) {
    const q = overrideQueue || queue
    const item = q[index]
    const size = STUDIO_CONFIG.sizes.find(s => s.id === item.sizeId)
    setQueueIndex(index)
    setSelectedLength(size.minLength)
    setSelectedShape(size.shapes[0])
    setSelectedBacking(size.backingOptions ? size.backingOptions[0].id : size.backing)
    setExtraLayers(0)
    setQty(1)
  }

  function startQueue(items) {
    setQueue(items)
    goToQueueItem(0, items)
    setStep('configure')
  }

  function handleLengthSelect(len) {
    setSelectedLength(len)
    const cap = sizeConfig?.shapeMaxLength?.[selectedShape]
    if (cap && len > cap) {
      const stillValid = sizeConfig.shapes.find(s => {
        const shapeCap = sizeConfig.shapeMaxLength?.[s]
        return !shapeCap || len <= shapeCap
      })
      if (stillValid) setSelectedShape(stillValid)
    }
  }

  function handleAddToBasket() {
    const newItems = Array.from({ length: qty }, (_, i) => ({
      id: Date.now() + i,
      sizeName: sizeConfig.name,
      length: selectedLength,
      shape: SHAPE_NAMES[selectedShape],
      fabric: currentFabric,
      extraLayers,
      backing: selectedBacking,
      price: totalPrice,
    }))
    setBasket(prev => [...prev, ...newItems])

    if (queueIndex + 1 < queue.length) {
      // more queued pads to configure — auto-advance to the next one
      goToQueueItem(queueIndex + 1)
    } else {
      // queue finished — clear everything and return to the entry choice
      setQueue([])
      setQueueIndex(0)
      setEntryPath(null)
      setChosenFabric(null)
      setChosenSizeIds([])
      setChosenNeedSizeId(null)
      setChosenFabrics([])
      setStep('entry')
    }
  }

  const fabrics = config.fabricsTop
    .filter(f => !f.hidden)
    .filter(f => activeCategory === 'All' || f.category === activeCategory)

  // Group identical basket items together for the floating cart display
  function groupKey(item) {
    return [item.sizeName, item.length, item.shape, item.fabric?.id, item.extraLayers, item.backing].join('|')
  }
  const groupedBasket = Object.values(
    basket.reduce((acc, item) => {
      const key = groupKey(item)
      if (!acc[key]) acc[key] = { ...item, qty: 0, ids: [] }
      acc[key].qty += 1
      acc[key].ids.push(item.id)
      return acc
    }, {})
  )
  const basketCount = basket.length
  const basketTotal = basket.reduce((sum, item) => sum + item.price, 0)

  function incrementGroup(group) {
    const template = basket.find(item => item.id === group.ids[0])
    setBasket([...basket, { ...template, id: Date.now() }])
  }
  function decrementGroup(group) {
    if (group.ids.length <= 1) return removeGroup(group)
    const idToRemove = group.ids[group.ids.length - 1]
    setBasket(basket.filter(item => item.id !== idToRemove))
  }
  function removeGroup(group) {
    setBasket(basket.filter(item => !group.ids.includes(item.id)))
  }
  function clearBasket() {
    setBasket([])
    setCartOpen(false)
  }

  // Top progress bar labels/order depend on which path is active
  function pathStepLabels(path) {
    if (path === 'fabric') return ['Fabric', 'Sizes', 'Configure', 'Checkout']
    if (path === 'need') return ['Need', 'Fabrics', 'Configure', 'Checkout']
    return ['Configure', 'Checkout']
  }
  function pathStepIds(path) {
    if (path === 'fabric') return ['fabric1', 'fabric2', 'configure', 'checkout']
    if (path === 'need') return ['need1', 'need2', 'configure', 'checkout']
    return ['configure', 'checkout']
  }
  const stepLabels = pathStepLabels(entryPath)
  const stepIds = pathStepIds(entryPath)
  const currentStepIdx = stepIds.indexOf(step)

  return (
    <div style={styles.container}>
      {/* Back button */}
      <div style={styles.topBar}>
        <button
          style={styles.backBtn}
          onClick={() => {
            if (step === 'entry') { onBack(); return }
            // Any mid-path back-out returns to the entry choice screen
            setEntryPath(null)
            setStep('entry')
          }}
        >← Back</button>
        <div style={styles.topTitle}>Design Studio</div>
        <div style={{width: 40}} />
      </div>

      {/* Step indicator — hidden on the entry screen itself */}
      {step !== 'entry' && (
        <div style={styles.stepBar}>
          {stepLabels.map((label, i) => (
            <div key={label} style={styles.stepItem}>
              <div style={{
                ...styles.stepDot,
                background: i === currentStepIdx ? c.rose : i < currentStepIdx ? c.green : '#e8d0d0',
                color: i <= currentStepIdx ? c.white : c.muted,
              }}>
                {i + 1}
              </div>
              <div style={{...styles.stepLabel, color: i === currentStepIdx ? c.rose : c.muted}}>
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENTRY: choose a path */}
      {step === 'entry' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>How would you like to start?</div>
          <div style={styles.stepSub}>Either way you'll end up building the exact same custom pad — pick whichever feels easier.</div>

          <div style={styles.entryCard} onClick={() => { setEntryPath('fabric'); setStep('fabric1') }}>
            <div style={styles.entryCardIcon}>🎨</div>
            <div style={styles.entryCardBody}>
              <div style={styles.entryCardTitle}>Start with a Fabric</div>
              <div style={styles.entryCardDesc}>Fell in love with a print? Pick it first, then tell us which sizes to make it into.</div>
            </div>
          </div>

          <div style={styles.entryCard} onClick={() => { setEntryPath('need'); setStep('need1') }}>
            <div style={styles.entryCardIcon}>🩸</div>
            <div style={styles.entryCardBody}>
              <div style={styles.entryCardTitle}>Start with your Need</div>
              <div style={styles.entryCardDesc}>Not sure what print you want yet? Tell us your flow first, then browse fabrics that fit.</div>
            </div>
          </div>
        </div>
      )}

      {/* PATH A — STEP 1: pick one fabric */}
      {step === 'fabric1' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>Pick your fabric</div>
          <div style={styles.stepSub}>Tap a print to select it.</div>

          <div style={styles.catScroll}>
            {STUDIO_CONFIG.categories.map(cat => (
              <button
                key={cat}
                style={{...styles.catTab, ...(activeCategory === cat ? styles.catTabActive : {})}}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={styles.fabricCount}>Showing {fabrics.length} prints</div>

          <div style={styles.fabricGrid}>
            {fabrics.slice(0, 24).map((f, i) => (
              <div
                key={f.id}
                style={{
                  ...styles.fabricCard,
                  background: STUDIO_CONFIG.placeholderColors[i % STUDIO_CONFIG.placeholderColors.length],
                  outline: chosenFabric?.id === f.id ? `3px solid ${c.rose}` : 'none',
                }}
                onClick={() => setChosenFabric(f)}
              >
                <div style={styles.fabricNum}>{f.id}</div>
              </div>
            ))}
          </div>

          <button
            style={{...styles.btnPrimary, opacity: chosenFabric ? 1 : 0.4, marginTop: 16}}
            onClick={() => chosenFabric && setStep('fabric2')}
          >
            Continue with Print {chosenFabric?.id || '—'} →
          </button>
        </div>
      )}

      {/* PATH A — STEP 2: tick every size wanted in that fabric */}
      {step === 'fabric2' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>Which sizes in this print?</div>
          <div style={styles.stepSub}>Tick everything you'd like made in Print {chosenFabric?.id}. You'll set the length, shape and backing for each one next.</div>

          {STUDIO_CONFIG.sizes.map(size => {
            const checked = chosenSizeIds.includes(size.id)
            return (
              <div
                key={size.id}
                style={{...styles.sizeCard, ...(checked ? styles.sizeCardActive : {})}}
                onClick={() => setChosenSizeIds(
                  checked ? chosenSizeIds.filter(id => id !== size.id) : [...chosenSizeIds, size.id]
                )}
              >
                <div style={styles.sizeCardTop}>
                  <div style={styles.sizeCardName}>{size.emoji} {size.name}</div>
                  <div style={{...styles.checkBadge, ...(checked ? styles.checkBadgeActive : {})}}>{checked ? '✓' : ''}</div>
                </div>
                <div style={styles.sizeCardRange}>
                  {size.minLength}"–{size.maxLength}" · from S${(size.pricePerInch ? size.minLength * size.pricePerInchRate : size.priceBase).toFixed(2)}
                </div>
                <div style={styles.sizeCardDesc}>{size.description}</div>
              </div>
            )
          })}

          <button
            style={{...styles.btnPrimary, opacity: chosenSizeIds.length ? 1 : 0.4, marginTop: 16}}
            onClick={() => chosenSizeIds.length && startQueue(chosenSizeIds.map(sizeId => ({ sizeId, fabric: chosenFabric })))}
          >
            Configure {chosenSizeIds.length || ''} Size{chosenSizeIds.length === 1 ? '' : 's'} →
          </button>
          <button style={styles.btnOutline} onClick={() => setStep('fabric1')}>← Change fabric</button>
        </div>
      )}

      {/* PATH B — STEP 1: pick one size/absorbency */}
      {step === 'need1' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>What do you need?</div>
          <div style={styles.stepSub}>Not sure? Start with Light or Liner.</div>
          {STUDIO_CONFIG.sizes.map(size => (
            <div
              key={size.id}
              style={styles.sizeCard}
              onClick={() => { setChosenNeedSizeId(size.id); setStep('need2') }}
            >
              <div style={styles.sizeCardTop}>
                <div style={styles.sizeCardName}>{size.emoji} {size.name}</div>
                <div style={styles.sizeCardPrice}>
                  from S${(size.pricePerInch ? size.minLength * size.pricePerInchRate : size.priceBase).toFixed(2)}
                </div>
              </div>
              <div style={styles.sizeCardRange}>{size.minLength}"–{size.maxLength}" · {size.shapes.length} shape{size.shapes.length > 1 ? 's' : ''}</div>
              <div style={styles.sizeCardDesc}>{size.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* PATH B — STEP 2: tick every fabric wanted in that size */}
      {step === 'need2' && (
        <div style={styles.stepContent}>
          <div style={styles.stepHeading}>Pick your fabrics</div>
          <div style={styles.stepSub}>
            Tick every print you'd like made as a {STUDIO_CONFIG.sizes.find(s => s.id === chosenNeedSizeId)?.name}. You'll set the length, shape and backing for each one next.
          </div>

          <div style={styles.catScroll}>
            {STUDIO_CONFIG.categories.map(cat => (
              <button
                key={cat}
                style={{...styles.catTab, ...(activeCategory === cat ? styles.catTabActive : {})}}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={styles.fabricCount}>Showing {fabrics.length} prints · {chosenFabrics.length} selected</div>

          <div style={styles.fabricGrid}>
            {fabrics.slice(0, 24).map((f, i) => {
              const checked = chosenFabrics.some(cf => cf.id === f.id)
              return (
                <div
                  key={f.id}
                  style={{
                    ...styles.fabricCard,
                    background: STUDIO_CONFIG.placeholderColors[i % STUDIO_CONFIG.placeholderColors.length],
                    outline: checked ? `3px solid ${c.rose}` : 'none',
                  }}
                  onClick={() => setChosenFabrics(
                    checked ? chosenFabrics.filter(cf => cf.id !== f.id) : [...chosenFabrics, f]
                  )}
                >
                  <div style={styles.fabricNum}>{f.id}</div>
                  {checked && <div style={styles.fabricCheckBadge}>✓</div>}
                </div>
              )
            })}
          </div>

          <button
            style={{...styles.btnPrimary, opacity: chosenFabrics.length ? 1 : 0.4, marginTop: 16}}
            onClick={() => chosenFabrics.length && startQueue(chosenFabrics.map(fabric => ({ sizeId: chosenNeedSizeId, fabric })))}
          >
            Configure {chosenFabrics.length || ''} Fabric{chosenFabrics.length === 1 ? '' : 's'} →
          </button>
          <button style={styles.btnOutline} onClick={() => setStep('need1')}>← Change need</button>
        </div>
      )}

      {/* CONFIGURE — shared by both paths, once per queued pad */}
      {step === 'configure' && sizeConfig && (
        <div style={styles.stepContent}>
          {queue.length > 1 && (
            <div style={styles.queueBadge}>Pad {queueIndex + 1} of {queue.length}</div>
          )}

          <div style={styles.configCard}>

            {/* Live preview, right inside the card, next to the header info */}
            <div style={styles.configPreviewWrap}>
              <PadShape
                shapeId={selectedShape}
                lengthInches={selectedLength || sizeConfig.minLength}
                fabricImageUrl={currentFabric?.imageUrl}
                backingColor="#e8c4d0"
                showSnaps={true}
                width={108}
              />
              <div style={styles.configPreviewInfo}>
                <div style={styles.configCardName}>
                  {sizeConfig.name} <span style={styles.configCardRange}>({sizeConfig.minLength}"–{sizeConfig.maxLength}")</span>
                </div>
                <div style={styles.configPreviewPrint}>Print {currentFabric?.id || '—'}</div>
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
                    onClick={() => handleLengthSelect(len)}
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
                {sizeConfig.shapes.map(shapeId => {
                  const cap = sizeConfig.shapeMaxLength?.[shapeId]
                  const disabled = cap && selectedLength > cap
                  return (
                    <button
                      key={shapeId}
                      disabled={disabled}
                      style={{
                        ...styles.shapePill,
                        ...(selectedShape === shapeId ? styles.shapePillActive : {}),
                        ...(disabled ? styles.shapePillDisabled : {}),
                      }}
                      onClick={() => !disabled && setSelectedShape(shapeId)}
                    >
                      {SHAPE_NAMES[shapeId]}{disabled ? ` (max ${cap}")` : ''}
                    </button>
                  )
                })}
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
                <button style={styles.layerBtn} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <span style={styles.layerCount}>{qty}</span>
                <button style={styles.layerBtn} onClick={() => setQty(qty + 1)}>+</button>
              </div>
              <button
                style={{...styles.btnPrimary, width: 'auto', flex: 1, marginBottom: 0}}
                onClick={handleAddToBasket}
              >
                🛒 {queueIndex + 1 < queue.length ? 'Add & Continue to Next Pad' : 'Add to Basket'}
              </button>
            </div>

          </div>

          <button
            style={styles.btnOutline}
            onClick={() => setStep(entryPath === 'fabric' ? 'fabric2' : 'need2')}
          >
            ← Change selection
          </button>
        </div>
      )}

      {/* CHECKOUT */}
      {step === 'checkout' && (
        <Checkout basket={basket} setBasket={setBasket} onBack={() => { setEntryPath(null); setStep('entry') }} />
      )}

      {/* Floating live cart */}
      {basketCount > 0 && step !== 'checkout' && (
        <FloatingCart
          groupedBasket={groupedBasket}
          basketCount={basketCount}
          basketTotal={basketTotal}
          open={cartOpen}
          setOpen={setCartOpen}
          onIncrement={incrementGroup}
          onDecrement={decrementGroup}
          onRemove={removeGroup}
          onClearAll={clearBasket}
          onCheckout={() => { setCartOpen(false); setStep('checkout') }}
        />
      )}
    </div>
  )
}

function FloatingCart({ groupedBasket, basketCount, basketTotal, open, setOpen, onIncrement, onDecrement, onRemove, onClearAll, onCheckout }) {
  return (
    <div style={styles.cartWrap}>
      {open && (
        <div style={styles.cartPanel}>
          <div style={styles.cartPanelHeader}>
            <div>
              <div style={styles.cartPanelTitle}>Custom Order Summary</div>
              <div style={styles.cartPanelSub}>{basketCount} total cloth pad{basketCount > 1 ? 's' : ''}</div>
            </div>
            <button style={styles.cartClearBtn} onClick={onClearAll}>Clear All</button>
          </div>

          <div style={styles.cartItemsScroll}>
            {groupedBasket.map(group => (
              <div key={group.ids.join('-')} style={styles.cartItem}>
                <div style={styles.cartItemLeft}>
                  <div style={styles.cartItemName}>
                    {group.sizeName} ({group.length}")
                  </div>
                  <div style={styles.cartItemDetail}>
                    {group.shape} · Print {group.fabric?.id || '—'}
                    {group.extraLayers > 0 && ` · +${group.extraLayers} layer${group.extraLayers > 1 ? 's' : ''}`}
                  </div>
                  <div style={styles.cartItemDetail}>
                    Backing: {group.backing === 'organic' ? 'Organic Cotton' : group.backing === 'printed' ? 'Printed Cotton' : group.backing === 'antipill' ? 'Antipill Fleece' : group.backing}
                  </div>
                </div>
                <div style={styles.cartItemRight}>
                  <div style={styles.cartItemSubtotal}>S${(group.price * group.qty).toFixed(2)}</div>
                  <div style={styles.cartQtyStepper}>
                    <button style={styles.cartQtyBtn} onClick={() => onDecrement(group)}>−</button>
                    <span style={styles.cartQtyCount}>{group.qty}</span>
                    <button style={styles.cartQtyBtn} onClick={() => onIncrement(group)}>+</button>
                  </div>
                  <button style={styles.cartTrashBtn} onClick={() => onRemove(group)}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.cartPanelFooter}>
            <div style={styles.cartTotalRow}>
              <span>Estimated Total</span>
              <span style={styles.cartTotalAmount}>S${basketTotal.toFixed(2)}</span>
            </div>
            <div style={styles.cartFooterBtns}>
              <button style={styles.btnOutline2} onClick={() => setOpen(false)}>Minimize</button>
              <button style={styles.cartCheckoutBtn} onClick={onCheckout}>📩 Send My Order</button>
            </div>
          </div>
        </div>
      )}

      {!open && (
        <div style={styles.cartBar} onClick={() => setOpen(true)}>
          <div style={styles.cartBarIcon}>🛍️</div>
          <div style={styles.cartBarInfo}>
            <div style={styles.cartBarLabel}>Custom Order Summary</div>
            <div style={styles.cartBarSub}>{basketCount} pad{basketCount > 1 ? 's' : ''} · S${basketTotal.toFixed(2)}</div>
          </div>
          <button
            style={styles.cartBarDetailsBtn}
            onClick={e => { e.stopPropagation(); setOpen(true) }}
          >
            Details ▾
          </button>
          <button
            style={styles.cartBarCheckoutBtn}
            onClick={e => { e.stopPropagation(); onCheckout() }}
          >
            Checkout →
          </button>
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
  shapePillDisabled: { opacity: 0.35, cursor: 'not-allowed' },
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
  entryCard: { background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '16px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' },
  entryCardIcon: { fontSize: 28, lineHeight: 1 },
  entryCardBody: { flex: 1 },
  entryCardTitle: { fontSize: 15, fontWeight: 700, color: c.rose, fontFamily: "'Playfair Display', serif", marginBottom: 4 },
  entryCardDesc: { fontSize: 12, color: c.muted, lineHeight: 1.5 },
  sizeCardActive: { border: `1.5px solid ${c.rose}`, background: c.roseLight },
  checkBadge: { width: 22, height: 22, borderRadius: '50%', border: `1.5px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: c.white, flexShrink: 0 },
  checkBadgeActive: { background: c.rose, border: `1.5px solid ${c.rose}` },
  fabricCheckBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: '50%', background: c.rose, color: c.white, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  queueBadge: { display: 'inline-block', background: c.roseLight, color: c.rose, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', borderRadius: 12, padding: '4px 10px', marginBottom: 10 },
  configPreviewWrap: { display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 },
  configPreviewInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  configPreviewPrint: { fontSize: 11, color: c.muted, marginBottom: 4 },
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

  cartWrap: { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300, display: 'flex', justifyContent: 'center', padding: '0 12px 12px' },
  cartBar: { width: '100%', maxWidth: 460, background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 20, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.15)', cursor: 'pointer' },
  cartBarIcon: { width: 34, height: 34, borderRadius: '50%', background: c.roseLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  cartBarInfo: { flex: 1, minWidth: 0 },
  cartBarLabel: { fontSize: 10, color: c.muted, letterSpacing: '0.05em', textTransform: 'uppercase' },
  cartBarSub: { fontSize: 13, fontWeight: 700, color: c.rose },
  cartBarDetailsBtn: { background: c.roseLight, color: c.rose, border: 'none', borderRadius: 16, padding: '7px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  cartBarCheckoutBtn: { background: c.rose, color: c.white, border: 'none', borderRadius: 16, padding: '7px 14px', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  cartPanel: { width: '100%', maxWidth: 460, background: c.white, border: `1.5px solid ${c.border}`, borderRadius: 20, boxShadow: '0 -6px 30px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', maxHeight: '75vh' },
  cartPanelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 16px 10px' },
  cartPanelTitle: { fontSize: 15, fontWeight: 700, color: c.rose, fontFamily: "'Playfair Display', serif" },
  cartPanelSub: { fontSize: 10, color: c.muted, letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: 2 },
  cartClearBtn: { background: c.roseLight, color: c.rose, border: 'none', borderRadius: 14, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' },
  cartItemsScroll: { overflowY: 'auto', padding: '0 16px', flex: 1 },
  cartItem: { display: 'flex', justifyContent: 'space-between', gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: `1px solid ${c.border}` },
  cartItemLeft: { flex: 1, minWidth: 0 },
  cartItemName: { fontSize: 13, fontWeight: 700, color: c.text, marginBottom: 2 },
  cartItemDetail: { fontSize: 11, color: c.muted, lineHeight: 1.5 },
  cartItemRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  cartItemSubtotal: { fontSize: 12, color: c.muted },
  cartQtyStepper: { display: 'flex', alignItems: 'center', gap: 6, background: c.roseLight, borderRadius: 14, padding: '2px 8px' },
  cartQtyBtn: { background: 'none', border: 'none', color: c.rose, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: 16 },
  cartQtyCount: { fontSize: 12, fontWeight: 700, color: c.rose, width: 14, textAlign: 'center' },
  cartTrashBtn: { background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', opacity: 0.6 },
  cartPanelFooter: { padding: '12px 16px 16px', borderTop: `1px solid ${c.border}` },
  cartTotalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: c.muted, marginBottom: 10, letterSpacing: '0.05em', textTransform: 'uppercase' },
  cartTotalAmount: { fontSize: 20, fontWeight: 700, color: c.rose, textTransform: 'none', letterSpacing: 0 },
  cartFooterBtns: { display: 'flex', gap: 10 },
  btnOutline2: { flex: 1, background: 'transparent', color: c.rose, border: `1.5px solid ${c.rose}`, borderRadius: 20, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cartCheckoutBtn: { flex: 1.4, background: c.rose, color: c.white, border: 'none', borderRadius: 20, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}

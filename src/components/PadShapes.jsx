// PadShapes.jsx
// WonderPads Reusables — traced pad silhouette shapes
// Drop this file into src/components/PadShapes.jsx
//
// Usage:
//   import { PadShape } from './components/PadShapes'
//   <PadShape shapeId="moon_rise" lengthInches={10} fabricImageUrl={...} />
//
// Each shape is a single SVG path on its own viewBox (matches the
// proportions traced from real patterns). The component scales height by
// lengthInches relative to each shape's natural min/max range, and applies
// the chosen fabric image as a pattern fill so the preview actually shows
// the customer's selected print.

const SHAPES = {
  staple: {
    name: 'Staple',
    minLength: 7,
    maxLength: 18,
    viewBox: '0 0 680 460',
    path: `
      M 340 65
      C 372 65, 396 84, 400 110
      L 400 165
      L 460 185
      L 460 225
      L 400 245
      L 400 320
      C 396 346, 372 365, 340 365
      C 308 365, 284 346, 280 320
      L 280 245
      L 220 225
      L 220 185
      L 280 165
      L 280 110
      C 284 84, 308 65, 340 65
      Z
    `,
    snaps: [
      { cx: 228, cy: 205 },
      { cx: 452, cy: 205 },
    ],
  },

  moon_rise: {
    name: 'Moon Rise',
    minLength: 6,
    maxLength: 18,
    viewBox: '0 0 680 460',
    path: `
      M 340 60
      C 386 60, 415 92, 415 130
      C 415 150, 408 165, 398 175
      L 398 178
      L 460 178
      L 460 222
      L 398 222
      L 398 225
      C 408 235, 415 250, 415 270
      C 415 308, 386 340, 340 340
      C 294 340, 265 308, 265 270
      C 265 250, 272 235, 282 225
      L 282 222
      L 220 222
      L 220 178
      L 282 178
      L 282 175
      C 272 165, 265 150, 265 130
      C 265 92, 294 60, 340 60
      Z
    `,
    snaps: [
      { cx: 230, cy: 200 },
      { cx: 450, cy: 200 },
    ],
  },

  sunglow: {
    name: 'Sunglow',
    minLength: 6,
    maxLength: 20,
    viewBox: '0 0 680 420',
    path: `
      M 340 58
      C 388 58, 418 90, 418 128
      C 418 145, 412 158, 404 168
      L 408 173
      L 470 230
      L 408 287
      L 404 292
      C 412 302, 418 315, 418 332
      C 418 372, 388 402, 340 402
      C 292 402, 262 372, 262 332
      C 262 315, 268 302, 276 292
      L 272 287
      L 210 230
      L 272 173
      L 276 168
      C 268 158, 262 145, 262 128
      C 262 90, 292 58, 340 58
      Z
    `,
    snaps: [
      { cx: 240, cy: 230 },
      { cx: 440, cy: 230 },
    ],
  },

  mega_pad: {
    name: 'Mega Pad',
    minLength: 12,
    maxLength: 20,
    viewBox: '0 0 680 540',
    path: `
      M 340 58
      C 310 58, 278 88, 272 130
      C 266 172, 282 220, 315 248
      L 310 252
      L 255 265
      L 255 283
      L 310 296
      L 315 300
      C 282 328, 266 376, 272 418
      C 278 460, 310 490, 340 490
      C 370 490, 402 460, 408 418
      C 414 376, 398 328, 365 300
      L 370 296
      L 425 283
      L 425 265
      L 370 252
      L 365 248
      C 398 220, 414 172, 408 130
      C 402 88, 370 58, 340 58
      Z
    `,
    snaps: [
      { cx: 263, cy: 274 },
      { cx: 417, cy: 274 },
    ],
  },

  surged_curvy: {
    name: 'Surged/Curvy',
    minLength: 7,
    maxLength: 18,
    // Taller viewBox than the other four (561 vs ~460) because this
    // shape's own proportions, traced directly from the pattern photo,
    // are naturally more elongated (long tapered body, rounded bottom).
    viewBox: '0 0 680 561',
    // Traced from an actual Surged/Curvy pattern piece photo (not hand-
    // guessed like the earlier attempts). Dome top and rounded bottom use
    // smooth curves; the wing notches use straight edges (L) rather than
    // curves because the real pattern has genuine angular corners there,
    // not rounded ones — smoothing them earlier produced a slight wobble
    // right at the point, so those four segments per side stay sharp on
    // purpose.
    path: `
      M 355.8 50.0
      C 346.0 47.7, 342.4 48.9, 334.9 50.0
      C 327.4 51.1, 317.3 53.8, 310.7 56.8
      C 304.0 59.8, 300.0 63.3, 295.2 67.9
      C 290.3 72.6, 284.6 77.8, 281.6 84.9
      C 278.5 92.0, 275.8 96.5, 276.7 110.6
      C 277.6 124.7, 285.3 154.7, 286.9 169.8
      C 288.5 184.8, 289.3 192.6, 286.4 200.8
      C 283.6 208.9, 280.4 210.6, 269.9 218.7
      L 223.4 249.3
      L 220.0 256.5
      L 221.0 294.4
      L 263.2 328.3
      C 272.9 337.8, 276.9 345.1, 279.6 351.6
      C 282.4 358.0, 284.5 349.0, 279.6 367.1
      C 274.8 385.2, 255.6 441.9, 250.5 460.2
      C 245.5 478.4, 248.8 471.3, 249.1 476.7
      C 249.4 482.1, 250.5 487.5, 252.5 492.7
      C 254.5 497.8, 256.0 501.8, 261.2 507.7
      C 266.5 513.6, 277.7 523.5, 284.0 528.1
      C 290.3 532.7, 291.8 533.2, 299.0 535.3
      C 306.2 537.4, 318.3 540.1, 327.2 540.7
      C 336.0 541.2, 345.2 539.9, 351.9 538.7
      C 358.6 537.5, 360.9 536.9, 367.4 533.4
      C 373.9 529.9, 383.9 523.9, 390.7 517.9
      C 397.5 511.9, 404.1 505.0, 408.1 497.5
      C 412.2 490.0, 416.7 490.2, 414.9 472.8
      C 413.1 455.3, 400.4 411.9, 397.5 392.8
      C 394.5 373.6, 395.3 366.5, 397.5 357.9
      C 399.6 349.2, 400.7 348.9, 410.5 340.9
      L 456.6 309.9
      L 460.0 303.6
      L 459.0 265.8
      L 413.9 223.1
      C 404.7 212.9, 405.3 212.0, 403.8 204.7
      C 402.2 197.3, 401.5 194.3, 404.7 179.0
      C 408.0 163.6, 420.6 127.1, 423.2 112.5
      C 425.7 98.0, 421.9 97.4, 419.8 91.7
      C 417.6 86.0, 414.4 82.7, 410.1 78.1
      C 405.7 73.5, 402.6 68.7, 393.6 64.1
      C 384.5 59.4, 365.5 52.3, 355.8 50.0
      Z
    `,
    snaps: [
      { cx: 228, cy: 256 },
      { cx: 452, cy: 304 },
    ],
  },
}

export function PadShape({
  shapeId = 'moon_rise',
  lengthInches,
  fabricImageUrl,
  backingColor = '#ece2cc',
  showSnaps = true,
  width = 180,
}) {
  const shape = SHAPES[shapeId] || SHAPES.moon_rise
  const len = lengthInches ?? shape.minLength

  // Scale factor: longer pads get taller (proportionally, with diminishing
  // width growth so a 20" Mega Pad doesn't look like a balloon)
  const range = shape.maxLength - shape.minLength || 1
  const t = Math.max(0, Math.min(1, (len - shape.minLength) / range))
  const heightScale = 1 + t * 0.55  // up to +55% taller at max length
  const widthScale = 1 + t * 0.12   // only +12% wider at max length

  const [, , vbW, vbH] = shape.viewBox.split(' ').map(Number)
  const renderHeight = width * (vbH / vbW) * heightScale

  // FIX: the group below scales the path from the center of the viewBox,
  // which pushes the top/bottom of the shape past the original 0..vbH
  // range once heightScale/widthScale exceed 1. The viewBox previously
  // stayed fixed at shape.viewBox, so anything outside it got silently
  // clipped by the browser (SVG crops to the viewBox by default) — this
  // is what was cutting off the top of longer pads, most visibly on
  // Surged/Curvy. Expanding the viewBox by the same amount, around the
  // same center pivot, keeps the whole scaled shape inside frame at
  // every length.
  const vbExpandX = (vbW * (widthScale - 1)) / 2
  const vbExpandY = (vbH * (heightScale - 1)) / 2
  const dynamicViewBox = `${-vbExpandX} ${-vbExpandY} ${vbW + vbExpandX * 2} ${vbH + vbExpandY * 2}`

  const patternId = `fabric-${shapeId}-${Math.round(len * 10)}-${Math.random().toString(36).substr(2, 5)}`

  return (
    <svg
      width={width}
      height={renderHeight}
      viewBox={dynamicViewBox}
      role="img"
      aria-label={`${shape.name} pad shape preview, ${len} inches`}
      className="transition-all duration-300 ease-out drop-shadow-sm filter"
    >
      <defs>
        {fabricImageUrl ? (
          <pattern
            id={patternId}
            patternUnits="objectBoundingBox"
            width="1"
            height="1"
          >
            <image
              href={fabricImageUrl}
              x="0"
              y="0"
              width={vbW}
              height={vbH}
              preserveAspectRatio="xMidYMid slice"
            />
          </pattern>
        ) : null}
      </defs>

      {/* Group to scale the pad paths from the center of the viewBox */}
      <g transform={`translate(${vbW / 2}, ${vbH / 2}) scale(${widthScale}, ${heightScale}) translate(${-vbW / 2}, ${-vbH / 2})`}>
        {/* Ambient shadow back outline */}
        <path
          d={shape.path}
          fill="rgba(0,0,0,0.03)"
          transform="translate(2, 4)"
        />

        <path
          d={shape.path}
          fill={fabricImageUrl ? `url(#${patternId})` : backingColor}
          stroke="#8b3a52"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>

      {/* Render snaps at dynamically calculated coordinates so they scale positions but remain perfect circles */}
      {showSnaps &&
        shape.snaps.map((s, i) => {
          const cxScaled = (s.cx - vbW / 2) * widthScale + vbW / 2
          const cyScaled = (s.cy - vbH / 2) * heightScale + vbH / 2
          return (
            <g key={i} className="transition-opacity duration-350">
              {/* Outer snap rim */}
              <circle
                cx={cxScaled}
                cy={cyScaled}
                r="7"
                fill="#FAF7FB"
                stroke="#8B7080"
                strokeWidth="1.2"
                opacity="0.9"
              />
              {/* Inner snap core */}
              <circle
                cx={cxScaled}
                cy={cyScaled}
                r="3.5"
                fill="#8B7080"
                opacity="0.95"
              />
            </g>
          )
        })}
    </svg>
  )
}

export { SHAPES }

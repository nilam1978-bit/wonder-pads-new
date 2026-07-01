// PadShapes.jsx
// WonderPads Reusables — traced pad silhouette shapes
// Drop this file into src/components/PadShapes.jsx
//
// Usage:
//   import { PadShape } from './components/PadShapes'
//   <PadShape shapeId="moon_rise" lengthInches={10} fabricImageUrl={...} />
//
// Each shape is a single SVG path on a 0-0-220-300 viewBox (matches the
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

  const patternId = `fabric-${shapeId}-${Math.round(len * 10)}`

  return (
    <svg
      width={width}
      height={renderHeight}
      viewBox={shape.viewBox}
      style={{ transform: `scaleX(${widthScale})`, transformOrigin: 'center' }}
      role="img"
      aria-label={`${shape.name} pad shape preview, ${len} inches`}
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

      <path
        d={shape.path}
        fill={fabricImageUrl ? `url(#${patternId})` : backingColor}
        stroke="#8b3a52"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {showSnaps &&
        shape.snaps.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r="4"
            fill="#3a2020"
            opacity="0.55"
          />
        ))}
    </svg>
  )
}

export { SHAPES }

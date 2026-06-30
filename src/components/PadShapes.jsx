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
    viewBox: '0 0 156 270',
    path: `
      M 78 55
      C 96 55, 107 66, 107 80
      L 107 108
      C 118 113, 126 122, 126 134
      C 126 146, 118 155, 107 160
      L 107 188
      C 107 204, 96 215, 78 215
      C 60 215, 49 204, 49 188
      L 49 160
      C 38 155, 30 146, 30 134
      C 30 122, 38 113, 49 108
      L 49 80
      C 49 66, 60 55, 78 55
      Z
    `,
    snaps: [
      { cx: 33, cy: 134 },
      { cx: 123, cy: 134 },
    ],
  },

  moon_rise: {
    name: 'Moon Rise',
    minLength: 6,
    maxLength: 18,
    viewBox: '0 0 320 300',
    path: `
      M 220 55
      C 250 55, 264 73, 264 95
      C 264 110, 258 116, 252 122
      L 290 138
      L 290 158
      L 252 174
      C 258 180, 264 186, 264 200
      C 264 222, 250 240, 220 240
      C 190 240, 176 222, 176 200
      C 176 186, 182 180, 188 174
      L 150 158
      L 150 138
      L 188 122
      C 182 116, 176 110, 176 95
      C 176 73, 190 55, 220 55
      Z
    `,
    snaps: [
      { cx: 156, cy: 148 },
      { cx: 284, cy: 148 },
    ],
  },

  sunglow: {
    name: 'Sunglow',
    minLength: 6,
    maxLength: 20,
    viewBox: '0 0 480 320',
    path: `
      M 380 65
      C 406 65, 420 85, 420 108
      C 420 122, 415 130, 410 137
      L 450 165
      L 410 192
      C 416 200, 423 211, 423 230
      C 423 260, 406 282, 380 282
      C 354 282, 337 260, 337 230
      C 337 211, 344 200, 350 192
      L 310 165
      L 350 137
      C 345 130, 340 122, 340 108
      C 340 85, 354 65, 380 65
      Z
    `,
    snaps: [
      { cx: 316, cy: 165 },
      { cx: 444, cy: 165 },
    ],
  },

  mega_pad: {
    name: 'Mega Pad',
    minLength: 12,
    maxLength: 20,
    viewBox: '0 0 460 420',
    path: `
      M 340 50
      C 372 50, 386 75, 386 105
      C 386 135, 378 165, 368 195
      L 372 205
      L 408 200
      L 416 207
      L 416 217
      L 408 224
      L 372 219
      L 368 225
      C 378 255, 386 285, 386 315
      C 386 345, 372 370, 340 370
      C 308 370, 294 345, 294 315
      C 294 285, 302 255, 312 225
      L 308 219
      L 272 224
      L 264 217
      L 264 207
      L 272 200
      L 308 205
      L 312 195
      C 302 165, 294 135, 294 105
      C 294 75, 308 50, 340 50
      Z
    `,
    snaps: [
      { cx: 270, cy: 212 },
      { cx: 410, cy: 212 },
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

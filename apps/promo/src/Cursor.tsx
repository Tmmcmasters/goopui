// macOS-style arrow cursor drawn from the same path the goo is driven by.

import type { Click } from './goo/replay'
import { speedAt, type CursorPath } from './goo/path'

export interface CursorProps {
  path: CursorPath
  clicks: readonly Click[]
  /** Local time (s). */
  t: number
  /** Ring color for click feedback. */
  ring: string
  opacity?: number
}

/** Arrow outline, tip at (0, 0); about 13 x 20 units. */
const ARROW = 'M0 0 L0 17.2 L4.1 13.4 L6.9 19.8 L9.9 18.5 L7.2 12.3 L12.7 12.3 Z'
const SCALE = 1.32

const pressAmount = (clicks: readonly Click[], t: number): number => {
  let p = 0
  for (const c of clicks) {
    if (t < c.down - 0.02 || t > c.up + 0.16) continue
    // In fast, out with a little give.
    const inP = Math.min(1, Math.max(0, (t - (c.down - 0.02)) / 0.04))
    const outP = t > c.up ? 1 - Math.min(1, (t - c.up) / 0.16) : 1
    p = Math.max(p, inP * outP * outP)
  }
  return p
}

function Arrow({ x, y, scale, opacity }: { x: number; y: number; scale: number; opacity: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${SCALE * scale})`} opacity={opacity}>
      <path d={ARROW} fill="#000" stroke="#fff" strokeWidth={1.25} strokeLinejoin="round" />
    </g>
  )
}

export const Cursor: React.FC<CursorProps> = ({ path, clicks, t, ring, opacity = 1 }) => {
  const p = path.at(t)
  if (!p) return null
  const press = pressAmount(clicks, t)
  const speed = speedAt(path, t)
  // Motion trail only on really fast moves (the punch): reads as motion blur.
  const trail = Math.min(1, Math.max(0, (speed - 1100) / 1800))
  const ghosts = trail > 0 ? [5, 4, 3, 2, 1] : []
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 480 480"
      style={{ position: 'absolute', inset: 0, overflow: 'visible', opacity }}
    >
      <defs>
        <filter id="cursor-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1.3" floodColor="#000" floodOpacity="0.4" />
        </filter>
      </defs>
      {clicks.map((c, i) => {
        const u = (t - c.down) / 0.42
        if (u < 0 || u > 1) return null
        const e = 1 - Math.pow(1 - u, 3)
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4 + 20 * e}
            fill="none"
            stroke={ring}
            strokeWidth={2.2 * (1 - u) + 0.4}
            opacity={0.55 * (1 - u)}
          />
        )
      })}
      {ghosts.map((k) => {
        const q = path.at(t - k / 200)
        return q ? <Arrow key={k} x={q.x} y={q.y} scale={1} opacity={trail * 0.16 * (1 - k / 6)} /> : null
      })}
      <g filter="url(#cursor-shadow)">
        <Arrow x={p.x} y={p.y} scale={1 - 0.14 * press} opacity={1} />
      </g>
    </svg>
  )
}

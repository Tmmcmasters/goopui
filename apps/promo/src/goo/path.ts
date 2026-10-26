// Tiny cursor-path DSL: piecewise eased segments (optionally curved through a quadratic
// control point) plus free-form segments. Positions are composition px. Pure functions of
// time, so the drawn cursor and the synthetic pointer events always agree.

export interface Pt {
  x: number
  y: number
}

export type Ease = (u: number) => number

export const ease = {
  linear: (u: number) => u,
  inOutSine: (u: number) => 0.5 - 0.5 * Math.cos(Math.PI * u),
  outCubic: (u: number) => 1 - Math.pow(1 - u, 3),
  outQuart: (u: number) => 1 - Math.pow(1 - u, 4),
  inOutCubic: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  inCubic: (u: number) => u * u * u,
  smooth: (u: number) => u * u * (3 - 2 * u),
} satisfies Record<string, Ease>

export type Segment =
  | { t0: number; t1: number; to: Pt; via?: Pt; ease?: Ease }
  | { t0: number; t1: number; fn: (t: number) => Pt }

export interface CursorPath {
  /** Position at time t (seconds), or null before the cursor appears. */
  at(t: number): Pt | null
}

const lerp = (a: number, b: number, u: number): number => a + (b - a) * u

/**
 * Build a path from a start point and segments. Gaps between segments hold the last
 * position. A segment's start is wherever the path is at its t0, so segments chain.
 */
export function cursorPath(start: Pt, startAt: number, segments: readonly Segment[], tremor = 0): CursorPath {
  const segs = [...segments].sort((a, b) => a.t0 - b.t0)
  // Precompute where each segment starts.
  const starts: Pt[] = []
  let p = start
  for (const s of segs) {
    starts.push(p)
    p = 'fn' in s ? s.fn(s.t1) : s.to
  }
  const raw = (t: number): Pt => {
    let cur = start
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]!
      if (t < s.t0) return cur
      if (t <= s.t1) {
        if ('fn' in s) return s.fn(t)
        const u = (s.ease ?? ease.inOutCubic)((t - s.t0) / (s.t1 - s.t0 || 1))
        const a = starts[i]!
        if (s.via) {
          // Quadratic bezier a -> via -> to.
          const x = lerp(lerp(a.x, s.via.x, u), lerp(s.via.x, s.to.x, u), u)
          const y = lerp(lerp(a.y, s.via.y, u), lerp(s.via.y, s.to.y, u), u)
          return { x, y }
        }
        return { x: lerp(a.x, s.to.x, u), y: lerp(a.y, s.to.y, u) }
      }
      cur = 'fn' in s ? s.fn(s.t1) : s.to
    }
    return cur
  }
  return {
    at(t) {
      if (t < startAt) return null
      const q = raw(t)
      if (!tremor) return q
      // A resting hand is never perfectly still: a couple of slow, incommensurate sines.
      return {
        x: q.x + tremor * (0.6 * Math.sin(t * 5.3 + 1.1) + 0.4 * Math.sin(t * 8.9 + 0.3)),
        y: q.y + tremor * (0.6 * Math.sin(t * 4.1 + 2.2) + 0.4 * Math.sin(t * 9.7 + 1.7)),
      }
    },
  }
}

/** Speed (px/s) of a path at t, by central difference. */
export function speedAt(path: CursorPath, t: number, h = 1 / 240): number {
  const a = path.at(t - h)
  const b = path.at(t + h)
  if (!a || !b) return 0
  return Math.hypot(b.x - a.x, b.y - a.y) / (2 * h)
}

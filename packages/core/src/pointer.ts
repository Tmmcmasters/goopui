// Shared pointer velocity tracker: ONE passive pointermove listener per document, ref-counted.
// Velocity is smoothed with a dt-based exponential filter (frame/event-rate independent) and
// decays toward 0 when events stop arriving (a resting mouse sends no moves).

import { GOOP_PHYSICS } from './constants'

export interface PointerSample {
  /** Client coordinates of the last event. */
  x: number
  y: number
  /** Smoothed velocity, px/s (client space), already decayed for event age. */
  vx: number
  vy: number
  /** |v| in px/s. */
  speed: number
}

interface Tracker {
  x: number
  y: number
  vx: number
  vy: number
  t: number
  has: boolean
  refs: number
  subs: Set<() => void>
  stop: () => void
}

const trackers = new WeakMap<Document, Tracker>()
const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

/** Feed one pointer position (client px) at time `t` (ms) into a tracker. */
function feed(tr: Tracker, x: number, y: number, t: number): void {
  if (!tr.has) {
    Object.assign(tr, { x, y, t, vx: 0, vy: 0, has: true })
    return
  }
  const dt = (t - tr.t) / 1000
  if (dt <= 0.0005) {
    tr.x = x
    tr.y = y
    return
  }
  const rawX = (x - tr.x) / dt
  const rawY = (y - tr.y) / dt
  // After a long pause the old velocity is meaningless: restart from the raw one.
  const a = dt > 0.15 ? 1 : 1 - Math.exp(-dt / GOOP_PHYSICS.pointerSmoothing)
  tr.vx += (rawX - tr.vx) * a
  tr.vy += (rawY - tr.vy) * a
  tr.x = x
  tr.y = y
  tr.t = t
}

export interface PointerTracker {
  /** Push an event you already have (e.g. pointerenter) so the sample is current. */
  feed(e: { clientX: number; clientY: number }): void
  sample(): PointerSample
  release(): void
}

/** Subscribe to the document's shared pointer tracker. */
export function trackPointer(doc: Document, onMove?: () => void): PointerTracker {
  let tr = trackers.get(doc)
  if (!tr) {
    const t: Tracker = { x: 0, y: 0, vx: 0, vy: 0, t: 0, has: false, refs: 0, subs: new Set(), stop: () => {} }
    const onEvt = (e: PointerEvent): void => {
      if (e.pointerType === 'touch') return
      feed(t, e.clientX, e.clientY, now())
      for (const f of Array.from(t.subs)) f()
    }
    doc.addEventListener('pointermove', onEvt, { capture: true, passive: true })
    t.stop = () => doc.removeEventListener('pointermove', onEvt, { capture: true })
    trackers.set(doc, t)
    tr = t
  }
  const t = tr
  t.refs++
  if (onMove) t.subs.add(onMove)
  let live = true
  return {
    feed(e) {
      feed(t, e.clientX, e.clientY, now())
    },
    sample() {
      // No events for a while = the pointer stopped. Fade velocity out instead of holding it.
      const age = Math.max(0, (now() - t.t) / 1000 - 0.03)
      const k = t.has ? Math.exp(-age / GOOP_PHYSICS.pointerSmoothing) : 0
      const vx = t.vx * k
      const vy = t.vy * k
      return { x: t.x, y: t.y, vx, vy, speed: Math.hypot(vx, vy) }
    },
    release() {
      if (!live) return
      live = false
      if (onMove) t.subs.delete(onMove)
      t.refs--
      if (t.refs <= 0) {
        t.stop()
        trackers.delete(doc)
      }
    },
  }
}

// Shared, ref-counted trackers for "other things" that move the goo:
//   - page scroll velocity (one passive scroll listener per document)
//   - device tilt (one deviceorientation listener per window, opt-in; iOS needs permission)

import { GOOP_PHYSICS } from './constants'

const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now())

// ---- scroll -------------------------------------------------------------------

export interface ScrollTracker {
  /** Smoothed page scroll velocity (px/s), decaying when scrolling stops. */
  velocity(): { vx: number; vy: number }
  release(): void
}

interface ScrollState {
  x: number
  y: number
  t: number
  vx: number
  vy: number
  subs: Set<() => void>
  stop: () => void
}
const scrolls = new WeakMap<Document, ScrollState>()

/** Subscribe to page scroll. `onScroll` fires on every scroll event (use it to wake a ticker). */
export function trackScroll(doc: Document, onScroll: () => void): ScrollTracker {
  const win = doc.defaultView
  let st = scrolls.get(doc)
  if (!st) {
    const s: ScrollState = { x: win?.scrollX ?? 0, y: win?.scrollY ?? 0, t: now(), vx: 0, vy: 0, subs: new Set(), stop: () => {} }
    const onEvt = (): void => {
      const t = now()
      const x = win?.scrollX ?? 0
      const y = win?.scrollY ?? 0
      const dt = (t - s.t) / 1000
      if (dt > 0.0005) {
        const a = dt > 0.15 ? 1 : 1 - Math.exp(-dt / GOOP_PHYSICS.pointerSmoothing)
        s.vx += ((x - s.x) / dt - s.vx) * a
        s.vy += ((y - s.y) / dt - s.vy) * a
        s.t = t
      }
      s.x = x
      s.y = y
      for (const f of Array.from(s.subs)) f()
    }
    win?.addEventListener('scroll', onEvt, { passive: true })
    s.stop = () => win?.removeEventListener('scroll', onEvt)
    scrolls.set(doc, s)
    st = s
  }
  const s = st
  s.subs.add(onScroll)
  let live = true
  return {
    velocity() {
      const age = Math.max(0, (now() - s.t) / 1000 - 0.03)
      const k = Math.exp(-age / GOOP_PHYSICS.pointerSmoothing)
      return { vx: s.vx * k, vy: s.vy * k }
    },
    release() {
      if (!live) return
      live = false
      s.subs.delete(onScroll)
      if (s.subs.size === 0) {
        s.stop()
        scrolls.delete(doc)
      }
    },
  }
}

// ---- tilt ---------------------------------------------------------------------

export interface TiltTracker {
  /** In-plane gravity direction from device tilt: x in -1..1 (left/right), y in -1..1. */
  gravity(): { x: number; y: number }
  release(): void
}

interface TiltState {
  x: number
  y: number
  refs: number
  stop: () => void
}
const tilts = new WeakMap<Window, TiltState>()

/** Subscribe to device tilt (no-op where unsupported). Call requestTiltPermission() first on iOS. */
export function trackTilt(win: Window, onChange: () => void): TiltTracker {
  let st = tilts.get(win)
  if (!st) {
    const s: TiltState = { x: 0, y: 0, refs: 0, stop: () => {} }
    const subs = new Set<() => void>()
    const onEvt = (e: DeviceOrientationEvent): void => {
      const g = ((e.gamma ?? 0) * Math.PI) / 180
      const b = ((e.beta ?? 0) * Math.PI) / 180
      s.x = Math.max(-1, Math.min(1, Math.sin(g)))
      s.y = Math.max(-1, Math.min(1, Math.sin(b)))
      for (const f of Array.from(subs)) f()
    }
    win.addEventListener('deviceorientation', onEvt as EventListener, { passive: true })
    s.stop = () => win.removeEventListener('deviceorientation', onEvt as EventListener)
    ;(s as TiltState & { subs: Set<() => void> }).subs = subs
    tilts.set(win, s)
    st = s
  }
  const s = st as TiltState & { subs: Set<() => void> }
  s.refs++
  s.subs.add(onChange)
  let live = true
  return {
    gravity() {
      return { x: s.x, y: s.y }
    },
    release() {
      if (!live) return
      live = false
      s.subs.delete(onChange)
      if (--s.refs <= 0) {
        s.stop()
        tilts.delete(win)
      }
    },
  }
}

/** Ask for motion-sensor permission where required (iOS 13+). Must run in a user gesture. */
export async function requestTiltPermission(): Promise<boolean> {
  const DOE = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } })
    .DeviceOrientationEvent
  if (!DOE) return false
  if (typeof DOE.requestPermission !== 'function') return true
  try {
    return (await DOE.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

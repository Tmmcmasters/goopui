// Drawer physics: the drag / snap / dismiss model behind GoopDrawer (framework-free, pure).
//
// Position is one number, the panel's OFFSET: how far (px) it is pushed back toward the
// screen edge it is attached to. 0 = fully open (the panel sits where CSS put it), `size` =
// fully hidden. Negative offsets are an over-drag past full open (rubber-banded).
//
// Snap points follow vaul: fractions (0..1) of the viewport along the drag axis, or px
// strings ('300px'), least visible first. A snap point is the panel's VISIBLE extent, so its
// offset is `size - visible` (clamped into 0..size).
//
// Release follows vaul's thresholds (velocity 0.4 px/ms, closeThreshold 0.25 of the panel,
// a 2 px/ms hard fling) but with the release velocity measured over the last ~100 ms of the
// drag (a flick at the end counts even after a slow drag).
//
// Motion (`planDrawerMove` / `stepDrawerMove`) is shaped for the goo edge, which reacts to the
// panel's real velocity and acceleration:
//   land  open and snap moves: a fast launch that keeps most of its speed until near the
//         target (or carries the release velocity), then a physical landing: a damped spring
//         around the target hit at speed, so it overshoots a few % of the travel (capped in
//         px) and settles with one quick rebound. The hard deceleration at impact is what
//         sloshes the edge.
//   fall  close / dismiss: constant acceleration from the current velocity, like gravity
//         (starts slowly from rest; a fling carries its speed and leaves sooner).
//   ease  reduced motion: a short ease, no overshoot.

import type { GoopPreset } from './constants'

/** A snap point: a viewport fraction (0..1) or a px string ('300px'). */
export type DrawerSnapPoint = number | string

/** Tuning (px, s). */
export const DRAWER_PHYSICS = Object.freeze({
  /** Release speed (px/s) that counts as a flick: one snap step, or a dismiss. vaul: 0.4 px/ms. */
  velocity: 400,
  /** Release speed (px/s) that closes (or jumps to the last snap point) outright. vaul: 2 px/ms. */
  fling: 2000,
  /** A flick steps snap points only if the drag was shorter than this share of the viewport. */
  flickDistance: 0.4,
  /** Default share of the panel (or of the lowest snap point) dragged past which a slow
   *  release still closes. vaul's `closeThreshold`. */
  closeThreshold: 0.25,
  /** Rubber band: resistance constant (iOS uses 0.55) and its dimension cap (px). */
  rubber: 0.55,
  /** Pointer travel (px along the axis) before a press becomes a drag. */
  slop: 4,
  /** Window (s) the release velocity is measured over. */
  velocityWindow: 0.1,
  /** Reduced motion: a short ease (s), no overshoot. */
  still: 0.2,
  /** Spring at rest within these (px, px/s). */
  restDistance: 0.5,
  restSpeed: 8,
})

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)

/** Visible extent (px) of a snap point in a viewport `viewport` px long (pure). */
export function drawerSnapVisible(point: DrawerSnapPoint, viewport: number): number {
  if (typeof point === 'number') return Number.isFinite(point) ? Math.max(0, point) * viewport : 0
  const s = point.trim()
  const n = Number.parseFloat(s)
  if (!Number.isFinite(n)) return 0
  if (s.endsWith('%')) return (n / 100) * viewport
  return Math.max(0, n)
}

/**
 * Offsets (px) of each snap point for a panel `size` px long in a `viewport` px viewport, in
 * the given order (pure). Without snap points: `[0]` (fully open).
 */
export function drawerSnapOffsets(points: readonly DrawerSnapPoint[] | undefined, size: number, viewport: number): number[] {
  if (!points || points.length === 0) return [0]
  return points.map((p) => clamp(size - drawerSnapVisible(p, viewport), 0, Math.max(0, size)))
}

/** Index of the snap point equal to `value` (by identity, then by resolved size), or -1. */
export function drawerSnapIndex(points: readonly DrawerSnapPoint[] | undefined, value: DrawerSnapPoint | null | undefined, viewport = 1000): number {
  if (!points || points.length === 0 || value === null || value === undefined) return -1
  const i = points.indexOf(value)
  if (i >= 0) return i
  const v = drawerSnapVisible(value, viewport)
  return points.findIndex((p) => Math.abs(drawerSnapVisible(p, viewport) - v) < 0.5)
}

/** iOS-style rubber band: `over` px of pull past a limit moves `result` px (pure, < dim). */
export function drawerRubberBand(over: number, dimension: number, c: number = DRAWER_PHYSICS.rubber): number {
  if (over <= 0) return 0
  const d = Math.max(1, dimension)
  return (1 - 1 / ((over * c) / d + 1)) * d
}

export interface DrawerDragBounds {
  /** Most-open offset (top snap point, or 0). Pulling past it rubber-bands. */
  min: number
  /** Least-open resting offset (lowest snap point, or 0). */
  max: number
  /** Panel size (px): fully hidden offset. */
  size: number
  /** false: pulling past `max` toward close rubber-bands too. */
  dismissible: boolean
  /** Rubber band dimension (px), e.g. the viewport. */
  dimension: number
}

/** The offset a raw finger offset maps to: free inside, rubber-banded past the ends (pure). */
export function drawerDragOffset(raw: number, b: DrawerDragBounds): number {
  if (raw < b.min) return b.min - drawerRubberBand(b.min - raw, b.dimension)
  if (!b.dismissible && raw > b.max) return b.max + drawerRubberBand(raw - b.max, b.dimension)
  return Math.min(raw, b.size)
}

// ---- velocity -------------------------------------------------------------------------------

/** Ring of recent (time s, position px) samples. */
export interface DrawerVelocityTracker {
  t: number[]
  x: number[]
}

export const createDrawerVelocityTracker = (): DrawerVelocityTracker => ({ t: [], x: [] })

export function drawerTrack(tr: DrawerVelocityTracker, time: number, pos: number): void {
  tr.t.push(time)
  tr.x.push(pos)
  // Keep a little more than the window.
  while (tr.t.length > 2 && time - tr.t[0]! > DRAWER_PHYSICS.velocityWindow * 3) {
    tr.t.shift()
    tr.x.shift()
  }
}

/** Velocity (px/s) over the last `window` s before `now` (0 with too few samples). */
export function drawerVelocity(tr: DrawerVelocityTracker, now: number, window: number = DRAWER_PHYSICS.velocityWindow): number {
  const n = tr.t.length
  if (n < 2) return 0
  // A finger that stopped before lifting has no velocity.
  if (now - tr.t[n - 1]! > window) return 0
  let i = n - 1
  while (i > 0 && now - tr.t[i - 1]! <= window) i--
  if (i === n - 1) i = n - 2
  const dt = tr.t[n - 1]! - tr.t[i]!
  if (dt <= 1e-4) return 0
  return (tr.x[n - 1]! - tr.x[i]!) / dt
}

// ---- release --------------------------------------------------------------------------------

export interface DrawerReleaseInput {
  /** Current offset (px). */
  offset: number
  /** Release velocity, px/s, + = toward closed. */
  velocity: number
  /** Distance dragged this gesture, px, + = toward closed. */
  dragged: number
  /** Panel size (px). */
  size: number
  /** Viewport length along the axis (px). */
  viewport: number
  /** Snap offsets in snap-point order (no snap points: [0]). */
  snaps: readonly number[]
  /** Index of the snap point the drag started from. */
  active: number
  dismissible: boolean
  /** 0..1, default DRAWER_PHYSICS.closeThreshold. */
  closeThreshold?: number
  /** Real snap points (false: `snaps` is just [0]). */
  hasSnapPoints: boolean
}

export type DrawerReleaseTarget = { kind: 'close' } | { kind: 'snap'; index: number }

/** Where a released drag goes (pure). */
export function drawerReleaseTarget(i: DrawerReleaseInput): DrawerReleaseTarget {
  const P = DRAWER_PHYSICS
  const threshold = clamp(i.closeThreshold ?? P.closeThreshold, 0, 1)
  const v = i.velocity
  if (!i.hasSnapPoints) {
    if (!i.dismissible) return { kind: 'snap', index: 0 }
    // A flick toward close, or dragged far enough (vaul: closeThreshold of the panel).
    if (v > P.velocity && i.offset > 0) return { kind: 'close' }
    if (v < -P.velocity) return { kind: 'snap', index: 0 }
    if (i.offset >= i.size * threshold) return { kind: 'close' }
    return { kind: 'snap', index: 0 }
  }
  const n = i.snaps.length
  const last = n - 1
  const active = clamp(Math.round(i.active), 0, last)
  if (v > P.fling) return i.dismissible ? { kind: 'close' } : { kind: 'snap', index: 0 }
  if (v < -P.fling) return { kind: 'snap', index: last }
  if (Math.abs(v) > P.velocity && Math.abs(i.dragged) < i.viewport * P.flickDistance) {
    if (v < 0) return { kind: 'snap', index: Math.min(last, active + 1) }
    if (active === 0) return i.dismissible ? { kind: 'close' } : { kind: 'snap', index: 0 }
    return { kind: 'snap', index: active - 1 }
  }
  // Slow release: dragged well below the lowest snap point closes; else the closest one.
  const low = i.snaps[0]!
  if (i.dismissible && i.offset > low + Math.max(8, (i.size - low) * threshold)) return { kind: 'close' }
  let best = 0
  for (let k = 1; k < n; k++) if (Math.abs(i.snaps[k]! - i.offset) < Math.abs(i.snaps[best]! - i.offset)) best = k
  return { kind: 'snap', index: best }
}

// ---- spring ---------------------------------------------------------------------------------

/** 1-D spring state: position (px) and velocity (px/s). */
export interface DrawerSpring {
  x: number
  v: number
}

const SUB = 1 / 240

/** Advance `s` toward `target` by dt s (mutates). Returns true once at rest (snapped onto it). */
export function stepDrawerSpring(s: DrawerSpring, target: number, dt: number, feel: { period: number; damping: number }): boolean {
  const w = (2 * Math.PI) / Math.max(0.02, feel.period)
  let left = Math.max(0, dt)
  while (left > 1e-6) {
    const h = Math.min(SUB, left)
    left -= h
    s.v += (w * w * (target - s.x) - 2 * feel.damping * w * s.v) * h
    s.x += s.v * h
  }
  if (Math.abs(target - s.x) < DRAWER_PHYSICS.restDistance && Math.abs(s.v) < DRAWER_PHYSICS.restSpeed) {
    s.x = target
    s.v = 0
    return true
  }
  return false
}

/** Overlay opacity 0..1 at `offset` (pure). Without snap points it fades over the whole
 *  travel; with them it is full from snap `fadeFrom` up and fades out toward the snap below
 *  (vaul's `fadeFromIndex`, default the last snap point). */
export function drawerFade(offset: number, size: number, snaps: readonly number[], hasSnapPoints: boolean, fadeFrom?: number): number {
  if (size <= 0) return 0
  if (!hasSnapPoints) return clamp(1 - offset / size, 0, 1)
  const n = snaps.length
  const f = clamp(Math.round(fadeFrom ?? n - 1), 0, n - 1)
  const full = snaps[f]!
  const none = f === 0 ? size : snaps[f - 1]!
  if (none - full <= 0.5) return offset <= full ? 1 : 0
  return clamp((none - offset) / (none - full), 0, 1)
}

// ---- motion ---------------------------------------------------------------------------------

/** Per-preset panel motion (s, px). Durations scale with `speed` (the caller's dt). */
export interface DrawerMotionFeel {
  /** Open / snap travel time (s) for ~450 px from rest (shorter moves are a bit quicker). */
  travel: number
  /** Close time (s) from rest over ~450 px (constant acceleration). */
  close: number
  /** Landing overshoot: share of the travel, capped at `overshootMax` px. */
  overshoot: number
  overshootMax: number
  /** Landing spring period (s): the reference stiffness, and the whole move when it is short. */
  landing: number
  /** Landing damping ratio: one quick, damped rebound. */
  damping: number
  /** Impact speed as a share of the move's mean speed (how much speed it keeps into the landing). */
  impact: number
}

export const DRAWER_MOTION: Readonly<Record<GoopPreset, Readonly<DrawerMotionFeel>>> = Object.freeze({
  subtle: Object.freeze({ travel: 0.3, close: 0.34, overshoot: 0.025, overshootMax: 10, landing: 0.26, damping: 0.62, impact: 0.8 }),
  playful: Object.freeze({ travel: 0.32, close: 0.36, overshoot: 0.04, overshootMax: 18, landing: 0.28, damping: 0.52, impact: 0.95 }),
  wild: Object.freeze({ travel: 0.34, close: 0.38, overshoot: 0.055, overshootMax: 26, landing: 0.3, damping: 0.44, impact: 1.05 }),
})

export type DrawerMoveKind = 'land' | 'fall' | 'ease'

/** A planned panel move (offsets px, + = toward closed; times s). */
export interface DrawerMove {
  kind: DrawerMoveKind
  from: number
  to: number
  /** Elapsed time (s). */
  t: number
  /** land: travel phase; fall / ease: the whole move. */
  duration: number
  /** land travel phase: normalized start / impact speeds and the launch bump. ease: m0 = 1 eases in. */
  m0: number
  m1: number
  c: number
  /** land landing phase: spring around `to` (rad/s, ratio), start displacement (px) and velocity (px/s). */
  w: number
  zeta: number
  y0: number
  u0: number
  /** fall: start velocity and acceleration (px/s, px/s^2, signed). */
  v0: number
  accel: number
}

export interface DrawerMoveInput {
  from: number
  to: number
  /** Current velocity (px/s, + = toward closed): a release carries on from it. */
  velocity: number
  /** 'land' (open, snap) or 'fall' (close). */
  kind: 'land' | 'fall'
  feel?: Readonly<DrawerMotionFeel>
  reduced?: boolean
  /** Most the landing may overshoot past `to` (px), e.g. so a plain panel never lifts off its edge. */
  overshootLimit?: number
}

/** Launch skew of the travel phase (higher: more of the speed comes early). */
const LAUNCH = 2
/** Moves shorter than this (px) are all landing: a spring from the current state. */
const SHORT = 24

/** Peak overshoot per unit impact speed (times w) of a damped spring started at its rest point. */
export function drawerOvershootRatio(zeta: number): number {
  const z = clamp(zeta, 0.05, 0.98)
  const r = Math.sqrt(1 - z * z)
  return Math.exp((-z / r) * Math.atan2(r, z))
}

/** Plan a panel move (pure). null: already there and still. */
export function planDrawerMove(i: DrawerMoveInput): DrawerMove | null {
  const P = DRAWER_PHYSICS
  const f = i.feel ?? DRAWER_MOTION.playful
  const d = i.to - i.from
  const dist = Math.abs(d)
  const v = Number.isFinite(i.velocity) ? i.velocity : 0
  if (dist < P.restDistance && Math.abs(v) < P.restSpeed) return null
  const base: DrawerMove = { kind: 'ease', from: i.from, to: i.to, t: 0, duration: 0, m0: 0, m1: 0, c: 0, w: 0, zeta: 1, y0: 0, u0: 0, v0: 0, accel: 0 }
  if (i.reduced) return { ...base, duration: P.still, m0: i.kind === 'fall' ? 1 : 0 }
  const sign = d < 0 ? -1 : 1
  const along = v * sign
  const scale = clamp(Math.sqrt(dist / 450), 0.55, 1.25)
  if (i.kind === 'fall') {
    const tc = f.close * scale
    const a = (2 * Math.max(dist, 1)) / (tc * tc)
    const duration = (-along + Math.sqrt(along * along + 2 * a * dist)) / a
    return { ...base, kind: 'fall', duration: Math.max(1e-3, duration), v0: v, accel: a * sign }
  }
  const zeta = clamp(f.damping, 0.1, 0.95)
  const wRef = (2 * Math.PI) / Math.max(0.05, f.landing)
  if (dist < SHORT) return { ...base, kind: 'land', w: wRef, zeta, y0: i.from - i.to, u0: v }
  let ta = f.travel * scale
  if (along > 0) ta = Math.min(ta, (1.6 * dist) / along)
  ta = Math.max(0.08, ta)
  const ratio = drawerOvershootRatio(zeta)
  const over = Math.max(0, Math.min(f.overshoot * dist, f.overshootMax, i.overshootLimit ?? Infinity))
  let w = wRef
  let vi = 0
  if (over > 0.5) {
    // Hit the target at a good share of the mean speed; the landing stiffness is picked so
    // that speed overshoots by `over` (within sane bounds).
    vi = f.impact * (dist / ta)
    w = clamp((vi * ratio) / over, wRef / 1.6, wRef / 0.45)
    vi = (over * w) / ratio
  }
  const m0 = clamp((along * ta) / dist, -1, 2.5)
  const m1 = clamp((vi * ta) / dist, 0, 1.4)
  const c = (1 - (m0 + m1) / 2) / (1 / 6 + LAUNCH / 12)
  return { ...base, kind: 'land', duration: ta, m0, m1, c, w, zeta, u0: (m1 * d) / ta }
}

/** Position (px) and velocity (px/s) of a move at time t (pure). */
export function sampleDrawerMove(m: DrawerMove, t: number): { x: number; v: number; done: boolean } {
  const P = DRAWER_PHYSICS
  const d = m.to - m.from
  if (m.kind === 'ease') {
    const s = clamp(t / Math.max(1e-3, m.duration), 0, 1)
    const e = m.m0 === 1 ? s * s : 1 - (1 - s) ** 3
    const de = m.m0 === 1 ? 2 * s : 3 * (1 - s) ** 2
    return { x: m.from + d * e, v: s >= 1 ? 0 : (d * de) / m.duration, done: s >= 1 }
  }
  if (m.kind === 'fall') {
    const tt = Math.min(t, m.duration)
    if (t >= m.duration) return { x: m.to, v: m.v0 + m.accel * tt, done: true }
    return { x: m.from + m.v0 * tt + 0.5 * m.accel * tt * tt, v: m.v0 + m.accel * tt, done: false }
  }
  if (t < m.duration) {
    const s = t / m.duration
    const b = LAUNCH
    const s2 = s * s
    const s3 = s2 * s
    const p = m.m0 * s + ((m.m1 - m.m0) * s2) / 2 + m.c * (s2 / 2 - s3 / 3 + b * (s2 / 2 - (2 * s3) / 3 + (s2 * s2) / 4))
    const dp = m.m0 + (m.m1 - m.m0) * s + m.c * s * (1 - s) * (1 + b * (1 - s))
    return { x: m.from + d * p, v: (d * dp) / m.duration, done: false }
  }
  // Landing: an underdamped spring around the target, hit at the travel's end speed.
  const tau = t - m.duration
  const z = m.zeta
  const wd = m.w * Math.sqrt(1 - z * z)
  const A = m.y0
  const B = (m.u0 + z * m.w * A) / wd
  const env = Math.exp(-z * m.w * tau)
  const cs = Math.cos(wd * tau)
  const sn = Math.sin(wd * tau)
  const y = env * (A * cs + B * sn)
  const v = env * (-z * m.w * (A * cs + B * sn) + wd * (B * cs - A * sn))
  const done = env * Math.hypot(A, B) < P.restDistance && Math.abs(v) < P.restSpeed
  return { x: done ? m.to : m.to + y, v: done ? 0 : v, done }
}

/** Advance a move by dt s and write it into `s` (mutates both). Returns true once it is done. */
export function stepDrawerMove(m: DrawerMove, s: DrawerSpring, dt: number): boolean {
  m.t += Math.max(0, dt)
  const r = sampleDrawerMove(m, m.t)
  s.x = r.x
  s.v = r.v
  return r.done
}

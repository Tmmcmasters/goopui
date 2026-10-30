// Drawer: a draggable panel whose background IS a live goo surface (GoopDrawer).
//
// This module owns the whole drawer motion. One ticker, every frame:
//   1. the panel's offset (drawer-physics.ts): the finger while dragging (rubber-banded past
//      full open, and past the lowest snap point when not dismissible), else a spring toward
//      the active snap point / fully open / closed;
//   2. writes the panel transform, the overlay's opacity and the background scale;
//   3. steps and draws the goo from that SAME offset, so panel and goo cannot come apart.
//
// Goo (all toggleable, 0..2 strengths):
//   lag      the leading edge trails fast moves: a fast pull in stretches it out behind the
//            panel, a fast push out dips it in.
//   slosh    when motion stops (release, snap, landing) the edge keeps going, overshoots and
//            wobbles out (an underdamped string of springs).
//   rise     opening lands with an extra jelly overshoot of the edge.
//   stretch  dragging past full open pulls a globby bump out toward the finger.
//   handle   the drag handle is a small goo blob: swells on press, stretches along the drag
//            and trails a droplet that snaps back.
//   splash   a fling-dismiss tears a spray of drops (big globs, drops, specks, like the bloom
//            splash) off the leading edge; they fly, fall and fade on a page overlay.
//
// Geometry: the renderer's body is the panel, inset by one column radius on the leading side;
// a row of overlapping circles fills that band, each riding its own spring, so the edge can
// bulge out AND dip in. The body extends past the trailing side when the panel is pulled off
// its screen edge (over-drag past open), so no gap opens behind it.
//
// Pure: `DRAWER_FEEL`, `drawerEdgeShape`, `createDrawerEdge`, `drawerEdgeTargets`,
// `stepDrawerEdge`, `drawerEdgeSettled`, `drawerEdgeCircles`, `drawerBodyPose`,
// `drawerHandlePose`, `drawerSplashDrops`, `drawerTransform`, `drawerBackgroundScale`.
// DOM: `createDrawer`. Nothing touches `document`/`window` until then.

import { GOOP_PHYSICS, type GoopPreset } from './constants'
import {
  DRAWER_PHYSICS,
  createDrawerVelocityTracker,
  drawerDragOffset,
  drawerFade,
  drawerReleaseTarget,
  drawerSnapIndex,
  drawerSnapOffsets,
  drawerTrack,
  drawerVelocity,
  stepDrawerSpring,
  type DrawerSnapPoint,
  type DrawerSpring,
  type DrawerVelocityTracker,
} from './drawer-physics'
import { EMERGE_MOMENTUM, emergeMomentumStrength } from './emerge-momentum'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopBodyTransform, GoopRenderer } from './renderer'
import { acquireGoopOverlay, type GoopOverlay } from './renderers/overlay'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'

/** vaul's `direction`: the screen edge the drawer is attached to. */
export type DrawerDirection = 'top' | 'bottom' | 'left' | 'right'

/** Per-preset feel. Lengths in px, times in s. */
export interface DrawerFeel {
  /** Sim column spacing along the edge. */
  spacing: number
  /** Edge band depth = column circle radius. */
  radius: number
  /** Edge offset per px/s of edge velocity (lag). */
  lag: number
  /** Max outward edge offset. */
  bulge: number
  /** Max inward edge offset (keep under `radius`). */
  dip: number
  /** Edge spring period. */
  response: number
  /** Edge damping ratio with slosh on (off: critically damped). */
  damping: number
  /** Neighbour tension, 0..1 (higher: the edge moves more as one sheet). */
  coupling: number
  /** Max reach of the stretch bump toward the finger. */
  reach: number
  /** Stretch bump half-width (Gaussian sigma). */
  reachWidth: number
  /** Edge velocity kick (px/s) when an open lands. */
  rise: number
  /** Fraction of the stopping speed handed to the edge as slosh. */
  settle: number
  /** Handle scale while pressed. */
  handleSwell: number
  /** Handle elongation per 1000 px/s of drag. */
  handleStretch: number
  /** Drops a fling-dismiss splash sheds (at full strength and a firm fling). */
  splash: number
  /** Splash size unit (px): a mid drop's radius; lead globs / specks scale it. */
  splashSize: number
  /** Splash launch speed (px/s) off the edge. */
  splashLaunch: number
  /** Goo blur. */
  softness: number
}

export const DRAWER_FEEL: Readonly<Record<GoopPreset, Readonly<DrawerFeel>>> = Object.freeze({
  subtle: Object.freeze({
    spacing: 30, radius: 14, lag: 0.016, bulge: 22, dip: 7, response: 0.34, damping: 0.42, coupling: 0.3,
    reach: 26, reachWidth: 70, rise: 170, settle: 0.18, handleSwell: 1.1, handleStretch: 0.22,
    splash: 9, splashSize: 5, splashLaunch: 380, softness: 6,
  }),
  playful: Object.freeze({
    spacing: 28, radius: 16, lag: 0.028, bulge: 38, dip: 10, response: 0.4, damping: 0.26, coupling: 0.34,
    reach: 46, reachWidth: 85, rise: 300, settle: 0.26, handleSwell: 1.18, handleStretch: 0.4,
    splash: 18, splashSize: 6.5, splashLaunch: 520, softness: 7,
  }),
  wild: Object.freeze({
    spacing: 26, radius: 18, lag: 0.042, bulge: 60, dip: 13, response: 0.48, damping: 0.16, coupling: 0.38,
    reach: 72, reachWidth: 100, rise: 460, settle: 0.34, handleSwell: 1.28, handleStretch: 0.6,
    splash: 28, splashSize: 8, splashLaunch: 680, softness: 8,
  }),
})

/** Effect toggles: `true` (1) / `false` (0) or a 0..2 strength. All default true. */
export interface DrawerEffects {
  /** The leading edge trails behind fast motion (drags, flicks, open, close). */
  lag?: boolean | number
  /** The edge overshoots and wobbles when motion stops (release, snap points, landing). */
  slosh?: boolean | number
  /** Opening lands with an extra jelly overshoot of the edge. */
  rise?: boolean | number
  /** Dragging past full open pulls a globby bump toward the finger. */
  stretch?: boolean | number
  /** The drag handle is a goo blob: swells, stretches along the drag, trails a droplet. */
  handle?: boolean | number
  /** Fling-dismiss: a splash of drops tears off the leading edge, flies, falls and fades. */
  splash?: boolean | number
}
export const DRAWER_EFFECTS = ['lag', 'slosh', 'rise', 'stretch', 'handle', 'splash'] as const satisfies readonly (keyof DrawerEffects)[]
export type DrawerEffect = (typeof DRAWER_EFFECTS)[number]

/** Goo filter for a drawer. */
export function drawerGooParams(preset: GoopPreset = 'playful'): GooFilterParams {
  return { blur: DRAWER_FEEL[preset].softness, contrast: 20, threshold: 0.45 }
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
function rand(seed: number, a: number): number {
  const s = Math.sin(seed * 127.1 + a * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ---- edge sim (pure) ------------------------------------------------------------------------

/** A string of sprung columns along the leading edge. `d` > 0 is outward (px). */
export interface DrawerEdge {
  d: number[]
  v: number[]
  /** Per-column stiffness factor (varied so the edge ripples instead of moving as a slab). */
  k: number[]
}

/** Columns for an edge `length` px long. */
export function drawerEdgeCount(length: number, feel: Readonly<DrawerFeel>): number {
  return clamp(Math.ceil(length / feel.spacing) + 1, 4, 64)
}

/** Edge profile 0..1 for column i of n: the middle swings most, the corners are held. */
export function drawerEdgeShape(i: number, n: number): number {
  if (n <= 1) return 1
  return 0.3 + 0.7 * Math.sin((Math.PI * (i + 0.5)) / n)
}

export function createDrawerEdge(n: number, seed = 0): DrawerEdge {
  return {
    d: Array.from({ length: n }, () => 0),
    v: Array.from({ length: n }, () => 0),
    k: Array.from({ length: n }, (_, i) => 0.82 + 0.36 * rand(seed + 1, i)),
  }
}

export interface DrawerEdgeInput {
  /** Leading edge velocity, px/s, positive = outward (toward the screen center). */
  velocity: number
  /** Lag strength 0..2. */
  lag: number
  /** Stretch strength 0..2. */
  stretch: number
  /** Edge length (px). */
  length: number
  /** Finger beyond the edge: position along the edge and distance past it (px, > 0 = out). */
  pointer?: { u: number; beyond: number } | null
}

/** Rest offsets the edge springs pull toward this frame (pure). */
export function drawerEdgeTargets(n: number, input: DrawerEdgeInput, feel: Readonly<DrawerFeel>): number[] {
  const lagOff = clamp(-input.velocity * feel.lag * input.lag, -feel.dip, feel.bulge * Math.max(1, input.lag))
  const p = input.pointer
  const reach = p && p.beyond > 0 && input.stretch > 0 ? Math.min(feel.reach * input.stretch, p.beyond * 0.65) : 0
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const u = n <= 1 ? input.length / 2 : (i / (n - 1)) * input.length
    let t = lagOff * drawerEdgeShape(i, n)
    if (reach > 0 && p) {
      const g = (u - p.u) / feel.reachWidth
      t += reach * Math.exp(-0.5 * g * g)
    }
    out.push(clamp(t, -feel.dip, feel.bulge * 1.6))
  }
  return out
}

const SUB_DT = 1 / 240

/** Advance the edge by dt s toward `targets` (mutates). `slosh` 0..2: 0 = critically damped. */
export function stepDrawerEdge(edge: DrawerEdge, targets: readonly number[], feel: Readonly<DrawerFeel>, dt: number, slosh = 1): void {
  if (!(dt > 0)) return
  const n = edge.d.length
  const w = (2 * Math.PI) / feel.response
  const w2 = w * w
  const s = clamp(slosh, 0, 2)
  // Strength 1 = feel.damping; 0 = critical; 2 = half again as bouncy.
  const zeta = s <= 1 ? 1 + (feel.damping - 1) * s : feel.damping * (1 - 0.4 * (s - 1))
  const coup = feel.coupling * 6
  const lo = -feel.dip
  const hi = feel.bulge * 1.8
  let left = dt
  while (left > 1e-6) {
    const h = Math.min(SUB_DT, left)
    left -= h
    for (let i = 0; i < n; i++) {
      const kf = edge.k[i] ?? 1
      const d = edge.d[i]!
      const prev = edge.d[i - 1] ?? d
      const next = edge.d[i + 1] ?? d
      const a = w2 * kf * ((targets[i] ?? 0) - d) - 2 * zeta * w * Math.sqrt(kf) * edge.v[i]! + coup * w2 * 0.1 * (prev + next - 2 * d)
      edge.v[i] = edge.v[i]! + a * h
    }
    for (let i = 0; i < n; i++) {
      let d = edge.d[i]! + edge.v[i]! * h
      if (d < lo) {
        d = lo
        if (edge.v[i]! < 0) edge.v[i] = edge.v[i]! * -0.2
      } else if (d > hi) {
        d = hi
        if (edge.v[i]! > 0) edge.v[i] = 0
      }
      edge.d[i] = d
    }
  }
}

/** Kick every column outward by `speed` px/s (shaped). */
export function kickDrawerEdge(edge: DrawerEdge, speed: number): void {
  const n = edge.d.length
  for (let i = 0; i < n; i++) edge.v[i] = edge.v[i]! + speed * drawerEdgeShape(i, n)
}

export function drawerEdgeSettled(edge: DrawerEdge, targets: readonly number[], eps = 0.15): boolean {
  for (let i = 0; i < edge.d.length; i++) {
    if (Math.abs(edge.d[i]! - (targets[i] ?? 0)) > eps || Math.abs(edge.v[i]!) > eps * 4) return false
  }
  return true
}

/** Interpolated edge offset at fraction f (0..1) along the edge. */
export function drawerEdgeAt(edge: DrawerEdge, f: number): number {
  const n = edge.d.length
  if (n === 0) return 0
  if (n === 1) return edge.d[0]!
  const x = clamp(f, 0, 1) * (n - 1)
  const i = Math.min(n - 2, Math.floor(x))
  const t = x - i
  const s = t * t * (3 - 2 * t)
  return edge.d[i]! + (edge.d[i + 1]! - edge.d[i]!) * s
}

/** Circle in the host's border-box space. */
export interface DrawerCircle {
  x: number
  y: number
  r: number
}

const isVertical = (dir: DrawerDirection): boolean => dir === 'top' || dir === 'bottom'

/** Render circles count for an edge `length` long with radius r (overlapping enough to be smooth). */
export function drawerCircleCount(length: number, r: number): number {
  return clamp(Math.ceil(Math.max(0, length - 2 * r) / (r * 0.7)) + 1, 2, 160)
}

/**
 * The edge band circles for a W x H panel attached at `dir` (pure). Circle i sits one radius
 * in from the leading edge, pushed out by the edge's offset there; a big outward bulge also
 * gets filler circles down to the body so it stays one solid lobe.
 */
export function drawerEdgeCircles(edge: DrawerEdge, dir: DrawerDirection, W: number, H: number, r: number, count?: number): DrawerCircle[] {
  const L = isVertical(dir) ? W : H
  const m = count ?? drawerCircleCount(L, r)
  const out: DrawerCircle[] = []
  for (let i = 0; i < m; i++) {
    const f = m <= 1 ? 0.5 : i / (m - 1)
    const u = r + f * Math.max(0, L - 2 * r)
    const d = drawerEdgeAt(edge, f)
    // A big bulge would leave a gap between its circle and the body: fill the column.
    const fill = d > r * 0.6 ? Math.ceil(d / (r * 1.1)) : 0
    for (let j = 0; j <= fill; j++) {
      const dj = (d * (fill + 1 - j)) / (fill + 1)
      if (dir === 'bottom') out.push({ x: u, y: r - dj, r })
      else if (dir === 'top') out.push({ x: u, y: H - r + dj, r })
      else if (dir === 'left') out.push({ x: W - r + dj, y: u, r })
      else out.push({ x: r - dj, y: u, r })
    }
  }
  return out
}

/**
 * Body pose for the panel: inset by `inset` on the leading side (the edge circles fill it)
 * and extended by `extend` past the trailing side.
 */
export function drawerBodyPose(dir: DrawerDirection, W: number, H: number, inset: number, extend = 0): GoopBodyTransform {
  const e = Math.max(0, extend)
  if (W <= 0 || H <= 0) return { tx: 0, ty: 0, skew: 0, sx: 0, sy: 0 }
  if (dir === 'bottom') return { tx: 0, ty: (inset + e) / 2, skew: 0, sx: 1, sy: (H - inset + e) / H }
  if (dir === 'top') return { tx: 0, ty: -(inset + e) / 2, skew: 0, sx: 1, sy: (H - inset + e) / H }
  if (dir === 'left') return { tx: -(inset + e) / 2, ty: 0, skew: 0, sx: (W - inset + e) / W, sy: 1 }
  return { tx: (inset + e) / 2, ty: 0, skew: 0, sx: (W - inset + e) / W, sy: 1 }
}

// ---- handle (pure) --------------------------------------------------------------------------

/** Handle sim: a swell spring, an elongation spring and a trailing droplet. */
export interface DrawerHandleState {
  swell: { x: number; v: number }
  stretch: { x: number; v: number }
  /** Droplet offset along the drag axis (px, + = outward). */
  drop: { x: number; v: number }
}

export const createDrawerHandleState = (): DrawerHandleState => ({
  swell: { x: 1, v: 0 },
  stretch: { x: 0, v: 0 },
  drop: { x: 0, v: 0 },
})

const springTo = (s: { x: number; v: number }, target: number, period: number, zeta: number, dt: number): void => {
  const w = (2 * Math.PI) / period
  let left = dt
  while (left > 1e-6) {
    const h = Math.min(SUB_DT, left)
    left -= h
    s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * h
    s.x += s.v * h
  }
}

/** Advance the handle (mutates). `velocity`: edge velocity px/s (+ out). */
export function stepDrawerHandle(st: DrawerHandleState, pressed: boolean, velocity: number, feel: Readonly<DrawerFeel>, k: number, dt: number): void {
  const swell = pressed ? 1 + (feel.handleSwell - 1) * k : 1
  springTo(st.swell, swell, 0.3, 0.3, dt)
  const elong = clamp((Math.abs(velocity) / 1000) * feel.handleStretch * k, 0, 0.9)
  springTo(st.stretch, elong, 0.26, 0.35, dt)
  // The droplet lags the motion: moving out leaves it behind (inward), then it snaps back.
  const lagPx = clamp(-velocity * 0.012 * k, -14 * k, 14 * k)
  springTo(st.drop, lagPx, 0.32, 0.22, dt)
}

export interface DrawerHandlePose {
  /** Body scale along the edge (sx for top/bottom) and along the drag axis. */
  along: number
  across: number
  /** Droplet offset along the drag axis (px, + = outward) and radius (0 = hidden). */
  drop: number
  dropR: number
}

/** Handle pose from its state (pure). `thick`: the handle's thickness (px). */
export function drawerHandlePose(st: DrawerHandleState, thick: number): DrawerHandlePose {
  const s = Math.max(0, st.swell.x)
  const e = Math.max(-0.3, st.stretch.x)
  const show = Math.abs(st.drop.x) > 1.5
  return {
    along: s / (1 + e * 0.35),
    across: s * (1 + e),
    drop: st.drop.x,
    dropR: show ? thick * 0.6 * s * clamp(Math.abs(st.drop.x) / 6, 0.4, 1) : 0,
  }
}

export function drawerHandleSettled(st: DrawerHandleState): boolean {
  const ok = (s: { x: number; v: number }, t: number) => Math.abs(s.x - t) < 0.004 && Math.abs(s.v) < 0.02
  return ok(st.swell, 1) && Math.abs(st.stretch.x) < 0.004 && Math.abs(st.stretch.v) < 0.02 && Math.abs(st.drop.x) < 0.1 && Math.abs(st.drop.v) < 0.4
}


// ---- panel pose (pure) ----------------------------------------------------------------------

/** Unit vector pointing OUT of the panel's leading edge (toward the screen centre). */
export function drawerOutward(dir: DrawerDirection): { x: number; y: number } {
  return dir === 'bottom' ? { x: 0, y: -1 } : dir === 'top' ? { x: 0, y: 1 } : dir === 'left' ? { x: 1, y: 0 } : { x: -1, y: 0 }
}

/** NESTED: a parent drawer shrinks back this far (px of the viewport) when a child opens. */
export const DRAWER_NESTED_DISPLACEMENT = 16
/** Background scale: the wrapper shrinks by this many px of the viewport width (vaul). */
export const DRAWER_WINDOW_TOP_OFFSET = 26
export const DRAWER_BORDER_RADIUS = 8

/**
 * CSS transform for the panel at `offset` (px toward closed) attached at `dir` (pure).
 * `nested` 0..1: a child drawer is open on top (the panel recedes like vaul's nested drawers).
 */
export function drawerTransform(dir: DrawerDirection, offset: number, nested = 0, viewport = 1000): string {
  const n = clamp(nested, 0, 1)
  const o = Math.round((offset - DRAWER_NESTED_DISPLACEMENT * n) * 100) / 100
  const s = drawerOutward(dir)
  const tx = -s.x * o
  const ty = -s.y * o
  const t = `translate3d(${tx === 0 ? 0 : tx}px, ${ty === 0 ? 0 : ty}px, 0)`
  if (n <= 0) return t
  const v = Math.max(1, viewport)
  const sc = 1 - (n * DRAWER_NESTED_DISPLACEMENT) / v
  return `${t} scale(${Math.round(sc * 10000) / 10000})`
}

/** The page wrapper's style at background-scale progress `t` 0..1 (pure; vaul's look). */
export function drawerBackgroundScale(dir: DrawerDirection, t: number, viewportWidth: number): { transform: string; borderRadius: string; transformOrigin: string } {
  const k = clamp(t, 0, 1)
  const s = 1 - (k * DRAWER_WINDOW_TOP_OFFSET) / Math.max(1, viewportWidth)
  const d = Math.round(k * 14 * 100) / 100
  const vertical = dir === 'top' || dir === 'bottom'
  return {
    transform: `scale(${Math.round(s * 10000) / 10000}) translate3d(${vertical ? 0 : d}px, ${vertical ? d : 0}px, 0)`,
    borderRadius: `${Math.round(k * DRAWER_BORDER_RADIUS * 100) / 100}px`,
    transformOrigin: vertical ? 'top' : 'left',
  }
}

// ---- splash (pure) --------------------------------------------------------------------------

/** One splash drop's launch (viewport px, px/s, s). */
export interface DrawerSplashDrop {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  /** Seconds after the fling it lets go of the edge (it necks out until then). */
  delay: number
  /** Flight + fade time after letting go. */
  life: number
}

export interface DrawerSplashInput {
  dir: DrawerDirection
  /** The panel's viewport rect at release. */
  rect: { left: number; top: number; width: number; height: number }
  /** Fling speed (px/s, toward closed). */
  speed: number
  /** Splash strength 0..2. */
  strength: number
  seed?: number
  /** Leading edge offsets (px, + out) to start drops at the bulges. */
  edge?: readonly number[]
}

/**
 * The fling-dismiss splash (pure): lead globs, mid drops and specks (the button hit-spray
 * classes) tear off the leading edge in a fanned cone, outward, carrying some of the panel's
 * own speed; they then fly, fall (screen-down gravity) and shrink away (`DrawerSplashDrop.life`).
 */
export function drawerSplashDrops(input: DrawerSplashInput, feel: Readonly<DrawerFeel> = DRAWER_FEEL.playful): DrawerSplashDrop[] {
  const k = clamp(input.strength, 0, 2)
  if (k <= 0 || input.speed <= 0) return []
  const D = EMERGE_MOMENTUM.drips
  const G = GOOP_PHYSICS
  const seed = input.seed ?? 0
  const { dir, rect } = input
  const vertical = dir === 'top' || dir === 'bottom'
  const L = vertical ? rect.width : rect.height
  const firm = clamp(input.speed / 1500, 0.6, 1.6)
  const n = clamp(Math.round(feel.splash * (0.5 + 0.5 * k) * firm * clamp(L / 420, 0.6, 1.5)), 1, 48)
  const out = drawerOutward(dir)
  // Leading edge in viewport space.
  const edgeAt = (u: number, lift: number): { x: number; y: number } => {
    if (dir === 'bottom') return { x: rect.left + u, y: rect.top - lift }
    if (dir === 'top') return { x: rect.left + u, y: rect.top + rect.height + lift }
    if (dir === 'left') return { x: rect.left + rect.width + lift, y: rect.top + u }
    return { x: rect.left - lift, y: rect.top + u }
  }
  const sizes = [G.eruptLeadSize / G.eruptMidSize, 1, G.eruptSpeckSize / G.eruptMidSize]
  const speeds = [G.eruptLeadSpeed / G.eruptMidSpeed, 1, G.eruptSpeckSpeed / G.eruptMidSpeed]
  const leads = Math.max(1, Math.round(n * D.leads * 1.3))
  const mids = Math.round(n * D.mids)
  const edge = input.edge ?? []
  const base = Math.atan2(out.y, out.x)
  const drops: DrawerSplashDrop[] = []
  for (let i = 0; i < n; i++) {
    const c = i < leads ? 0 : i < leads + mids ? 1 : 2
    // Spread along the edge, jittered, kept off the very corners.
    const f = clamp((i + 0.5) / n + (rand(seed, i * 3 + 1) - 0.5) / n, 0.04, 0.96)
    const order = rand(seed + 11, i)
    const u = L * (0.06 + 0.88 * ((f + order * 0.15) % 1))
    const fi = u / Math.max(1, L)
    let lift = 0
    if (edge.length > 1) {
      const x = fi * (edge.length - 1)
      const a = Math.floor(x)
      lift = Math.max(0, edge[a] ?? 0) * 0.6
    }
    const p = edgeAt(u, lift)
    // Cone per class, fanned outward toward the ends of the edge.
    const ang = base + (rand(seed + 5, i) - 0.5) * 2 * D.cone[c]! + (fi - 0.5) * D.fan * (vertical ? 1 : -1) * (dir === 'bottom' || dir === 'left' ? 1 : -1)
    const sp = feel.splashLaunch * speeds[c]! * (0.7 + 0.6 * rand(seed + 7, i)) * (0.6 + 0.4 * k) * clamp(firm, 0.8, 1.3)
    // The panel yanks away (toward closed = -out); the drops keep a little of that.
    const carry = Math.min(input.speed, 2500) * (0.04 + 0.06 * rand(seed + 9, i))
    const r = Math.max(D.minPx, feel.splashSize * sizes[c]! * (0.75 + 0.5 * rand(seed + 13, i)) * (0.8 + 0.2 * k))
    drops.push({
      x: p.x,
      y: p.y,
      vx: Math.cos(ang) * sp - out.x * carry,
      vy: Math.sin(ang) * sp - out.y * carry,
      r,
      delay: (c === 0 ? 0.03 : 0) + rand(seed + 17, i) * 0.04,
      life: D.life[c]! * (0.85 + 0.3 * rand(seed + 19, i)),
    })
  }
  return drops
}

// ---- DOM ------------------------------------------------------------------------------------

export interface DrawerOptions extends DrawerEffects {
  /** Draw the panel's background as goo. false: plain panel (the physics still drive it). Default true. */
  goo?: boolean
  /** Screen edge the drawer is attached to. Default 'bottom'. */
  direction?: DrawerDirection
  /** vaul snap points: viewport fractions or px strings, least visible first. */
  snapPoints?: readonly DrawerSnapPoint[]
  /** The snap point to rest at (default the first). Changing it while open animates there. */
  activeSnapPoint?: DrawerSnapPoint | null
  /** Snap index from which the overlay is fully shown (default the last snap point). */
  fadeFromIndex?: number
  /** false: dragging cannot close it (rubber-bands past the lowest point). Default true. */
  dismissible?: boolean
  /** 0..1 share of the panel dragged past which a slow release closes. Default 0.25. */
  closeThreshold?: number
  /** Only the handle starts a drag. Default false. */
  handleOnly?: boolean
  /** Scale the page wrapper back while open (vaul's `shouldScaleBackground`). Default false. */
  scaleBackground?: boolean
  /** With `scaleBackground`: paint <body> black behind the scaled page. Default true. */
  setBackgroundColorOnScale?: boolean
  /** The page wrapper to scale, or a selector. Default `[data-vaul-drawer-wrapper]`, then
   *  `[data-goop-drawer-wrapper]`, then `[vaul-drawer-wrapper]`. */
  wrapper?: HTMLElement | string | null
  /** Overlay element: its opacity follows the drag. */
  overlay?: HTMLElement | null
  /** The drag handle element. Default: `[data-goop-drawer-handle]` inside the panel. */
  grip?: HTMLElement | null
  /** Use this element as the goo surface instead of creating one (must be a child of the panel). */
  surface?: HTMLElement
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the panel, then 'playful'. */
  preset?: GoopPreset
  /** 'canvas' (default: a drawer is a big surface), 'svg', or a custom factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

/** What the drawer tells its adapter (vaul's emits). */
export interface DrawerEvents {
  /** Dragging: share of the panel dragged (0..1+). */
  onDrag?(percentageDragged: number): void
  /** A drag was let go: whether the drawer stays open. */
  onRelease?(open: boolean): void
  /** The user dragged / flung it closed: the adapter should set `open` to false. */
  onDismiss?(): void
  /** The resting snap point changed by a drag (index into `snapPoints`). */
  onSnap?(index: number): void
  /** An open / close animation finished. After `false` the panel may unmount. */
  onSettle?(open: boolean): void
}

export type DrawerState = 'closed' | 'opening' | 'open' | 'closing'

export interface DrawerController {
  /** Animate in to the active snap point (instant: no animation, e.g. defaultOpen). */
  open(opts?: { instant?: boolean }): void
  /** Animate out (no-op when closed / closing). */
  close(): void
  /** Animate to snap point `index` (when open). */
  snapTo(index: number): void
  update(opts?: DrawerOptions): void
  /** 0..1: how far a nested child drawer is open on top (the panel recedes; eased unless
   *  `instant`, e.g. while the child is being dragged). */
  setNested(t: number, instant?: boolean): void
  /** Re-measure and redraw now. */
  refresh(): void
  /** Kick the goo edge outward by a px/s impulse. */
  kick(speed?: number): void
  readonly state: DrawerState
  /** Current offset (px toward closed; 0 = fully open). */
  readonly offset: number
  /** Active snap index (0 without snap points). */
  readonly snapIndex: number
  readonly dragging: boolean
  readonly reducedMotion: boolean
  /** Current goo edge offsets (px, + = outward), for tests / devtools. */
  readonly edge: readonly number[]
  destroy(): void
}

/** Marker on the panel while attached; `data-goop-still` marks reduced motion. */
export const DRAWER_GOO_ATTR = 'data-goop-drawer'
export const DRAWER_HANDLE_ATTR = 'data-goop-drawer-handle'
/** Opt-out: a drag starting inside an element with this attribute never moves the drawer. */
export const DRAWER_NO_DRAG_ATTR = 'data-goop-no-drag'
/** Page wrapper markers the background scale looks for (vaul's first). */
export const DRAWER_WRAPPER_SELECTOR = '[data-vaul-drawer-wrapper], [data-goop-drawer-wrapper], [vaul-drawer-wrapper]'
/** Set on the panel while a drag is live (`data-goop-dragging`). */
export const DRAWER_DRAGGING_ATTR = 'data-goop-dragging'

const DEFAULT_SHADOW = 'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.3)) drop-shadow(0 -2px 8px rgb(0 0 0 / 0.06))'
const NO_DRAG = `input, textarea, select, [contenteditable=""], [contenteditable="true"], [data-vaul-no-drag], [${DRAWER_NO_DRAG_ATTR}]`

interface LiveDrop extends DrawerSplashDrop {
  age: number
  blob: GoopBlob
}

interface Drag {
  id: number
  /** Finger position along the axis at the start (client px). */
  p0: number
  /** Cross-axis start (to tell a sideways scroll from a drag). */
  q0: number
  off0: number
  raw: number
  active: boolean
  tracker: DrawerVelocityTracker
  x: number
  y: number
  onGrip: boolean
}

/**
 * Drive a drawer panel (`panel`: the dialog content element, CSS-positioned at its fully
 * open place against its screen edge). The panel's own background should be clear when
 * `goo` is on: the goo, colored by `--goop-color`, is its background.
 */
export function createDrawer(panel: HTMLElement, options: DrawerOptions = {}, events: DrawerEvents = {}): DrawerController {
  const doc = panel.ownerDocument
  const win = doc.defaultView
  let opts: DrawerOptions = { ...options }
  let preset = readPreset(panel, opts.preset)
  let feel = DRAWER_FEEL[preset]
  let destroyed = false
  let state: DrawerState = 'closed'

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  const dir = (): DrawerDirection => opts.direction ?? 'bottom'
  const vertical = (): boolean => dir() === 'top' || dir() === 'bottom'
  const k = (e: DrawerEffect): number => (reduced || opts.goo === false ? 0 : emergeMomentumStrength(opts[e]))
  const speed = (): number => Math.max(0.05, opts.speed ?? 1)
  const hasSnaps = (): boolean => !!opts.snapPoints && opts.snapPoints.length > 0

  const prevPanel = { transform: panel.style.transform, isolation: panel.style.isolation, touchAction: panel.style.touchAction, willChange: panel.style.willChange }
  panel.style.touchAction = 'none'
  panel.style.willChange = 'transform'
  panel.setAttribute(DRAWER_GOO_ATTR, '')

  // ---- geometry ----
  let size = 0
  let viewport = 1
  let snaps: number[] = [0]
  const measure = (): void => {
    size = vertical() ? panel.offsetHeight : panel.offsetWidth
    viewport = Math.max(1, vertical() ? (win?.innerHeight ?? doc.documentElement.clientHeight) : (win?.innerWidth ?? doc.documentElement.clientWidth))
    snaps = drawerSnapOffsets(opts.snapPoints, size, viewport)
  }
  /** Fully hidden, plus room for the goo edge to clear the screen. */
  const closedOffset = (): number => size + (opts.goo === false || reduced ? 2 : feel.radius + feel.bulge * 0.6 + feel.softness * 2)

  // ---- motion state ----
  const spring: DrawerSpring = { x: 0, v: 0 }
  let target = 0
  let snapIndex = 0
  let resting = true
  let drag: Drag | null = null
  let nested = 0
  let nestedTarget = 0
  let lastX = Number.NaN
  let vel = 0 // smoothed edge velocity, px/s (+ out)
  let peak = 0
  let opening = false
  let seed = Math.floor(Math.random() * 1000)

  const initialIndex = (): number => {
    const i = drawerSnapIndex(opts.snapPoints, opts.activeSnapPoint, viewport)
    return i >= 0 ? i : 0
  }

  // ---- goo surface ----
  let surface: HTMLElement | null = null
  let ownSurface = false
  let prevSurfaceCss = ''
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let edge = createDrawerEdge(4)
  let pad = -1
  const teardownGoo = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    renderer?.destroy()
    renderer = null
    if (surface) {
      if (ownSurface) surface.remove()
      else surface.style.cssText = prevSurfaceCss
    }
    surface = null
    panel.style.isolation = prevPanel.isolation
  }
  const buildGoo = (): void => {
    teardownGoo()
    if (opts.goo === false) return
    ownSurface = !opts.surface
    surface = opts.surface ?? doc.createElement('span')
    if (ownSurface) panel.prepend(surface)
    surface.setAttribute('data-goop', 'surface')
    surface.setAttribute('aria-hidden', 'true')
    prevSurfaceCss = surface.style.cssText
    surface.style.cssText +=
      ';position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;' +
      `filter:var(--goop-surface-shadow,${DEFAULT_SHADOW});`
    panel.style.isolation = 'isolate'
    renderer = resolveRenderer(opts.renderer ?? 'canvas')(surface, drawerGooParams(preset))
    pad = -1
  }

  // ---- handle ----
  let grip: HTMLElement | null = null
  let gripRenderer: GoopRenderer | null = null
  let gripDrop: GoopBlob | null = null
  let gripPrev: { position: string; isolation: string } | null = null
  const hs = createDrawerHandleState()
  const findGrip = (): HTMLElement | null =>
    opts.grip === undefined ? panel.querySelector<HTMLElement>(`[${DRAWER_HANDLE_ATTR}]`) : opts.grip
  const buildGrip = (): void => {
    gripDrop?.remove()
    gripDrop = null
    gripRenderer?.destroy()
    gripRenderer = null
    if (grip && gripPrev) {
      grip.style.position = gripPrev.position
      grip.style.isolation = gripPrev.isolation
      grip.removeAttribute('data-goop-grip')
    }
    gripPrev = null
    grip = findGrip()
    if (!grip || opts.goo === false || opts.handle === false) return
    gripPrev = { position: grip.style.position, isolation: grip.style.isolation }
    if (win?.getComputedStyle(grip).position === 'static') grip.style.position = 'relative'
    grip.style.isolation = 'isolate'
    grip.setAttribute('data-goop-grip', '')
    // Small surface: the SVG filter is cheap here.
    gripRenderer = resolveRenderer('svg')(grip, { blur: 3, contrast: 20, threshold: 0.45 })
    gripRenderer.setPadding({ side: 24, bottom: 24 })
    gripDrop = gripRenderer.createBlob()
  }

  // ---- background scale ----
  let wrapper: HTMLElement | null = null
  let wrapperPrev: { transform: string; borderRadius: string; transformOrigin: string; overflow: string; transition: string } | null = null
  let bodyPrev: string | null = null
  const findWrapper = (): HTMLElement | null => {
    const w = opts.wrapper
    if (w && typeof w !== 'string') return w
    try {
      return doc.querySelector<HTMLElement>(typeof w === 'string' ? w : DRAWER_WRAPPER_SELECTOR)
    } catch {
      return null
    }
  }
  const restoreBackground = (): void => {
    if (wrapper && wrapperPrev) {
      wrapper.style.transform = wrapperPrev.transform
      wrapper.style.borderRadius = wrapperPrev.borderRadius
      wrapper.style.transformOrigin = wrapperPrev.transformOrigin
      wrapper.style.overflow = wrapperPrev.overflow
      wrapper.style.transition = wrapperPrev.transition
    }
    wrapper = null
    wrapperPrev = null
    if (bodyPrev !== null) {
      if (bodyPrev) doc.body.style.background = bodyPrev
      else doc.body.style.removeProperty('background')
      bodyPrev = null
    }
  }
  const applyBackground = (t: number): void => {
    if (!opts.scaleBackground || state === 'closed') {
      restoreBackground()
      return
    }
    if (!wrapper) {
      wrapper = findWrapper()
      if (!wrapper) return
      const s = wrapper.style
      wrapperPrev = { transform: s.transform, borderRadius: s.borderRadius, transformOrigin: s.transformOrigin, overflow: s.overflow, transition: s.transition }
    }
    if (opts.setBackgroundColorOnScale !== false && bodyPrev === null) {
      bodyPrev = doc.body.style.background
      doc.body.style.background = 'black'
    }
    const st = drawerBackgroundScale(dir(), t, win?.innerWidth ?? doc.documentElement.clientWidth)
    wrapper.style.transition = 'none'
    wrapper.style.transformOrigin = st.transformOrigin
    wrapper.style.transform = st.transform
    wrapper.style.borderRadius = st.borderRadius
    wrapper.style.overflow = 'hidden'
  }

  // ---- splash (page overlay, outlives the panel) ----
  let splashOverlay: GoopOverlay | null = null
  const live: LiveDrop[] = []
  const splashTick: Ticker = (dtRaw) => {
    if (!splashOverlay) return false
    const dt = dtRaw * speed()
    const D = EMERGE_MOMENTUM.drips
    const vw = win?.innerWidth ?? 2000
    const vh = win?.innerHeight ?? 2000
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i]!
      p.age += dt
      const t = p.age - p.delay
      if (t < 0) {
        // Necking out of the edge: swell in place.
        p.blob.set(p.x, p.y, p.r * clamp(p.age / Math.max(0.01, p.delay), 0.3, 1))
        continue
      }
      const drag = Math.exp(-D.drag * dt)
      p.vx *= drag
      p.vy = p.vy * drag + D.gravity * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      const u = t / p.life
      const fade = u < 1 - D.fade ? 1 : clamp((1 - u) / D.fade, 0, 1)
      const grow = Math.min(1, (p.age + 0.02) / 0.08)
      const sp = Math.hypot(p.vx, p.vy)
      const st = 1 + Math.min(0.6, sp / 2600)
      p.blob.set(p.x, p.y, p.r * grow * fade, 1, 1 / Math.sqrt(st), st)
      if (u >= 1 || p.y - p.r > vh + 40 || p.x < -80 || p.x > vw + 80) {
        p.blob.remove()
        live.splice(i, 1)
      }
    }
    splashOverlay.flush()
    if (live.length === 0) {
      splashOverlay.release()
      splashOverlay = null
      return false
    }
    return true
  }
  const splash = (flingSpeed: number): void => {
    const ks = k('splash')
    if (ks <= 0 || !win) return
    let color = ''
    try {
      const cs = win.getComputedStyle(panel)
      color = cs.getPropertyValue('--goop-color').trim() || cs.backgroundColor || cs.color
    } catch {
      return
    }
    const r = panel.getBoundingClientRect()
    seed++
    const drops = drawerSplashDrops({ dir: dir(), rect: r, speed: flingSpeed, strength: ks, seed, edge: edge.d }, feel)
    if (drops.length === 0) return
    if (!splashOverlay) {
      try {
        splashOverlay = acquireGoopOverlay(doc, { renderer: opts.renderer ?? 'canvas', color, params: drawerGooParams(preset), zIndex: 2147482000 })
        // The same soft ring as the panel, so drops read on a page of the panel's color.
        splashOverlay.host.style.filter = `var(--goop-surface-shadow,${DEFAULT_SHADOW})`
      } catch {
        splashOverlay = null
        return
      }
    }
    for (const d of drops) live.push({ ...d, age: 0, blob: splashOverlay.createBlob() })
    // The edge recoils where the drops tore off.
    for (let i = 0; i < edge.v.length; i++) edge.v[i] = edge.v[i]! - 120 * ks * drawerEdgeShape(i, edge.v.length)
    wakeTicker(splashTick)
  }

  // ---- apply ----
  const overlayOpacity = (): number => {
    if (state === 'closed') return 0
    const off = Math.max(0, spring.x)
    return drawerFade(off, size, snaps, hasSnaps(), opts.fadeFromIndex)
  }
  const applyPanel = (): void => {
    panel.style.transform = drawerTransform(dir(), spring.x, nested, viewport)
    const fade = overlayOpacity()
    if (opts.overlay) opts.overlay.style.opacity = String(Math.round(fade * 1000) / 1000)
    applyBackground(fade)
  }

  const springFeel = (): { period: number; damping: number } => {
    if (reduced) return DRAWER_PHYSICS.still
    return state === 'closing' ? DRAWER_PHYSICS.close : state === 'opening' && opening ? DRAWER_PHYSICS.open : DRAWER_PHYSICS.snap
  }

  // ---- goo draw ----
  const drawGoo = (dt: number): boolean => {
    if (!renderer) return false
    const d = dir()
    const W = panel.offsetWidth
    const H = panel.offsetHeight
    const L = vertical() ? W : H
    const R = feel.radius
    const n = drawerEdgeCount(L, feel)
    if (edge.d.length !== n) edge = createDrawerEdge(n, seed)

    // Slosh on stop: motion that ends hands its momentum to the edge.
    const moving = Math.abs(vel) > 120
    if (moving && Math.abs(vel) > Math.abs(peak)) peak = vel
    if (!moving && Math.abs(vel) < 40 && Math.abs(peak) > 300) {
      let kickV = clamp(peak * feel.settle, -feel.rise, feel.rise) * k('slosh')
      if (opening && peak > 0) kickV += feel.rise * k('rise')
      if (kickV !== 0) kickDrawerEdge(edge, kickV)
      peak = 0
      opening = false
    }

    // Stretch: the finger pulled past full open (the rubber band's deficit) bulges toward it.
    let ptr: DrawerEdgeInput['pointer'] = null
    if (drag?.active) {
      const min = snaps.length ? Math.min(...snaps) : 0
      const deficit = drag.raw < min ? spring.x - drag.raw : 0
      if (deficit > 0) {
        const r = panel.getBoundingClientRect()
        const scale = vertical() ? (W > 0 ? r.width / W : 1) : H > 0 ? r.height / H : 1
        const u = (vertical() ? drag.x - r.left : drag.y - r.top) / (scale || 1)
        ptr = { u, beyond: deficit }
      }
    }
    const targets = drawerEdgeTargets(n, { velocity: vel, lag: k('lag'), stretch: k('stretch'), length: L, pointer: ptr }, feel)
    if (reduced) {
      for (let i = 0; i < n; i++) {
        edge.d[i] = 0
        edge.v[i] = 0
      }
    } else stepDrawerEdge(edge, targets, feel, dt, k('slosh'))

    // Trailing extension: cover the gap behind a panel pulled off its screen edge.
    const extend = clamp(-spring.x + DRAWER_NESTED_DISPLACEMENT * nested, 0, 600)
    const circles = reduced ? [] : drawerEdgeCircles(edge, d, W, H, R)
    const inset = reduced ? 0 : R
    const pose = drawerBodyPose(d, W, H, inset, extend)
    if (renderer.setBodyTransform) renderer.setBodyTransform(pose)
    else renderer.setBodyScale(pose.sx, pose.sy)
    while (blobs.length < circles.length) blobs.push(renderer.createBlob())
    for (let i = 0; i < blobs.length; i++) {
      const c = circles[i]
      if (c) blobs[i]!.set(c.x, c.y, c.r)
      else blobs[i]!.set(0, 0, 0)
    }
    const maxOut = Math.max(0, ...edge.d)
    const blur = Math.ceil(feel.softness * 3)
    const need = Math.ceil((maxOut + blur + 4) / 8) * 8
    const ext = Math.ceil((extend + blur) / 8) * 8
    const want = Math.max(need, ext)
    if (want !== pad) {
      pad = want
      renderer.setPadding({ side: want, bottom: want })
    }
    renderer.flush()
    return !drawerEdgeSettled(edge, targets) || peak !== 0
  }

  const drawGrip = (dt: number): boolean => {
    if (!grip || !gripRenderer || !gripDrop) return false
    const kh = k('handle')
    let busy = false
    if (kh > 0) {
      stepDrawerHandle(hs, !!drag?.onGrip, vel, feel, kh, dt)
      busy = !drawerHandleSettled(hs) || !!drag?.onGrip
    }
    const thick = vertical() ? grip.offsetHeight : grip.offsetWidth
    const hp = kh > 0 ? drawerHandlePose(hs, thick) : { along: 1, across: 1, drop: 0, dropR: 0 }
    const gw = grip.offsetWidth
    const gh = grip.offsetHeight
    if (vertical()) gripRenderer.setBodyScale(hp.along, hp.across)
    else gripRenderer.setBodyScale(hp.across, hp.along)
    const out = drawerOutward(dir())
    if (hp.dropR > 0) gripDrop.set(gw / 2 + out.x * hp.drop, gh / 2 + out.y * hp.drop, hp.dropR)
    else gripDrop.set(0, 0, 0)
    gripRenderer.flush()
    return busy
  }

  // ---- frame ----
  const finishClose = (): void => {
    state = 'closed'
    resting = true
    spring.v = 0
    if (opts.overlay) opts.overlay.style.opacity = '0'
    restoreBackground()
    events.onSettle?.(false)
  }

  const frame = (dt: number): boolean => {
    measure()
    if (drag?.active) {
      const min = Math.min(...snaps)
      const max = Math.max(...snaps)
      spring.x = drawerDragOffset(drag.raw, { min, max, size, dismissible: opts.dismissible !== false, dimension: viewport })
      resting = false
    } else if (state !== 'closed') {
      if (state === 'closing') target = closedOffset()
      else target = snaps[clamp(snapIndex, 0, snaps.length - 1)] ?? 0
      if (!resting || Math.abs(spring.x - target) > 0.01) {
        const atRest = dt > 0 ? stepDrawerSpring(spring, target, dt, springFeel()) : false
        resting = atRest
        if (state === 'closing' && (atRest || spring.x >= target - 0.5)) {
          spring.x = target
          applyPanel()
          finishClose()
          return false
        }
        if (atRest && state === 'opening') {
          state = 'open'
          events.onSettle?.(true)
        }
      } else if (state === 'opening') {
        state = 'open'
        resting = true
        events.onSettle?.(true)
      }
    }
    // Edge velocity from the panel's own motion (+ = outward, toward the screen centre).
    if (dt > 0 && Number.isFinite(lastX)) {
      const raw = -(spring.x - lastX) / dt
      vel += ((Math.abs(raw) > 12000 ? 0 : raw) - vel) * Math.min(1, dt * 30)
    } else if (dt > 0) vel *= Math.exp(-dt * 20)
    lastX = spring.x
    if (nested !== nestedTarget) {
      nested += (nestedTarget - nested) * Math.min(1, dt * (reduced ? 30 : 12))
      if (Math.abs(nested - nestedTarget) < 0.002) nested = nestedTarget
    }
    applyPanel()
    const gooBusy = state === 'closed' ? false : drawGoo(dt)
    const gripBusy = drawGrip(dt)
    const moving = !resting || !!drag || Math.abs(vel) > 2 || nested !== nestedTarget
    return (moving || (!reduced && (gooBusy || gripBusy))) && state !== 'closed'
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    return frame(dt * speed())
  }
  const wake = (): void => {
    if (destroyed) return
    if (typeof requestAnimationFrame !== 'function') {
      // No frames (SSR / tests without rAF): jump straight to where the motion would land.
      settleNow()
      return
    }
    wakeTicker(tick)
  }
  const settleNow = (): void => {
    measure()
    if (state === 'closing') {
      spring.x = closedOffset()
      applyPanel()
      finishClose()
      return
    }
    if (state !== 'closed') {
      spring.x = snaps[clamp(snapIndex, 0, snaps.length - 1)] ?? 0
      spring.v = 0
      resting = true
      applyPanel()
      if (state === 'opening') {
        state = 'open'
        events.onSettle?.(true)
      }
    }
  }

  // ---- pointer ----
  const axis = (e: { clientX: number; clientY: number }): number => (vertical() ? e.clientY : e.clientX)
  const cross = (e: { clientX: number; clientY: number }): number => (vertical() ? e.clientX : e.clientY)
  /** +1: moving the finger this way along the axis closes the drawer. */
  const closeSign = (): number => (dir() === 'bottom' || dir() === 'right' ? 1 : -1)

  /** A scrollable element between `target` and the panel that should take this gesture. */
  const scrollerTakes = (target: EventTarget | null, towardClose: boolean): boolean => {
    let el = target instanceof Element ? target : null
    while (el && el !== panel) {
      if (el instanceof HTMLElement) {
        const v = vertical()
        const canScroll = v ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1
        if (canScroll) {
          let style = ''
          try {
            style = win?.getComputedStyle(el)[v ? 'overflowY' : 'overflowX'] ?? ''
          } catch {
            style = ''
          }
          if (style === 'auto' || style === 'scroll') {
            const pos = v ? el.scrollTop : el.scrollLeft
            const maxPos = v ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth
            // Distance scrolled away from the edge the drawer closes toward.
            const fromStart = dir() === 'bottom' || dir() === 'right' ? pos : maxPos - pos
            if (towardClose && fromStart > 0.5) return true
            if (!towardClose && fromStart < maxPos - 0.5) {
              // Pulling open: let the content scroll once the drawer is at its top snap.
              const top = Math.min(...snaps)
              if (spring.x <= top + 0.5) return true
            }
          }
        }
      }
      el = el.parentElement
    }
    return false
  }

  let suppressClick = false
  const onClickCapture = (e: Event): void => {
    if (!suppressClick) return
    suppressClick = false
    e.preventDefault()
    e.stopPropagation()
  }

  const onDown = (e: PointerEvent): void => {
    if (destroyed || state === 'closed' || state === 'closing' || drag) return
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const t = e.target instanceof Element ? e.target : null
    const g = findGrip()
    const onGrip = !!(g && t && g.contains(t))
    if (opts.handleOnly && !onGrip) return
    if (t && !onGrip && t.closest(NO_DRAG)) return
    measure()
    drag = {
      id: e.pointerId,
      p0: axis(e),
      q0: cross(e),
      off0: spring.x,
      raw: spring.x,
      active: false,
      tracker: createDrawerVelocityTracker(),
      x: e.clientX,
      y: e.clientY,
      onGrip,
    }
    drawerTrack(drag.tracker, e.timeStamp / 1000, spring.x)
    win?.addEventListener('pointermove', onMove)
    win?.addEventListener('pointerup', onUp)
    win?.addEventListener('pointercancel', onCancel)
    if (onGrip) wake()
  }

  const onMove = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return
    const d = (axis(e) - drag.p0) * closeSign()
    drag.x = e.clientX
    drag.y = e.clientY
    if (!drag.active) {
      const dc = Math.abs(cross(e) - drag.q0)
      if (Math.abs(d) < DRAWER_PHYSICS.slop) {
        if (dc > DRAWER_PHYSICS.slop * 2) endDrag()
        return
      }
      if (dc > Math.abs(d) * 1.5 || (!drag.onGrip && scrollerTakes(e.target, d > 0))) {
        endDrag()
        return
      }
      // Text selection would fight the drag.
      try {
        win?.getSelection()?.removeAllRanges()
      } catch {
        // ignore
      }
      drag.active = true
      drag.p0 = axis(e) - Math.sign(d) * DRAWER_PHYSICS.slop * closeSign()
      drag.off0 = spring.x
      panel.setAttribute(DRAWER_DRAGGING_ATTR, '')
      try {
        panel.setPointerCapture(e.pointerId)
      } catch {
        // ignore (synthetic pointers)
      }
      spring.v = 0
    }
    drag.raw = drag.off0 + (axis(e) - drag.p0) * closeSign()
    drawerTrack(drag.tracker, e.timeStamp / 1000, drag.raw)
    if (size > 0) events.onDrag?.(Math.max(0, drag.raw - drag.off0) / size)
    e.preventDefault()
    wake()
  }

  const endDrag = (): void => {
    win?.removeEventListener('pointermove', onMove)
    win?.removeEventListener('pointerup', onUp)
    win?.removeEventListener('pointercancel', onCancel)
    if (drag) {
      try {
        if (panel.hasPointerCapture?.(drag.id)) panel.releasePointerCapture(drag.id)
      } catch {
        // ignore
      }
    }
    panel.removeAttribute(DRAWER_DRAGGING_ATTR)
    const wasGrip = drag?.onGrip
    drag = null
    if (wasGrip) wake()
  }

  const onCancel = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return
    const was = drag.active
    endDrag()
    if (was) {
      resting = false
      wake()
    }
  }

  const onUp = (e: PointerEvent): void => {
    if (!drag || e.pointerId !== drag.id) return
    const d = drag
    if (!d.active) {
      endDrag()
      return
    }
    drawerTrack(d.tracker, e.timeStamp / 1000, d.raw)
    const v = drawerVelocity(d.tracker, e.timeStamp / 1000)
    measure()
    // Land the panel on the finger's last position first (the splash starts from there).
    spring.x = drawerDragOffset(d.raw, { min: Math.min(...snaps), max: Math.max(...snaps), size, dismissible: opts.dismissible !== false, dimension: viewport })
    applyPanel()
    endDrag()
    suppressClick = true
    setTimeout(() => (suppressClick = false), 0)
    const decision = drawerReleaseTarget({
      offset: spring.x,
      velocity: v,
      dragged: d.raw - d.off0,
      size,
      viewport,
      snaps,
      active: snapIndex,
      dismissible: opts.dismissible !== false,
      closeThreshold: opts.closeThreshold,
      hasSnapPoints: hasSnaps(),
    })
    resting = false
    // The spring takes over with the finger's speed (no jump in velocity).
    spring.v = clamp(v, -8000, 8000)
    if (decision.kind === 'close') {
      events.onRelease?.(false)
      state = 'closing'
      if (v > DRAWER_PHYSICS.velocity) splash(v)
      events.onDismiss?.()
    } else {
      const was = snapIndex
      snapIndex = decision.index
      events.onRelease?.(true)
      if (hasSnaps() && was !== snapIndex) events.onSnap?.(snapIndex)
    }
    wake()
  }

  panel.addEventListener('pointerdown', onDown)
  panel.addEventListener('click', onClickCapture, true)
  const onResize = (): void => {
    resting = false
    wake()
  }
  win?.addEventListener('resize', onResize)
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(onResize) : null
  ro?.observe(panel)

  buildGoo()
  buildGrip()
  panel.toggleAttribute('data-goop-still', reduced)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    panel.toggleAttribute('data-goop-still', reduced)
    resting = false
    wake()
  })

  // Start hidden: no flash at the open position before the first frame.
  measure()
  spring.x = closedOffset()
  lastX = spring.x
  panel.style.transform = drawerTransform(dir(), spring.x, 0, viewport)

  return {
    open({ instant = false } = {}) {
      if (destroyed) return
      if (state === 'open' || state === 'opening') return
      measure()
      snapIndex = initialIndex()
      if (state === 'closed') {
        spring.x = instant ? (snaps[snapIndex] ?? 0) : closedOffset()
        spring.v = 0
        lastX = spring.x
        seed++
      }
      state = instant ? 'open' : 'opening'
      opening = !instant
      peak = 0
      resting = instant
      applyPanel()
      if (renderer) drawGoo(0)
      if (instant) events.onSettle?.(true)
      wake()
    },
    close() {
      if (destroyed || state === 'closed' || state === 'closing') return
      if (drag) endDrag()
      state = 'closing'
      opening = false
      resting = false
      wake()
    },
    snapTo(index) {
      if (destroyed || !hasSnaps()) return
      const i = clamp(Math.round(index), 0, (opts.snapPoints?.length ?? 1) - 1)
      if (i === snapIndex) return
      snapIndex = i
      if (state === 'closed' || state === 'closing') return
      resting = false
      wake()
    },
    update(next = {}) {
      if (destroyed) return
      const rebuild =
        ('renderer' in next && next.renderer !== opts.renderer) ||
        ('preset' in next && next.preset !== opts.preset) ||
        ('goo' in next && (next.goo === false) !== (opts.goo === false)) ||
        ('surface' in next && next.surface !== opts.surface)
      const regrip = rebuild || ('grip' in next && next.grip !== opts.grip) || ('handle' in next && (next.handle === false) !== (opts.handle === false))
      const prevSnap = opts.activeSnapPoint
      const prevBg = opts.scaleBackground
      opts = { ...opts, ...next }
      preset = readPreset(panel, opts.preset)
      feel = DRAWER_FEEL[preset]
      reduced = readReduced()
      panel.toggleAttribute('data-goop-still', reduced)
      if (rebuild) buildGoo()
      if (regrip) buildGrip()
      if (prevBg && !opts.scaleBackground) restoreBackground()
      if ('activeSnapPoint' in next && next.activeSnapPoint !== prevSnap) {
        measure()
        const i = drawerSnapIndex(opts.snapPoints, opts.activeSnapPoint, viewport)
        if (i >= 0 && i !== snapIndex) {
          snapIndex = i
          resting = false
        }
      }
      resting = false
      if (state !== 'closed') {
        frame(0)
        wake()
      }
    },
    setNested(t, instant = false) {
      const n = clamp(Number.isFinite(t) ? t : 0, 0, 1)
      if (n === nestedTarget && (!instant || n === nested)) return
      nestedTarget = n
      if (instant || state === 'closed') nested = n
      if (state !== 'closed') {
        applyPanel()
        wake()
      }
    },
    refresh() {
      if (destroyed || state === 'closed') return
      resting = false
      frame(0)
      wake()
    },
    kick(v = feel.rise) {
      if (destroyed || reduced) return
      kickDrawerEdge(edge, v)
      wake()
    },
    get state() {
      return state
    },
    get offset() {
      return spring.x
    },
    get snapIndex() {
      return snapIndex
    },
    get dragging() {
      return !!drag?.active
    },
    get reducedMotion() {
      return reduced
    },
    get edge() {
      return edge.d.slice()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      unwatch()
      ro?.disconnect()
      endDrag()
      panel.removeEventListener('pointerdown', onDown)
      panel.removeEventListener('click', onClickCapture, true)
      win?.removeEventListener('resize', onResize)
      restoreBackground()
      opts = { ...opts, handle: false }
      buildGrip()
      teardownGoo()
      panel.style.transform = prevPanel.transform
      panel.style.touchAction = prevPanel.touchAction
      panel.style.willChange = prevPanel.willChange
      panel.removeAttribute(DRAWER_GOO_ATTR)
      panel.removeAttribute('data-goop-still')
      panel.removeAttribute(DRAWER_DRAGGING_ATTR)
      // Splash drops keep their own ticker and overlay lease; they release themselves.
    },
  }
}

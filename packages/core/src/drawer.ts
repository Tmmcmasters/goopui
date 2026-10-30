// Drawer goo: the background of a vaul drawer panel as a live goo surface.
//
// vaul owns the panel's motion (drag, snap points, open/close animations, its transforms).
// This module never writes the panel's transform: it MEASURES where vaul put the panel every
// frame, derives the leading edge's velocity, and drives a goo skin from that:
//
//   lag      the leading edge (top edge of a bottom drawer) trails behind fast motion: a
//            fast flick down stretches it up behind the panel, a fast rise dips it in.
//   slosh    when the motion stops (release, snap point, end of a drag) the edge keeps going,
//            overshoots and wobbles out (an underdamped string of springs).
//   rise     opening lands with an extra jelly overshoot of the edge.
//   stretch  dragging past the edge (vaul's rubber band) pulls a globby bump toward the finger.
//   handle   the drag handle is its own little goo blob: it swells on press, stretches along
//            the drag and trails a droplet that snaps back.
//   drips    on dismiss, drops pinch off the edge and plop down off-screen (on a page overlay,
//            so they outlive the unmounted panel).
//
// Geometry: the renderer's body is the panel, inset by one column radius on the leading side;
// a row of overlapping circles fills that band, each riding its own spring, so the edge can
// bulge out AND dip in. The body also extends past the trailing side when vaul over-drags the
// panel off its screen edge (vaul's `::after` filler inherits our clear background).
//
// Pure: `DRAWER_FEEL`, `drawerEdgeShape`, `createDrawerEdge`, `drawerEdgeTargets`,
// `stepDrawerEdge`, `drawerEdgeSettled`, `drawerEdgeCircles`, `drawerBodyPose`,
// `drawerHandlePose`. DOM: `attachDrawer`. Nothing touches `document`/`window` until then.

import type { GoopPreset } from './constants'
import { emergeMomentumStrength } from './emerge-momentum'
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
  /** Drops shed on dismiss. */
  drips: number
  /** Drop radius (varied by seed). */
  dripSize: number
  /** Goo blur. */
  softness: number
}

export const DRAWER_FEEL: Readonly<Record<GoopPreset, Readonly<DrawerFeel>>> = Object.freeze({
  subtle: Object.freeze({
    spacing: 30, radius: 14, lag: 0.016, bulge: 22, dip: 7, response: 0.34, damping: 0.42, coupling: 0.3,
    reach: 26, reachWidth: 70, rise: 170, settle: 0.18, handleSwell: 1.1, handleStretch: 0.22, drips: 3, dripSize: 6, softness: 6,
  }),
  playful: Object.freeze({
    spacing: 28, radius: 16, lag: 0.028, bulge: 38, dip: 10, response: 0.4, damping: 0.26, coupling: 0.34,
    reach: 46, reachWidth: 85, rise: 300, settle: 0.26, handleSwell: 1.18, handleStretch: 0.4, drips: 4, dripSize: 8, softness: 7,
  }),
  wild: Object.freeze({
    spacing: 26, radius: 18, lag: 0.042, bulge: 60, dip: 13, response: 0.48, damping: 0.16, coupling: 0.38,
    reach: 72, reachWidth: 100, rise: 460, settle: 0.34, handleSwell: 1.28, handleStretch: 0.6, drips: 6, dripSize: 11, softness: 8,
  }),
})

/** Effect toggles: `true` (1) / `false` (0) or a 0..2 strength. All default true. */
export interface DrawerEffects {
  /** The leading edge trails behind fast motion (flicks, open, dismiss). */
  lag?: boolean | number
  /** The edge overshoots and wobbles when motion stops (release, snap points). */
  slosh?: boolean | number
  /** Opening lands with an extra jelly overshoot of the edge. */
  rise?: boolean | number
  /** Dragging past the edge pulls a globby bump toward the finger. */
  stretch?: boolean | number
  /** The drag handle is a goo blob: swells, stretches along the drag, trails a droplet. */
  handle?: boolean | number
  /** Dismiss: drops pinch off the edge and plop down off-screen. */
  drips?: boolean | number
}
export const DRAWER_EFFECTS = ['lag', 'slosh', 'rise', 'stretch', 'handle', 'drips'] as const satisfies readonly (keyof DrawerEffects)[]
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
 * in from the leading edge, pushed out by the edge's offset there.
 */
export function drawerEdgeCircles(edge: DrawerEdge, dir: DrawerDirection, W: number, H: number, r: number, count?: number): DrawerCircle[] {
  const L = isVertical(dir) ? W : H
  const m = count ?? drawerCircleCount(L, r)
  const out: DrawerCircle[] = []
  for (let i = 0; i < m; i++) {
    const f = m <= 1 ? 0.5 : i / (m - 1)
    const u = r + f * Math.max(0, L - 2 * r)
    const d = drawerEdgeAt(edge, f)
    if (dir === 'bottom') out.push({ x: u, y: r - d, r })
    else if (dir === 'top') out.push({ x: u, y: H - r + d, r })
    else if (dir === 'left') out.push({ x: W - r + d, y: u, r })
    else out.push({ x: r - d, y: u, r })
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

// ---- DOM ------------------------------------------------------------------------------------

export interface DrawerOptions extends DrawerEffects {
  /** Panel direction. Default: the host's `data-vaul-drawer-direction`, then 'bottom'. */
  direction?: DrawerDirection
  /** The drag handle element. Default: `[data-goop-drawer-handle]` inside the host. */
  grip?: HTMLElement | null
  /** Use this element as the goo surface instead of creating one (must be a child of host). */
  surface?: HTMLElement
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'canvas' (default: a drawer is a big surface), 'svg', or a custom factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface DrawerGooHandle {
  update(opts?: DrawerOptions): void
  /** Re-measure and redraw now. */
  refresh(): void
  /** Kick the edge outward by a px/s impulse (e.g. a custom snap). */
  kick(speed?: number): void
  readonly reducedMotion: boolean
  /** Current edge offsets (px, + = outward), for tests / devtools. */
  readonly edge: readonly number[]
  destroy(): void
}

/** Marker on the host while the goo is attached; `data-goop-still` marks reduced motion. */
export const DRAWER_GOO_ATTR = 'data-goop-drawer'
export const DRAWER_HANDLE_ATTR = 'data-goop-drawer-handle'

const DEFAULT_SHADOW = 'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.3)) drop-shadow(0 -2px 8px rgb(0 0 0 / 0.06))'
const STILL_FRAMES = 6
const GRAVITY = 2600
const isDir = (s: unknown): s is DrawerDirection => s === 'top' || s === 'bottom' || s === 'left' || s === 'right'

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  age: number
  blob: GoopBlob
}

/**
 * Attach the drawer goo to `host` (vaul's DrawerContent element). The host becomes the
 * stacking context; its own background should be clear (the goo, colored by `--goop-color`,
 * is the panel's background).
 */
export function attachDrawer(host: HTMLElement, options: DrawerOptions = {}): DrawerGooHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: DrawerOptions = { ...options }
  let preset = readPreset(host, opts.preset)
  let feel = DRAWER_FEEL[preset]
  let destroyed = false

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const ownSurface = !opts.surface
  const surface = opts.surface ?? doc.createElement('span')
  if (ownSurface) host.prepend(surface)
  surface.setAttribute('data-goop', 'surface')
  surface.setAttribute('aria-hidden', 'true')
  const prevSurfaceCss = surface.style.cssText
  surface.style.cssText +=
    ';position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;' +
    `filter:var(--goop-surface-shadow,${DEFAULT_SHADOW});`
  const prevIsolation = host.style.isolation
  host.style.isolation = 'isolate'
  host.setAttribute(DRAWER_GOO_ATTR, '')

  const dir = (): DrawerDirection => {
    if (isDir(opts.direction)) return opts.direction
    const a = host.getAttribute('data-vaul-drawer-direction')
    return isDir(a) ? a : 'bottom'
  }
  const k = (e: DrawerEffect): number => (reduced ? 0 : emergeMomentumStrength(opts[e]))
  const speed = (): number => Math.max(0.05, opts.speed ?? 1)

  // ---- panel renderer ----
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let edge = createDrawerEdge(4)
  let pad = -1
  const build = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    renderer?.destroy()
    renderer = resolveRenderer(opts.renderer ?? 'canvas')(surface, drawerGooParams(preset))
    pad = -1
  }

  // ---- handle renderer ----
  let grip: HTMLElement | null = null
  let gripRenderer: GoopRenderer | null = null
  let gripDrop: GoopBlob | null = null
  let gripPrev: { position: string; isolation: string } | null = null
  const hs = createDrawerHandleState()
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
    grip = opts.grip === undefined ? host.querySelector<HTMLElement>(`[${DRAWER_HANDLE_ATTR}]`) : opts.grip
    gripPrev = null
    if (!grip || opts.handle === false) {
      grip = null
      return
    }
    gripPrev = { position: grip.style.position, isolation: grip.style.isolation }
    if (win?.getComputedStyle(grip).position === 'static') grip.style.position = 'relative'
    grip.style.isolation = 'isolate'
    grip.setAttribute('data-goop-grip', '')
    // Small surface: the SVG filter is cheap here.
    gripRenderer = resolveRenderer('svg')(grip, { blur: 3, contrast: 20, threshold: 0.45 })
    gripRenderer.setPadding({ side: 24, bottom: 24 })
    gripDrop = gripRenderer.createBlob()
  }

  // ---- motion state ----
  let lastPos = Number.NaN
  let vel = 0 // smoothed edge velocity, px/s (+ out)
  let peak = 0
  let opening = host.getAttribute('data-state') !== 'closed'
  let still = 0
  let pointer: { x: number; y: number; id: number } | null = null
  let gripPressed = false
  let closing = false
  let closeAge = 0
  let dripped = false
  let seed = Math.floor(Math.random() * 1000)

  const viewport = (): { w: number; h: number } => ({
    w: win?.innerWidth ?? doc.documentElement.clientWidth,
    h: win?.innerHeight ?? doc.documentElement.clientHeight,
  })
  /** Leading edge coordinate along the outward axis (bigger = further out). */
  const edgePos = (r: DOMRect, d: DrawerDirection): number =>
    d === 'bottom' ? -r.top : d === 'top' ? r.bottom : d === 'left' ? r.right : -r.left

  // ---- dismiss drips (page overlay, outlives the panel) ----
  let overlay: GoopOverlay | null = null
  const drops: Drop[] = []
  const dripTick: Ticker = (dt) => {
    if (!overlay) return false
    const { w, h } = viewport()
    for (let i = drops.length - 1; i >= 0; i--) {
      const p = drops[i]!
      p.age += dt
      p.vy += GRAVITY * dt
      p.vx *= Math.exp(-1.5 * dt)
      p.x += p.vx * dt
      p.y += p.vy * dt
      const sp = Math.hypot(p.vx, p.vy)
      const st = 1 + Math.min(0.7, sp / 2600)
      // Inflate over the first 80ms (they neck off the edge), stretch with speed.
      const grow = Math.min(1, p.age / 0.08)
      p.blob.set(p.x, p.y, p.r * grow, 1, 1 / Math.sqrt(st), st)
      if (p.y - p.r * 2 > h || p.x < -60 || p.x > w + 60 || p.age > 3) {
        p.blob.remove()
        drops.splice(i, 1)
      }
    }
    overlay.flush()
    if (drops.length === 0) {
      overlay.release()
      overlay = null
      return false
    }
    return true
  }
  const shed = (r: DOMRect, d: DrawerDirection, W: number, H: number): void => {
    const kd = k('drips')
    if (kd <= 0 || !win) return
    const n = Math.max(1, Math.round(feel.drips * Math.min(1.5, kd)))
    let color = ''
    try {
      color = win.getComputedStyle(host).getPropertyValue('--goop-color').trim() || win.getComputedStyle(host).color
    } catch {
      return
    }
    if (!overlay) {
      try {
        overlay = acquireGoopOverlay(doc, { renderer: opts.renderer ?? 'canvas', color, params: drawerGooParams(preset), zIndex: 2147482000 })
      } catch {
        overlay = null
        return
      }
    }
    // Spawn at the biggest bulges (the drops pinch off where the edge stretched most).
    const m = edge.d.length
    const order = edge.d.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
    const picks: number[] = []
    for (const o of order) {
      if (picks.length >= n) break
      if (picks.every((p) => Math.abs(p - o.i) >= Math.max(1, Math.floor(m / (n + 1))))) picks.push(o.i)
    }
    // Panel velocity in viewport space (the drawer moves inward = -out).
    const vIn = -vel
    const sx = d === 'left' ? -1 : d === 'right' ? 1 : 0
    const sy = d === 'top' ? -1 : d === 'bottom' ? 1 : 0
    for (const [j, i] of picks.entries()) {
      const f = m <= 1 ? 0.5 : i / (m - 1)
      const off = Math.max(0, edge.d[i]!)
      const L = isVertical(d) ? W : H
      const u = feel.radius + f * Math.max(0, L - 2 * feel.radius)
      let x: number
      let y: number
      if (d === 'bottom') [x, y] = [r.left + u, r.top - off * 0.6]
      else if (d === 'top') [x, y] = [r.left + u, r.bottom + off * 0.6]
      else if (d === 'left') [x, y] = [r.right + off * 0.6, r.top + u]
      else [x, y] = [r.left - off * 0.6, r.top + u]
      const rr = feel.dripSize * Math.min(1.4, 0.6 + kd * 0.4) * (0.65 + 0.7 * rand(seed + 3, j))
      const carry = 0.25 + 0.2 * rand(seed + 5, j)
      drops.push({
        x,
        y,
        vx: vIn * carry * sx + (rand(seed + 7, j) - 0.5) * 120,
        vy: vIn * carry * sy - 80 * rand(seed + 9, j),
        r: rr,
        age: 0,
        blob: overlay.createBlob(),
      })
      // The edge recoils where it pinched.
      edge.v[i] = edge.v[i]! - off * 14
    }
    wakeTicker(dripTick)
  }

  // ---- frame ----
  const draw = (dt: number): boolean => {
    if (!renderer) return false
    const d = dir()
    const W = host.offsetWidth
    const H = host.offsetHeight
    const r = host.getBoundingClientRect()
    const L = isVertical(d) ? W : H
    const R = feel.radius
    const n = drawerEdgeCount(L, feel)
    if (edge.d.length !== n) edge = createDrawerEdge(n, seed)

    // Velocity from vaul's live position.
    const pos = edgePos(r, d)
    let moved = false
    if (dt > 0 && Number.isFinite(lastPos)) {
      const raw = (pos - lastPos) / (dt / speed())
      moved = Math.abs(pos - lastPos) > 0.05
      // A jump (re-layout, resize) is not motion.
      const v = Math.abs(raw) > 9000 ? 0 : raw
      vel += (v - vel) * Math.min(1, dt * 30)
    } else if (dt > 0) vel *= Math.exp(-dt * 20)
    lastPos = pos

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

    // Stretch toward a finger past the edge.
    let ptr: DrawerEdgeInput['pointer'] = null
    if (pointer) {
      const beyond =
        d === 'bottom' ? r.top - pointer.y : d === 'top' ? pointer.y - r.bottom : d === 'left' ? pointer.x - r.right : r.left - pointer.x
      const u = isVertical(d) ? pointer.x - r.left : pointer.y - r.top
      ptr = { u, beyond }
    }
    const targets = drawerEdgeTargets(n, { velocity: vel, lag: k('lag'), stretch: k('stretch'), length: L, pointer: ptr }, feel)
    if (reduced) {
      for (let i = 0; i < n; i++) {
        edge.d[i] = 0
        edge.v[i] = 0
      }
    } else stepDrawerEdge(edge, targets, feel, dt, k('slosh'))

    // Dismiss: once the panel is on its way, drops pinch off the bulges.
    if (closing && !reduced) {
      closeAge += dt
      if (!dripped && closeAge > 0.07 && -vel > 150) {
        dripped = true
        shed(r, d, W, H)
      }
    }

    // Trailing extension: cover the gap vaul leaves when the panel is over-dragged off its edge.
    const vp = viewport()
    const gap = d === 'bottom' ? vp.h - r.bottom : d === 'top' ? r.top : d === 'left' ? r.left : vp.w - r.right
    const scale = isVertical(d) ? (H > 0 ? r.height / H : 1) : W > 0 ? r.width / W : 1
    const extend = clamp(gap / (scale || 1), 0, 400)

    // Draw.
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

    // Handle.
    let gripBusy = false
    if (grip && gripRenderer && gripDrop) {
      const kh = k('handle')
      if (kh > 0) {
        stepDrawerHandle(hs, gripPressed || (pointer !== null && pointerOnGrip), vel, feel, kh, dt)
        gripBusy = !drawerHandleSettled(hs) || gripPressed
      }
      const thick = isVertical(d) ? grip.offsetHeight : grip.offsetWidth
      const hp = kh > 0 ? drawerHandlePose(hs, thick) : { along: 1, across: 1, drop: 0, dropR: 0 }
      const gw = grip.offsetWidth
      const gh = grip.offsetHeight
      if (isVertical(d)) gripRenderer.setBodyScale(hp.along, hp.across)
      else gripRenderer.setBodyScale(hp.across, hp.along)
      const out = d === 'bottom' ? [0, -1] : d === 'top' ? [0, 1] : d === 'left' ? [1, 0] : [-1, 0]
      if (hp.dropR > 0) gripDrop.set(gw / 2 + out[0]! * hp.drop, gh / 2 + out[1]! * hp.drop, hp.dropR)
      else gripDrop.set(0, 0, 0)
      gripRenderer.flush()
    }

    if (moved) still = 0
    else still++
    const settled = drawerEdgeSettled(edge, targets) && Math.abs(vel) < 5 && peak === 0
    return !reduced && (!settled || still < STILL_FRAMES || gripBusy || closing || pointer !== null)
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    return draw(dt * speed())
  }
  const wake = (): void => {
    if (destroyed) return
    still = 0
    if (reduced) {
      draw(0)
      return
    }
    wakeTicker(tick)
  }

  // ---- events ----
  let pointerOnGrip = false
  const onDown = (e: PointerEvent): void => {
    pointer = { x: e.clientX, y: e.clientY, id: e.pointerId }
    pointerOnGrip = !!grip && e.target instanceof Node && grip.contains(e.target)
    gripPressed = pointerOnGrip
    wake()
  }
  const onMove = (e: PointerEvent): void => {
    if (pointer && e.pointerId === pointer.id) {
      pointer.x = e.clientX
      pointer.y = e.clientY
      wake()
    }
  }
  const onUp = (e: PointerEvent): void => {
    if (pointer && e.pointerId !== pointer.id) return
    pointer = null
    gripPressed = false
    pointerOnGrip = false
    wake()
  }
  host.addEventListener('pointerdown', onDown)
  win?.addEventListener('pointermove', onMove)
  win?.addEventListener('pointerup', onUp)
  win?.addEventListener('pointercancel', onUp)
  win?.addEventListener('resize', wake)
  const anim = ['animationstart', 'transitionrun', 'transitionstart'] as const
  for (const e of anim) host.addEventListener(e, wake)

  const onState = (): void => {
    const s = host.getAttribute('data-state')
    if (s === 'closed' && !closing) {
      closing = true
      closeAge = 0
      dripped = false
      seed++
    } else if (s === 'open' && closing) {
      closing = false
      opening = true
    }
  }
  const mo = typeof MutationObserver === 'function'
    ? new MutationObserver((records) => {
        for (const rec of records) if (rec.attributeName === 'data-state') onState()
        wake()
      })
    : null
  mo?.observe(host, { attributes: true, attributeFilter: ['style', 'data-state', 'data-vaul-drawer-direction', 'class'] })

  build()
  buildGrip()
  onState()
  draw(0)
  wake()

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    host.toggleAttribute('data-goop-still', reduced)
    if (reduced) removeTicker(tick)
    wake()
  })
  host.toggleAttribute('data-goop-still', reduced)

  return {
    update(next = {}) {
      if (destroyed) return
      const rebuild = ('renderer' in next && next.renderer !== opts.renderer) || ('preset' in next && next.preset !== opts.preset)
      const regrip = ('grip' in next && next.grip !== opts.grip) || ('handle' in next && (next.handle === false) !== (opts.handle === false))
      opts = { ...opts, ...next }
      preset = readPreset(host, opts.preset)
      feel = DRAWER_FEEL[preset]
      reduced = readReduced()
      host.toggleAttribute('data-goop-still', reduced)
      if (reduced) removeTicker(tick)
      if (rebuild) build()
      if (regrip || rebuild) buildGrip()
      draw(0)
      wake()
    },
    refresh() {
      if (destroyed) return
      draw(0)
      wake()
    },
    kick(v = feel.rise) {
      if (destroyed || reduced) return
      kickDrawerEdge(edge, v)
      wake()
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
      mo?.disconnect()
      host.removeEventListener('pointerdown', onDown)
      win?.removeEventListener('pointermove', onMove)
      win?.removeEventListener('pointerup', onUp)
      win?.removeEventListener('pointercancel', onUp)
      win?.removeEventListener('resize', wake)
      for (const e of anim) host.removeEventListener(e, wake)
      for (const b of blobs) b.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      opts = { ...opts, handle: false }
      buildGrip()
      if (ownSurface) surface.remove()
      else surface.style.cssText = prevSurfaceCss
      host.style.isolation = prevIsolation
      host.removeAttribute(DRAWER_GOO_ATTR)
      host.removeAttribute('data-goop-still')
      // Falling drops keep their own ticker and overlay lease; they release themselves.
    },
  }
}

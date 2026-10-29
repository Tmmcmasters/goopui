// Sheet: a big goo panel that oozes in from a viewport edge (GoopSheet).
//
// The host is the sheet (real, accessible DOM, already at its final rect against the edge).
// Behind its content sits an aria-hidden goo surface: the renderer's body is the sheet, cut
// off at the goo's leading edge (the "front"), and a row of lobes along that front makes it
// a wobbly, lobed liquid edge instead of a straight slide.
//
// Open: the front runs out from the edge on an underdamped spring (momentum: it starts slow,
// gathers speed, overshoots its rest line and sloshes back). While it moves the middle of the
// front leads the corners (viscous drag along the sides) and the lobes ripple; when it stops
// that lead sloshes back and forth. Top sheets grow a few drips that hang off the front and
// keep swaying; bottom sheets fling a few drops up off the front that fall back in. Close:
// the front bulges out a touch (anticipation), then gets sucked back into the edge, faster
// and faster, the corners lagging behind the middle (a concave slurp), drips pulled in first.
//
// Everything visual is a pure function of (seconds, geometry): `sheetPose`. Poses are
// host-local (0,0 = sheet top-left). Nothing here touches `document` until `attachSheet`.

import type { GoopPreset } from './constants'
import { emergeOverflowSides, type EmergeCircle, type EmergePose, type EmergeSide } from './emerge'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'

/** Viewport edge the sheet comes in from (shadcn's `side`). */
export type SheetSide = EmergeSide

/** Per-preset feel. Times in seconds, lengths in px. */
export interface SheetFeel {
  /** Open duration (s) at speed 1, slosh included. */
  open: number
  /** Close duration (s) at speed 1. */
  close: number
  /** Spring damping ratio of the open (lower: bigger overshoot, more slosh). */
  damping: number
  /** How far (px) the front sloshes past its rest line at the stop. */
  overshoot: number
  /** Lobe radius (px) along the front. */
  lobe: number
  /** Lobe ripple amplitude (px) while the front moves. */
  wave: number
  /** How far (px) the middle of the front leads the corners at full speed. */
  lead: number
  /** Resting drip length (px) on a top sheet; flung drop height on a bottom sheet. */
  drip: number
  /** Goo blur (px). */
  softness: number
}

export const SHEET_FEEL: Readonly<Record<GoopPreset, Readonly<SheetFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.7, close: 0.4, damping: 0.72, overshoot: 10, lobe: 28, wave: 5, lead: 14, drip: 16, softness: 6 }),
  playful: Object.freeze({ open: 0.9, close: 0.46, damping: 0.5, overshoot: 22, lobe: 36, wave: 11, lead: 30, drip: 26, softness: 7 }),
  wild: Object.freeze({ open: 1.1, close: 0.54, damping: 0.36, overshoot: 34, lobe: 44, wave: 17, lead: 46, drip: 38, softness: 8 }),
})

/** Effect toggles (all default true). */
export interface SheetEffects {
  /** Lobed, rippling front whose middle leads the corners while it moves (false: a straight
   *  front, like a plain slide). */
  lobes?: boolean
  /** Spring overshoot + slosh when the front stops (false: smooth ease, no overshoot). */
  slosh?: boolean
  /** Drips off the front: top sheets grow drips that hang and sway, bottom sheets fling drops
   *  up that fall back in. No effect on left / right sheets. */
  drips?: boolean
  /** Close: a small outward bulge, then the goo is sucked back into the edge, accelerating,
   *  corners lagging behind the middle (false: a plain retreat). */
  suck?: boolean
  /** Content fades in once the front has nearly arrived and fades out first on close. */
  fade?: boolean
}

export const SHEET_EFFECTS = ['lobes', 'slosh', 'drips', 'suck', 'fade'] as const
export type SheetEffect = (typeof SHEET_EFFECTS)[number]

/** Max lobes along the front, drips off it, circles per drip; the pose always returns
 *  SHEET_CIRCLES circles (zero radius when unused). */
export const SHEET_LOBES = 12
export const SHEET_DRIPS = 4
export const SHEET_DRIP_PARTS = 3
export const SHEET_CIRCLES = SHEET_LOBES + SHEET_DRIPS * SHEET_DRIP_PARTS

/** Pose: same shape as an emerge pose (body rect, circles, content opacity). */
export type SheetPose = EmergePose
export type SheetPhase = 'open' | 'close'

/** Sheet geometry: size, and its extent along the in-flow axis (`depth`) and across it. */
export interface SheetGeometry {
  side: SheetSide
  width: number
  height: number
  depth: number
  breadth: number
}

export function sheetGeometry(width: number, height: number, side: SheetSide): SheetGeometry {
  const w = Math.max(0, width)
  const h = Math.max(0, height)
  const vertical = side === 'top' || side === 'bottom'
  return { side, width: w, height: h, depth: vertical ? h : w, breadth: vertical ? w : h }
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
const hash = (seed: number, a: number, b = 0): number => {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const zero = (): EmergeCircle => ({ x: 0, y: 0, r: 0 })

/** (main, cross) -> host-local (x, y). main = distance from the viewport edge toward the front. */
function toLocal(g: SheetGeometry, main: number, cross: number): { x: number; y: number } {
  switch (g.side) {
    case 'left':
      return { x: main, y: cross }
    case 'right':
      return { x: g.width - main, y: cross }
    case 'top':
      return { x: cross, y: main }
    default:
      return { x: cross, y: g.height - main }
  }
}

const circle = (g: SheetGeometry, main: number, cross: number, r: number): EmergeCircle => {
  const p = toLocal(g, main, cross)
  return { x: p.x, y: p.y, r: Math.max(0, r) }
}

const resolveFx = (fx: SheetEffects = {}): Required<SheetEffects> => ({
  lobes: fx.lobes !== false,
  slosh: fx.slosh !== false,
  drips: fx.drips !== false,
  suck: fx.suck !== false,
  fade: fx.fade !== false,
})

/** Phase duration (s) at speed 1. */
export function sheetDuration(feel: SheetFeel, phase: SheetPhase): number {
  return phase === 'open' ? feel.open : feel.close
}

/** Open travel, 0 -> 1 with momentum. With slosh: an underdamped spring (overshoots past 1
 *  and sloshes back, settled by u = 1). Without: a smooth ease that lands at u = 0.8. */
export function sheetTravel(u: number, feel: SheetFeel, slosh = true): number {
  const t = clamp(u)
  if (t >= 1) return 1
  if (!slosh) {
    const v = clamp(t / 0.8)
    return v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2
  }
  const z = clamp(feel.damping, 0.1, 0.95)
  const w = 5.2 / z
  const wd = w * Math.sqrt(1 - z * z)
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

/** Peak overshoot of the open spring (fraction of the travel). */
const springPeak = (feel: SheetFeel): number => {
  const z = clamp(feel.damping, 0.1, 0.95)
  return Math.exp((-z * Math.PI) / Math.sqrt(1 - z * z))
}

/** Open front position (px from the edge) at progress u. The overshoot is capped at
 *  `feel.overshoot` px so a tall sheet doesn't slosh a third of the screen. */
function openFront(u: number, g: SheetGeometry, feel: SheetFeel, fx: Required<SheetEffects>): number {
  const x = sheetTravel(u, feel, fx.slosh)
  if (x <= 1) return g.depth * x
  const peak = springPeak(feel)
  const cap = Math.min(feel.overshoot, g.depth * peak)
  return g.depth + ((x - 1) / peak) * cap
}

/** Close front: an anticipation bulge, then an accelerating pull back into the edge. */
function closeFront(u: number, g: SheetGeometry, feel: SheetFeel, fx: Required<SheetEffects>): number {
  const t = clamp(u)
  if (!fx.suck) return g.depth * (1 - smooth(t))
  const bulge = t < 0.16 ? Math.sin((Math.PI * t) / 0.16) * Math.min(feel.overshoot * 0.35, g.depth * 0.05) : 0
  const p = clamp((t - 0.1) / 0.9)
  return g.depth * (1 - p ** 2.2) + bulge
}

/** Where a close starts (u) for the goo at front `f`, and an open for the same front. */
export function sheetCloseStart(f: number, g: SheetGeometry, fx: SheetEffects = {}): number {
  const e = g.depth > 0 ? clamp(f / g.depth) : 0
  if (e >= 0.999) return 0
  if (resolveFx(fx).suck) return 0.1 + 0.9 * (1 - e) ** (1 / 2.2)
  // Invert 1 - smooth(t) by bisection.
  let lo = 0
  let hi = 1
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    if (1 - smooth(mid) > e) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function sheetOpenStart(f: number, g: SheetGeometry, feel: SheetFeel = SHEET_FEEL.playful, fx: SheetEffects = {}): number {
  const e = g.depth > 0 ? clamp(f / g.depth) : 0
  if (e <= 0.001) return 0
  const R = resolveFx(fx)
  // The travel rises monotonically until its first peak; scan up to there.
  for (let i = 1; i <= 200; i++) {
    const u = i / 400
    if (sheetTravel(u, feel, R.slosh) >= e) return u
  }
  return 0.5
}

/** Seconds into the open when the front first reaches its rest line (drips start there). */
export function sheetArrival(feel: SheetFeel, fx: SheetEffects = {}): number {
  const R = resolveFx(fx)
  for (let i = 1; i <= 400; i++) {
    const u = i / 400
    if (sheetTravel(u, feel, R.slosh) >= 0.985) return u * feel.open
  }
  return feel.open
}

/** Lobe layout across the front: count, spacing and radius. */
export function sheetLobes(g: SheetGeometry, feel: SheetFeel): { count: number; spacing: number; radius: number } {
  if (g.breadth <= 0) return { count: 0, spacing: 0, radius: 0 }
  const count = Math.max(3, Math.min(SHEET_LOBES, Math.round(g.breadth / (feel.lobe * 1.7))))
  const spacing = g.breadth / count
  return { count, spacing, radius: Math.min(spacing * 0.62, feel.lobe * 1.25) }
}

/** Drips on this sheet: top (hanging) and bottom (flung) only. */
export function sheetDripCount(g: SheetGeometry): number {
  if (g.side === 'left' || g.side === 'right' || g.breadth <= 0) return 0
  return Math.max(2, Math.min(SHEET_DRIPS, Math.round(g.breadth / 170)))
}

/** Flung drops (bottom sheet): gravity (px/s^2) and how long the last drop flies. */
const FLING_G = 2600
const flingTime = (h: number): number => 2 * Math.sqrt((2 * h) / FLING_G)
export function sheetFlingEnd(feel: SheetFeel): number {
  return flingTime(feel.drip * 1.8) + 0.04 * SHEET_DRIPS + 0.05
}

/** True when an open sheet keeps moving after the open (hanging drips keep swaying). */
export function sheetIdle(g: SheetGeometry, fx: SheetEffects = {}): boolean {
  return g.side === 'top' && resolveFx(fx).drips && sheetDripCount(g) > 0
}

/** Seconds into the open after which nothing moves (Infinity while drips sway). */
export function sheetSettleTime(g: SheetGeometry, feel: SheetFeel, fx: SheetEffects = {}): number {
  const R = resolveFx(fx)
  if (sheetIdle(g, fx)) return Infinity
  if (g.side === 'bottom' && R.drips && sheetDripCount(g) > 0) return Math.max(feel.open, sheetArrival(feel, fx) + sheetFlingEnd(feel))
  return feel.open
}

/** The settled open sheet: full body, no lobes, content visible. */
export function sheetRestPose(g: Pick<SheetGeometry, 'width' | 'height'>): SheetPose {
  return {
    body: { cx: g.width / 2, cy: g.height / 2, w: g.width, h: g.height },
    circles: Array.from({ length: SHEET_CIRCLES }, zero),
    content: 1,
  }
}

/** Nothing drawn (closed). */
export function sheetClosedPose(g: Pick<SheetGeometry, 'width' | 'height'>): SheetPose {
  return {
    body: { cx: g.width / 2, cy: g.height / 2, w: 0, h: 0 },
    circles: Array.from({ length: SHEET_CIRCLES }, zero),
    content: 0,
  }
}

/**
 * Pose `sec` seconds (speed-scaled) into `phase`. Open poses past the open duration keep
 * the drips moving (sway / flung drops); everything else is at rest there. Pure.
 */
export function sheetPose(
  sec: number,
  g: SheetGeometry,
  phase: SheetPhase,
  feel: SheetFeel = SHEET_FEEL.playful,
  effects: SheetEffects = {},
  seed = 0,
): SheetPose {
  const fx = resolveFx(effects)
  const D = g.depth
  const B = g.breadth
  if (D <= 0 || B <= 0) return sheetClosedPose(g)
  const dur = sheetDuration(feel, phase)
  const u = clamp(sec / dur)
  const front = (v: number) => (phase === 'open' ? openFront(v, g, feel, fx) : closeFront(v, g, feel, fx))
  const f = front(u)

  // Normalized front speed (signed, + = outward) for the viscous lead and ripple.
  const h = 0.004
  const df = (front(Math.min(1, u + h)) - front(Math.max(0, u - h))) / (Math.min(1, u + h) - Math.max(0, u - h))
  let peak = 1
  for (let i = 0; i <= 24; i++) {
    const a = i / 24
    const d = Math.abs((front(Math.min(1, a + h)) - front(Math.max(0, a - h))) / (Math.min(1, a + h) - Math.max(0, a - h)))
    if (d > peak) peak = d
  }
  const vn = clamp(df / peak, -1, 1)

  // Motion envelope: 1 while it moves, easing to 0 as the open settles (close stays lobed).
  const m = phase === 'open' ? 1 - smooth((u - 0.55) / 0.45) : u >= 1 ? 0 : smooth(u / 0.2)
  const settled = u >= 1

  const circles: EmergeCircle[] = []
  const { count, spacing, radius: R } = sheetLobes(g, feel)
  let bodyEnd = f
  if (fx.lobes && !settled && count > 0) {
    // Lobes fade in as the front leaves the edge, so nothing pokes out at u = 0.
    const grow = smooth(f / (R * 1.5))
    const ripple = feel.wave * (phase === 'open' ? (1 - u) ** 1.2 : Math.sin(Math.PI * u)) * (0.35 + 0.65 * Math.abs(vn))
    const concave = phase === 'close' && fx.suck ? feel.lead * 0.9 * Math.sin(Math.PI * clamp((u - 0.08) / 0.92)) : 0
    let minC = Infinity
    for (let i = 0; i < SHEET_LOBES; i++) {
      if (i >= count) {
        circles.push(zero())
        continue
      }
      const c = spacing * (i + 0.5)
      const q = (2 * c) / B - 1
      // Middle leads while moving out, lags on the rebound (open); corners lag on close.
      const lead = phase === 'open' ? feel.lead * vn * (1 - q * q) : concave * q * q
      const wave = ripple * Math.sin(2 * Math.PI * 2.3 * (c / B) + hash(seed, i) * 6.28 - 14 * sec)
      const r = R * (1 + 0.32 * (hash(seed, i, 1) - 0.5) * m) * grow
      const center = f + lead + wave - R + 0.45 * R * m
      minC = Math.min(minC, center)
      circles.push(circle(g, center, c, r))
    }
    bodyEnd = Math.min(f - 0.55 * R * m, minC + R * (1 - m))
  } else {
    for (let i = 0; i < SHEET_LOBES; i++) circles.push(zero())
  }

  // Drips.
  const drips = fx.drips ? sheetDripCount(g) : 0
  const arrive = sheetArrival(feel, fx)
  for (let k = 0; k < SHEET_DRIPS; k++) {
    if (k >= drips) {
      for (let j = 0; j < SHEET_DRIP_PARTS; j++) circles.push(zero())
      continue
    }
    const c = B * ((k + 0.5) / drips + (hash(seed, 40 + k) - 0.5) * (0.4 / drips))
    const q = (2 * c) / B - 1
    const leadAt = phase === 'open' && fx.lobes ? feel.lead * vn * (1 - q * q) : 0
    const at = f + leadAt
    const size = 0.6 + 0.8 * hash(seed, 50 + k)
    const rb = clamp(feel.drip * size * 0.34, 4, 13)
    if (g.side === 'top') {
      // Hanging drips: grow as the front brakes (the goo keeps going), then sway.
      let L = 0
      if (phase === 'open') {
        const s = sec - (arrive - 0.12 * feel.open)
        if (s > 0) {
          const ph = hash(seed, 60 + k) * 6.28
          L = feel.drip * size * (1 - Math.exp(-4 * s) * Math.cos(8 * s)) * (1 + 0.12 * Math.sin(1.7 * s + ph))
        }
      } else L = feel.drip * size * (1 - smooth(u / 0.32))
      const grow = clamp(L / (feel.drip * size * 0.35))
      const sway = 2.2 * Math.sin(1.3 * sec + hash(seed, 70 + k) * 6.28) * grow
      circles.push(circle(g, at - rb * 0.4, c, rb * 1.2 * grow))
      circles.push(circle(g, at + L * 0.5, c + sway * 0.5, rb * 0.78 * grow))
      circles.push(circle(g, at + L, c + sway, rb * (0.85 + 0.25 * grow) * grow))
    } else {
      // Bottom sheet: drops flung up off the front at the stop, falling back in.
      const s = phase === 'open' ? sec - arrive + 0.1 * feel.open - 0.04 * k : -1
      const H = feel.drip * (0.8 + 1.0 * hash(seed, 80 + k))
      const T = flingTime(H)
      if (s > 0 && s < T) {
        const v0 = Math.sqrt(2 * FLING_G * H)
        const y = v0 * s - 0.5 * FLING_G * s * s
        const drift = (hash(seed, 90 + k) - 0.5) * 24 * (s / T)
        const rd = rb * 0.95 * (s > T * 0.85 ? 1 - (s - T * 0.85) / (T * 0.15) * 0.6 : 1)
        const tail = s < T * 0.3 ? 1 - s / (T * 0.3) : 0
        circles.push(circle(g, D + y, c + drift, rd))
        circles.push(circle(g, D + y * 0.45, c + drift * 0.45, rb * 0.7 * tail))
        circles.push(zero())
      } else for (let j = 0; j < SHEET_DRIP_PARTS; j++) circles.push(zero())
    }
  }

  const end = Math.max(0, Math.min(bodyEnd, D + feel.overshoot * 2))
  const a = toLocal(g, 0, 0)
  const b = toLocal(g, end, B)
  const body =
    end <= 0.01
      ? { cx: g.width / 2, cy: g.height / 2, w: 0, h: 0 }
      : { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) }
  const content = !fx.fade ? (phase === 'open' ? 1 : u >= 1 ? 0 : 1) : phase === 'open' ? smooth((u - 0.38) / 0.25) : 1 - smooth(u / 0.2)
  return { body, circles, content }
}

/** Goo filter for a sheet. */
export function sheetGooParams(feel: SheetFeel = SHEET_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

// ---- DOM ----------------------------------------------------------------------------------

export type SheetState = 'closed' | 'opening' | 'open' | 'closing'

export interface SheetOptions extends SheetEffects {
  /** Edge the sheet comes in from. Default: the host's `data-side`, then 'right'. */
  side?: SheetSide | (() => SheetSide | null | undefined)
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'canvas' (default for this big surface), 'svg', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
  /** Use this element as the goo surface instead of creating one (must be a child of host). */
  surface?: HTMLElement
  /** Per-preset feel table. Default SHEET_FEEL. */
  feel?: Readonly<Record<GoopPreset, Readonly<SheetFeel>>>
}

export interface SheetHandle {
  /** Play the open (resumes from the current front if mid-close). */
  open(): void
  /** Play the close. Returns its duration in ms (0 under reduced motion). */
  close(): number
  update(opts?: SheetOptions): void
  refresh(): void
  readonly state: SheetState
  readonly reducedMotion: boolean
  /** Close duration in ms for the current options (0 under reduced motion). */
  readonly closeDuration: number
  destroy(): void
}

/** Attribute on the host: the sheet state. `data-goop-still` marks reduced motion. */
export const SHEET_STATE_ATTR = 'data-goop-sheet'
export const SHEET_STILL_ATTR = 'data-goop-still'
/** CSS custom properties published on the host. */
export const SHEET_CONTENT_VAR = '--goop-sheet-content'
export const SHEET_CLOSE_VAR = '--goop-sheet-close'

const DEFAULT_SHADOW = 'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.3)) drop-shadow(0 8px 16px rgb(0 0 0 / 0.12))'

/**
 * Attach a goo sheet to `host` (the sheet panel, at its final rect against the viewport
 * edge). Starts closed: call `open()`. The host becomes a stacking context; its own
 * background should be clear (the goo, colored by `--goop-color`, is the background).
 * Content opacity is published as `--goop-sheet-content`, the close length as
 * `--goop-sheet-close` (for a stylesheet's hold animation).
 */
export function attachSheet(host: HTMLElement, options: SheetOptions = {}): SheetHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: SheetOptions = { ...options }
  let presetName = readPreset(host, opts.preset)
  let feel = (opts.feel ?? SHEET_FEEL)[presetName]
  let params = sheetGooParams(feel)
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let state: SheetState = 'closed'
  /** Speed-scaled seconds into the current phase. */
  let sec = 0
  let seed = 0
  let destroyed = false
  let pad = -1
  let padBottom = -1
  let lastFront = 0

  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const ownSurface = !opts.surface
  const surface = opts.surface ?? doc.createElement('span')
  if (ownSurface) host.prepend(surface)
  surface.setAttribute('data-goop', 'surface')
  surface.setAttribute('aria-hidden', 'true')
  const prevSurfaceCss = surface.style.cssText
  surface.style.cssText +=
    ';position:absolute;inset:0;z-index:-1;pointer-events:none;border-radius:inherit;' +
    `filter:var(--goop-sheet-shadow,${DEFAULT_SHADOW});`

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const speed = (): number => Math.max(0.05, opts.speed ?? 1)
  const closeMs = (): number => (reduced ? 0 : Math.round((sheetDuration(feel, 'close') * 1000) / speed()))
  const isSide = (s: unknown): s is SheetSide => s === 'top' || s === 'right' || s === 'bottom' || s === 'left'
  const side = (): SheetSide => {
    const s = typeof opts.side === 'function' ? opts.side() : opts.side
    if (isSide(s)) return s
    const attr = host.getAttribute('data-side')
    return isSide(attr) ? attr : 'right'
  }
  const geom = (): SheetGeometry => {
    let w = host.offsetWidth
    let h = host.offsetHeight
    if (!w || !h) {
      const r = host.getBoundingClientRect()
      w = w || r.width
      h = h || r.height
    }
    return sheetGeometry(w, h, side())
  }

  const setPad = (s: number, bottom: number): void => {
    if (!renderer || (s === pad && bottom === padBottom)) return
    pad = s
    padBottom = bottom
    renderer.setPadding({ side: s, bottom })
  }

  const draw = (pose: SheetPose, g: SheetGeometry): void => {
    if (!renderer) return
    const { body } = pose
    const W = g.width || 1
    const H = g.height || 1
    const hidden = body.w <= 0 || body.h <= 0
    const tx = hidden ? 0 : body.cx - W / 2
    const ty = hidden ? 0 : body.cy - H / 2
    const sx = hidden ? 0 : body.w / W
    const sy = hidden ? 0 : body.h / H
    if (renderer.setBodyTransform) renderer.setBodyTransform({ tx, ty, skew: 0, sx, sy })
    else renderer.setBodyScale(sx, sy)
    for (let i = 0; i < blobs.length; i++) {
      const c = pose.circles[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r)
      else blobs[i]!.set(0, 0, 0)
    }
    renderer.flush()
    const blur = Math.ceil(params.blur * 3)
    const need = emergeOverflowSides(pose, W, H)
    const step = (px: number): number => (px > 0 ? blur + Math.ceil(px / 8) * 8 : blur)
    setPad(step(Math.ceil(need.side)), Math.max(step(Math.ceil(need.side)), step(Math.ceil(need.bottom))))
    host.style.setProperty(SHEET_CONTENT_VAR, String(Math.round(pose.content * 1000) / 1000))
    lastFront = hidden ? 0 : g.side === 'top' || g.side === 'bottom' ? body.h : body.w
  }

  const drawNow = (): void => {
    const g = geom()
    let pose: SheetPose
    if (reduced) pose = state === 'open' || state === 'opening' ? sheetRestPose(g) : sheetClosedPose(g)
    else if (state === 'closed') pose = sheetClosedPose(g)
    else if (state === 'open' && sec >= sheetSettleTime(g, feel, opts)) pose = sheetRestPose(g)
    else pose = sheetPose(sec, g, state === 'opening' || state === 'open' ? 'open' : 'close', feel, opts, seed)
    draw(pose, g)
  }

  const syncAttrs = (hold?: number): void => {
    host.setAttribute(SHEET_STATE_ATTR, state)
    if (reduced) host.setAttribute(SHEET_STILL_ATTR, '')
    else host.removeAttribute(SHEET_STILL_ATTR)
    const ms = hold ?? (state === 'closing' || state === 'closed' ? undefined : closeMs())
    if (ms !== undefined || !host.style.getPropertyValue(SHEET_CLOSE_VAR)) host.style.setProperty(SHEET_CLOSE_VAR, `${ms ?? closeMs()}ms`)
  }

  const build = (): void => {
    for (const bl of blobs) bl.remove()
    renderer?.destroy()
    params = sheetGooParams(feel)
    renderer = resolveRenderer(opts.renderer ?? 'canvas')(surface, params)
    pad = -1
    padBottom = -1
    blobs = Array.from({ length: SHEET_CIRCLES }, () => renderer!.createBlob())
    drawNow()
  }

  const tick: Ticker = (dt) => {
    if (destroyed || reduced) return false
    if (state === 'closed') return false
    sec += dt * speed()
    if (state === 'opening' && sec >= sheetDuration(feel, 'open')) {
      state = 'open'
      syncAttrs()
    } else if (state === 'closing' && sec >= sheetDuration(feel, 'close')) {
      state = 'closed'
      syncAttrs()
      drawNow()
      return false
    }
    drawNow()
    if (state === 'open') return sec < sheetSettleTime(geom(), feel, opts)
    return true
  }

  build()
  syncAttrs()

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      removeTicker(tick)
      if (state === 'opening') state = 'open'
      if (state === 'closing') state = 'closed'
    }
    syncAttrs()
    drawNow()
  })

  return {
    open() {
      if (destroyed || state === 'open' || state === 'opening') return
      if (reduced) {
        state = 'open'
        syncAttrs()
        drawNow()
        return
      }
      const g = geom()
      const from = state === 'closing' ? lastFront : 0
      state = 'opening'
      sec = sheetOpenStart(from, g, feel, opts) * sheetDuration(feel, 'open')
      seed++
      syncAttrs()
      drawNow()
      wakeTicker(tick)
    },
    close() {
      if (destroyed || state === 'closed' || state === 'closing') return 0
      if (reduced) {
        state = 'closed'
        syncAttrs()
        drawNow()
        return 0
      }
      const g = geom()
      const from = state === 'open' ? g.depth : lastFront
      state = 'closing'
      const u = sheetCloseStart(from, g, opts)
      sec = u * sheetDuration(feel, 'close')
      const ms = Math.round(((1 - u) * sheetDuration(feel, 'close') * 1000) / speed())
      syncAttrs(ms)
      drawNow()
      wakeTicker(tick)
      return ms
    },
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      presetName = readPreset(host, opts.preset)
      const nextFeel = (opts.feel ?? SHEET_FEEL)[presetName]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      reduced = readReduced()
      if (reduced) {
        removeTicker(tick)
        if (state === 'opening') state = 'open'
        if (state === 'closing') state = 'closed'
      }
      syncAttrs()
      if (rebuild) build()
      else drawNow()
      // A toggle may have turned idle drips on (or off) while open.
      if (!reduced && state === 'open' && sec < sheetSettleTime(geom(), feel, opts)) wakeTicker(tick)
    },
    refresh() {
      if (!destroyed) drawNow()
    },
    get state() {
      return state
    },
    get reducedMotion() {
      return reduced
    },
    get closeDuration() {
      return closeMs()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      unwatch()
      for (const bl of blobs) bl.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      if (ownSurface) surface.remove()
      else surface.style.cssText = prevSurfaceCss
      host.removeAttribute(SHEET_STATE_ATTR)
      host.removeAttribute(SHEET_STILL_ATTR)
      host.style.removeProperty(SHEET_CONTENT_VAR)
      host.style.removeProperty(SHEET_CLOSE_VAR)
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

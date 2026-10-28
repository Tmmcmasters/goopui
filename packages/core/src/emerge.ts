// Emerge: a goo surface that oozes out of an anchor (popover, dropdown, menu, tooltip...).
//
// The host is the panel (real, accessible DOM). Behind its content sits an aria-hidden goo
// surface: the renderer's body is the panel itself, and a few blobs form the bridge. On open
// a bulb swells from the anchor edge facing the panel, the panel inflates out of it as a
// tongue that widens (jelly overshoot, a momentum launch away from the anchor), the lumpy
// neck between them stretches and snaps, the stubs wobble back into anchor and panel, and
// the content fades in once the goo has mostly settled. Close reverses: the content fades,
// the panel pinches toward the bridge and gets sucked back into the anchor.
//
// Everything is a pure function of (time, geometry): `emergePose`. Geometry is general
// (anchor rect, panel rect, side), re-measured every frame, so it follows repositioning and
// collision flips. Nothing here touches `document`/`window` until `attachEmerge` runs.
//
// Coordinates: rects are in any shared space (viewport from getBoundingClientRect). Poses
// are panel-local (0,0 = panel top-left), the renderer's host space.

import type { GoopPreset } from './constants'
import {
  EMERGE_MOMENTUM_CIRCLES,
  emergeMomentum,
  emergeMomentumEnd,
  type EmergeMomentumEffects,
} from './emerge-momentum'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'

/** Side of the anchor the panel sits on (reka/floating-ui `side`). */
export type EmergeSide = 'top' | 'right' | 'bottom' | 'left'

export interface EmergeRect {
  x: number
  y: number
  width: number
  height: number
}

export interface EmergePoint {
  x: number
  y: number
}

export interface EmergeCircle {
  x: number
  y: number
  r: number
}

/** Per-preset feel. Times in seconds, lengths as noted. */
export interface EmergeFeel {
  /** Open duration (s) at speed 1. */
  open: number
  /** Close duration (s) at speed 1. */
  close: number
  /** Bulb radius as a fraction of the anchor's smaller side. */
  bulb: number
  /** Jelly decay: lower = wobblier, bigger overshoot. */
  decay: number
  /** Momentum launch away from the anchor, in bulb radii. */
  travel: number
  /** Neck snaps once its visible length passes this many bulb radii. */
  snap: number
  /** Goo blur (px). */
  softness: number
}

export const EMERGE_FEEL: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.42, close: 0.28, bulb: 0.34, decay: 7, travel: 0.45, snap: 0.45, softness: 4 }),
  playful: Object.freeze({ open: 0.56, close: 0.34, bulb: 0.42, decay: 4.5, travel: 1, snap: 0.65, softness: 5 }),
  wild: Object.freeze({ open: 0.72, close: 0.4, bulb: 0.5, decay: 3, travel: 1.6, snap: 0.9, softness: 6 }),
})

/** Effect toggles. All default true. */
export interface EmergeEffects {
  /** Bulb + lumpy neck between anchor and panel (false: the panel just inflates from the edge). */
  bridge?: boolean
  /** Jelly overshoot / wobble (false: smooth ease, no overshoot). */
  wobble?: boolean
  /** Momentum launch away from the anchor that stretches and snaps the neck. */
  momentum?: boolean
  /** Content fades in after the goo settles (false: content shows at once). */
  fade?: boolean
}

/** Neck lumps between bulb and panel. Uneven sizes keep it globby, never a thin string. */
export const EMERGE_NECK_LUMPS = 3
const LUMP_SIZE = [1, 0.84, 1.08] as const
/** Circles a pose always returns: bulb + neck lumps. */
export const EMERGE_CIRCLES = 1 + EMERGE_NECK_LUMPS

/** Bridge geometry in panel-local space, plus the main/cross frame it was built in. */
export interface EmergeBridge {
  side: EmergeSide
  /** Unit vector from anchor toward the panel. */
  dir: EmergePoint
  /** Panel size. */
  width: number
  height: number
  /** Panel extent along `dir` and across it. */
  depth: number
  breadth: number
  /** Distance from the anchor's facing edge to the panel's near edge (may be negative). */
  gap: number
  /** Cross coordinate (panel-local) where the bridge leaves the anchor / meets the panel. */
  sourceCross: number
  targetCross: number
  /** Bulb radius (px). */
  bulb: number
  /** Points on the anchor edge and the panel's near edge, panel-local. */
  source: EmergePoint
  target: EmergePoint
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** 0 -> 1 with a decaying jelly overshoot (or a plain ease-out when `wobble` is off). */
export function emergeJelly(u: number, decay: number, wobble = true): number {
  const t = clamp(u)
  if (!wobble) return 1 - (1 - t) ** 3
  return 1 - Math.exp(-decay * t) * Math.cos(3 * Math.PI * t) * (1 - t)
}

/** A 0 -> 1 -> 0 hump over u in [0, width]. */
const hump = (u: number, width: number): number => (u <= 0 || u >= width ? 0 : Math.sin((Math.PI * u) / width))

/** Map (main, cross) to panel-local (x, y). main = 0 at the panel's near edge, growing away. */
function toLocal(b: Pick<EmergeBridge, 'side' | 'width' | 'height'>, main: number, cross: number): EmergePoint {
  switch (b.side) {
    case 'bottom':
      return { x: cross, y: main }
    case 'top':
      return { x: cross, y: b.height - main }
    case 'right':
      return { x: main, y: cross }
    default:
      return { x: b.width - main, y: cross }
  }
}

/** Bridge geometry between `anchor` and `panel` (same coordinate space) for `side`. Pure. */
export function emergeBridge(
  anchor: EmergeRect,
  panel: EmergeRect,
  side: EmergeSide,
  feel: EmergeFeel = EMERGE_FEEL.playful,
): EmergeBridge {
  const vertical = side === 'top' || side === 'bottom'
  const width = Math.max(0, panel.width)
  const height = Math.max(0, panel.height)
  const depth = vertical ? height : width
  const breadth = vertical ? width : height
  const gap =
    side === 'bottom'
      ? panel.y - (anchor.y + anchor.height)
      : side === 'top'
        ? anchor.y - (panel.y + panel.height)
        : side === 'right'
          ? panel.x - (anchor.x + anchor.width)
          : anchor.x - (panel.x + panel.width)
  // Anchor's cross range in panel-local coordinates.
  const a0 = vertical ? anchor.x - panel.x : anchor.y - panel.y
  const aB = Math.max(0, vertical ? anchor.width : anchor.height)
  const a1 = a0 + aB
  const smaller = Math.min(anchor.width, anchor.height, breadth > 0 ? breadth : Infinity)
  const bulb = clamp(feel.bulb * (Number.isFinite(smaller) ? smaller : 0), 4, 26)
  const center = a0 + aB / 2
  // Meet the panel in line with the anchor's center when possible, kept clear of its corners.
  const inset = Math.min(bulb * 1.2, breadth / 2)
  const targetCross = clamp(center, inset, Math.max(inset, breadth - inset))
  const aIn = Math.min(bulb, aB / 2)
  const sourceCross = clamp(targetCross, a0 + aIn, Math.max(a0 + aIn, a1 - aIn))
  const dir = side === 'bottom' ? { x: 0, y: 1 } : side === 'top' ? { x: 0, y: -1 } : side === 'right' ? { x: 1, y: 0 } : { x: -1, y: 0 }
  const frame = { side, width, height }
  return {
    side,
    dir,
    width,
    height,
    depth,
    breadth,
    gap,
    sourceCross,
    targetCross,
    bulb,
    source: toLocal(frame, -gap, sourceCross),
    target: toLocal(frame, 0, targetCross),
  }
}

/** Panel body pose: center and size, panel-local. w = h = 0 hides it. */
export interface EmergeBody {
  cx: number
  cy: number
  w: number
  h: number
}

export interface EmergePose {
  body: EmergeBody
  /** Bulb then neck lumps (EMERGE_CIRCLES), zero-radius when unused. */
  circles: EmergeCircle[]
  /** Content opacity 0..1. */
  content: number
}

export type EmergePhase = 'open' | 'close'

const OPEN_SWELL = 0.22
const OPEN_INFLATE_AT = 0.12
const OPEN_CROSS_AT = 0.2
const OPEN_FADE_AT = 0.6
const OPEN_FADE_LEN = 0.32
const SNAP_LATEST = 0.5
const SNAP_RETRACT = 0.14
const BULB_RETRACT = 0.3

const resolveFx = (fx: EmergeEffects = {}): Required<EmergeEffects> => ({
  bridge: fx.bridge !== false,
  wobble: fx.wobble !== false,
  momentum: fx.momentum !== false,
  fade: fx.fade !== false,
})

/** Body in main/cross terms. */
interface Slab {
  near: number
  extent: number
  crossCenter: number
  crossSize: number
}

function openSlab(t: number, b: EmergeBridge, feel: EmergeFeel, fx: Required<EmergeEffects>): Slab {
  const ui = clamp((t - OPEN_INFLATE_AT) / (1 - OPEN_INFLATE_AT))
  const uc = clamp((t - OPEN_CROSS_AT) / (1 - OPEN_CROSS_AT))
  const g = emergeJelly(ui, feel.decay, fx.wobble)
  const gc = emergeJelly(uc, feel.decay * 1.15, fx.wobble)
  const start = fx.bridge ? -b.gap : 0
  const launch = fx.momentum ? feel.travel * b.bulb * hump(ui, 0.55) : 0
  const tongue = Math.min(b.breadth, b.bulb * 1.8)
  return {
    near: lerp(start, 0, smooth(ui * 2.5)) + launch,
    extent: b.depth * g,
    crossCenter: lerp(b.targetCross, b.breadth / 2, clamp(gc, 0, 1.2)),
    crossSize: Math.max(0, lerp(tongue, b.breadth, gc)),
  }
}

function closeSlab(t: number, b: EmergeBridge, fx: Required<EmergeEffects>): Slab {
  const u = clamp(t / 0.9)
  const e = u * u
  const pinch = smooth(u * 1.6)
  const tongue = Math.min(b.breadth, b.bulb * 1.6)
  return {
    near: lerp(0, fx.bridge ? -b.gap : 0, e),
    extent: b.depth * (1 - e),
    crossCenter: lerp(b.breadth / 2, b.targetCross, pinch),
    crossSize: lerp(b.breadth, tongue, pinch),
  }
}

/** Visible neck length (px) between the bulb's edge and the panel's near edge. */
function neckGap(t: number, b: EmergeBridge, feel: EmergeFeel, fx: Required<EmergeEffects>): number {
  return openSlab(t, b, feel, fx).near - (bulbAt(t, b, feel, fx, 1).main + b.bulb * 0.6)
}

/** Open-phase bulb before (k = 1) any retraction: main position and radius. */
function bulbAt(t: number, b: EmergeBridge, feel: EmergeFeel, fx: Required<EmergeEffects>, k: number) {
  const s = emergeJelly(clamp(t / OPEN_SWELL), feel.decay * 1.5, fx.wobble)
  const r = b.bulb * s * k
  // Pushes half out of the anchor edge, then recoils back into it as the panel launches.
  const recoil = fx.momentum ? smooth((t - OPEN_SWELL) / 0.25) : 0
  return { main: -b.gap + r * (0.45 - 0.55 * recoil), r }
}

/** Open-phase time at which the neck snaps: when it stretches past `snap` bulb radii, or
 *  SNAP_LATEST at the latest. Pure (sampled). */
export function emergeSnapTime(b: EmergeBridge, feel: EmergeFeel = EMERGE_FEEL.playful, effects?: EmergeEffects): number {
  const fx = resolveFx(effects)
  const limit = feel.snap * b.bulb
  for (let i = 0; i <= 40; i++) {
    const t = OPEN_SWELL + ((SNAP_LATEST - OPEN_SWELL) * i) / 40
    if (neckGap(t, b, feel, fx) >= limit) return t
  }
  return SNAP_LATEST
}

function slabToBody(s: Slab, b: EmergeBridge): EmergeBody {
  if (s.extent < 0.5 || s.crossSize < 0.5) return { cx: 0, cy: 0, w: 0, h: 0 }
  const c = toLocal(b, s.near + s.extent / 2, s.crossCenter)
  const vertical = b.side === 'top' || b.side === 'bottom'
  return vertical ? { cx: c.x, cy: c.y, w: s.crossSize, h: s.extent } : { cx: c.x, cy: c.y, w: s.extent, h: s.crossSize }
}

const zero = (): EmergeCircle => ({ x: 0, y: 0, r: 0 })

/** Lumps from (m0, c0) to (m1, c1), radius `r`, bunched toward the start by `bunch` (0..1). */
function lumps(b: EmergeBridge, m0: number, c0: number, m1: number, c1: number, r: number, bunch: number): EmergeCircle[] {
  const out: EmergeCircle[] = []
  for (let k = 0; k < EMERGE_NECK_LUMPS; k++) {
    const f = ((k + 1) / (EMERGE_NECK_LUMPS + 1)) ** (1 + bunch)
    const p = toLocal(b, lerp(m0, m1, f), lerp(c0, c1, f))
    out.push({ x: p.x, y: p.y, r: Math.max(0, r * LUMP_SIZE[k]!) })
  }
  return out
}

/**
 * The goo at time `t` (0..1 of the phase) for bridge `b`. Pure and deterministic.
 * Open ends at rest (full panel, no circles, content 1); close ends empty (content 0).
 */
export function emergePose(
  t: number,
  b: EmergeBridge,
  phase: EmergePhase = 'open',
  feel: EmergeFeel = EMERGE_FEEL.playful,
  effects?: EmergeEffects,
): EmergePose {
  const fx = resolveFx(effects)
  const tt = clamp(t)
  if (phase === 'open') {
    if (tt >= 1) return emergeRestPose(b)
    const body = slabToBody(openSlab(tt, b, feel, fx), b)
    const content = fx.fade ? smooth((tt - OPEN_FADE_AT) / OPEN_FADE_LEN) : 1
    const circles: EmergeCircle[] = Array.from({ length: EMERGE_CIRCLES }, zero)
    if (fx.bridge) {
      const ts = emergeSnapTime(b, feel, fx)
      // Bulb: swells, then after the snap wobbles and sinks back into the anchor.
      const kr = clamp((tt - ts) / BULB_RETRACT)
      const wob = fx.wobble && kr > 0 ? 0.2 * Math.sin(kr * 3 * Math.PI) * (1 - kr) : 0
      const bulb = bulbAt(tt, b, feel, fx, (1 - smooth(kr)) * (1 + wob))
      const bp = toLocal(b, bulb.main, b.sourceCross)
      circles[0] = { x: bp.x, y: bp.y, r: bulb.r }
      const slab = openSlab(tt, b, feel, fx)
      const nearCross = clamp(b.targetCross, slab.crossCenter - slab.crossSize / 2, slab.crossCenter + slab.crossSize / 2)
      if (tt < ts) {
        // Fat lumps that thin a little as they stretch, never to a string.
        const stretch = clamp(neckGap(tt, b, feel, fx) / Math.max(1e-6, feel.snap * b.bulb))
        const r = bulb.r * (0.78 - 0.26 * stretch)
        const neck = lumps(b, bulb.main, b.sourceCross, slab.near, nearCross, r, fx.momentum ? 0.35 * stretch : 0)
        for (let k = 0; k < neck.length; k++) circles[1 + k] = neck[k]!
      } else {
        // Snapped: the anchor-side lump recoils into the bulb, the rest into the panel.
        const k2 = clamp((tt - ts) / SNAP_RETRACT)
        const r = b.bulb * 0.52 * (1 - smooth(k2))
        const neck = lumps(b, bulb.main, b.sourceCross, slab.near, nearCross, r, 0)
        for (let k = 0; k < neck.length; k++) {
          const toPanel = k > 0
          const end = toPanel ? toLocal(b, slab.near, nearCross) : bp
          const c = neck[k]!
          const pull = smooth(k2 * 1.2)
          circles[1 + k] = { x: lerp(c.x, end.x, pull), y: lerp(c.y, end.y, pull), r: c.r }
        }
      }
    }
    return { body, circles, content }
  }
  // close
  if (tt >= 1) return { body: { cx: 0, cy: 0, w: 0, h: 0 }, circles: Array.from({ length: EMERGE_CIRCLES }, zero), content: 0 }
  const slab = closeSlab(tt, b, fx)
  const body = slabToBody(slab, b)
  const content = fx.fade ? 1 - smooth(tt / 0.22) : 0
  const circles: EmergeCircle[] = Array.from({ length: EMERGE_CIRCLES }, zero)
  if (fx.bridge) {
    // The neck reforms fat and the whole thing drains into the anchor.
    const grow = smooth(tt / 0.3) * (1 - smooth((tt - 0.78) / 0.22))
    const r = b.bulb * grow
    const main = -b.gap + r * 0.3
    const bp = toLocal(b, main, b.sourceCross)
    circles[0] = { x: bp.x, y: bp.y, r }
    const nearCross = clamp(b.targetCross, slab.crossCenter - slab.crossSize / 2, slab.crossCenter + slab.crossSize / 2)
    const neck = lumps(b, main, b.sourceCross, slab.near, nearCross, r * 0.8, 0)
    for (let k = 0; k < neck.length; k++) circles[1 + k] = neck[k]!
  }
  return { body, circles, content }
}

/** The settled open panel: full body, no bridge, content visible. */
export function emergeRestPose(b: Pick<EmergeBridge, 'width' | 'height'>): EmergePose {
  return {
    body: { cx: b.width / 2, cy: b.height / 2, w: b.width, h: b.height },
    circles: Array.from({ length: EMERGE_CIRCLES }, zero),
    content: 1,
  }
}

/** Goo filter for an emerging surface. */
export function emergeGooParams(feel: EmergeFeel = EMERGE_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

/** Extra room (px) the goo needs outside the panel box for `pose`. */
export function emergeOverflow(pose: EmergePose, width: number, height: number): number {
  let m = 0
  const box = (x0: number, y0: number, x1: number, y1: number): void => {
    m = Math.max(m, -x0, -y0, x1 - width, y1 - height)
  }
  const { body } = pose
  if (body.w > 0 && body.h > 0) box(body.cx - body.w / 2, body.cy - body.h / 2, body.cx + body.w / 2, body.cy + body.h / 2)
  for (const c of pose.circles) if (c.r > 0) box(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r)
  return Math.max(0, m)
}

// ---- DOM ----------------------------------------------------------------------------------

export type EmergeState = 'closed' | 'opening' | 'open' | 'closing'

export interface EmergeOptions extends EmergeEffects, EmergeMomentumEffects {
  /** What the goo emerges from: an element, or a getter returning its rect (same space as
   *  `host.getBoundingClientRect()`). */
  anchor?: Element | (() => EmergeRect | null | undefined) | null
  /** Side of the anchor the panel is on. Default: the host's `data-side`, then 'bottom'. */
  side?: EmergeSide | (() => EmergeSide | null | undefined)
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
  /** Hold the open animation's clock until this returns true (e.g. the panel is positioned).
   *  Gives up waiting after a few frames. */
  ready?: () => boolean
  /** Use this element as the goo surface instead of creating one (must be a child of host). */
  surface?: HTMLElement
  /** Per-preset feel table. Default EMERGE_FEEL (GoopTooltip passes TOOLTIP_FEEL). */
  feel?: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>>
}

export interface EmergeHandle {
  /** Play the open animation (resumes from the current shape if mid-close). */
  open(): void
  /** Play the close animation. Returns its duration in ms (0 under reduced motion). */
  close(): number
  /** Patch options in place (renderer and preset softness changes rebuild the layer). */
  update(opts?: EmergeOptions): void
  /** Re-measure and redraw now. */
  refresh(): void
  readonly state: EmergeState
  readonly reducedMotion: boolean
  /** Close duration in ms for the current options (0 under reduced motion). */
  readonly closeDuration: number
  destroy(): void
}

/** Attribute on the host: the emerge state. `data-goop-still` marks reduced motion. */
export const EMERGE_STATE_ATTR = 'data-goop-emerge'
export const EMERGE_STILL_ATTR = 'data-goop-still'
/** CSS custom properties published on the host. */
export const EMERGE_CONTENT_VAR = '--goop-emerge-content'
export const EMERGE_CLOSE_VAR = '--goop-emerge-close'

const DEFAULT_SHADOW =
  'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.35)) drop-shadow(0 4px 6px rgb(0 0 0 / 0.08))'
const READY_MAX_FRAMES = 12

/**
 * Attach an emerging goo surface to `host` (the panel). Starts closed: call `open()` once it
 * is in place. The host is made the stacking context; its own background should be clear
 * (the goo, colored by `--goop-color`, is the panel's background). Content opacity is
 * published as `--goop-emerge-content` for a stylesheet to apply to the host's children.
 */
export function attachEmerge(host: HTMLElement, options: EmergeOptions = {}): EmergeHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: EmergeOptions = { ...options }
  let presetName = readPreset(host, opts.preset)
  let feel = (opts.feel ?? EMERGE_FEEL)[presetName]
  let params = emergeGooParams(feel)
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let state: EmergeState = 'closed'
  let t = 0
  let waited = 0
  let destroyed = false
  let pad = -1
  // Momentum clock (speed-scaled seconds since the phase began; keeps running past an open),
  // per-open seed, and whether this open started from closed (drops only then).
  let mt = Infinity
  let seed = 0
  let fresh = false

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
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const speed = (): number => Math.max(0.05, opts.speed ?? 1)
  const closeMs = (): number => (reduced ? 0 : Math.round((feel.close * 1000) / speed()))

  const rectOf = (el: Element): EmergeRect => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, width: r.width, height: r.height }
  }
  const anchorRect = (): EmergeRect | null => {
    const a = opts.anchor
    if (!a) return null
    if (typeof a === 'function') return a() ?? null
    return rectOf(a)
  }
  const isSide = (s: unknown): s is EmergeSide => s === 'top' || s === 'right' || s === 'bottom' || s === 'left'
  const side = (): EmergeSide => {
    const s = typeof opts.side === 'function' ? opts.side() : opts.side
    if (isSide(s)) return s
    const attr = host.getAttribute('data-side')
    return isSide(attr) ? attr : 'bottom'
  }
  const bridge = (): EmergeBridge => {
    const panel = rectOf(host)
    const w = panel.width || host.offsetWidth
    const h = panel.height || host.offsetHeight
    const p = { ...panel, width: w, height: h }
    // No anchor: emerge from just outside the panel's near edge.
    const s = side()
    const a = anchorRect() ?? {
      x: s === 'right' ? p.x - 1 : s === 'left' ? p.x + w : p.x + w / 2 - 18,
      y: s === 'bottom' ? p.y - 1 : s === 'top' ? p.y + h : p.y + h / 2 - 18,
      width: s === 'top' || s === 'bottom' ? 36 : 1,
      height: s === 'top' || s === 'bottom' ? 1 : 36,
    }
    return emergeBridge(a, p, s, feel)
  }

  const setPad = (px: number): void => {
    if (!renderer || px === pad) return
    pad = px
    renderer.setPadding({ side: px, bottom: px })
  }

  const draw = (pose: EmergePose, b: Pick<EmergeBridge, 'width' | 'height'>): void => {
    if (!renderer) return
    const { body } = pose
    const W = b.width || 1
    const H = b.height || 1
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
    const need = Math.ceil(emergeOverflow(pose, W, H))
    // Grow in 8px steps while animating, shrink back at rest.
    setPad(need > 0 ? blur + Math.ceil(need / 8) * 8 : blur)
    host.style.setProperty(EMERGE_CONTENT_VAR, String(Math.round(pose.content * 1000) / 1000))
  }

  const drawNow = (): void => {
    const b = bridge()
    let pose: EmergePose
    if (state === 'open' || (reduced && state === 'opening')) pose = emergeRestPose(b)
    else if (state === 'closed' || (reduced && state === 'closing')) pose = emergePose(1, b, 'close', feel, opts)
    else pose = emergePose(t, b, state === 'opening' ? 'open' : 'close', feel, opts)
    const phase: EmergePhase = state === 'open' || state === 'opening' ? 'open' : 'close'
    if (!reduced && state !== 'closed' && mt < emergeMomentumEnd(phase)) {
      const fx = { ...opts, openDrips: fresh ? opts.openDrips : false }
      pose = emergeMomentum(pose, b, phase, mt, fx, {
        preset: presetName,
        seed,
        bodyAt: (sec) => emergePose(sec / feel.open, b, 'open', feel, opts).body,
      })
    }
    draw(pose, b)
  }

  /** `hold`: ms a stylesheet should keep the host mounted once closing. Left alone while a
   *  close is running (changing it would retime the running hold animation). */
  const syncAttrs = (hold?: number): void => {
    host.setAttribute(EMERGE_STATE_ATTR, state)
    if (reduced) host.setAttribute(EMERGE_STILL_ATTR, '')
    else host.removeAttribute(EMERGE_STILL_ATTR)
    const ms = hold ?? (state === 'closing' || state === 'closed' ? undefined : closeMs())
    if (ms !== undefined || !host.style.getPropertyValue(EMERGE_CLOSE_VAR)) {
      host.style.setProperty(EMERGE_CLOSE_VAR, `${ms ?? closeMs()}ms`)
    }
  }

  const build = (): void => {
    for (const bl of blobs) bl.remove()
    renderer?.destroy()
    params = emergeGooParams(feel)
    renderer = resolveRenderer(opts.renderer)(surface, params)
    pad = -1
    blobs = Array.from({ length: EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES }, () => renderer!.createBlob())
    drawNow()
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    if (state === 'open' && !reduced && mt < emergeMomentumEnd('open')) {
      // Open finished; the slosh and drops play out.
      mt += dt * speed()
      drawNow()
      return mt < emergeMomentumEnd('open')
    }
    if (state !== 'opening' && state !== 'closing') return false
    if (state === 'opening' && t === 0 && opts.ready && !opts.ready() && waited++ < READY_MAX_FRAMES) {
      drawNow()
      return true
    }
    const dur = (state === 'opening' ? feel.open : feel.close) / speed()
    t = Math.min(1, t + dt / dur)
    mt += dt * speed()
    if (t >= 1) {
      state = state === 'opening' ? 'open' : 'closed'
      syncAttrs()
      drawNow()
      return state === 'open' && !reduced && mt < emergeMomentumEnd('open')
    }
    drawNow()
    return true
  }

  /** Approximate time in the other phase with the same body extent (smooth reversal). */
  const extent = (): number => {
    if (state === 'open') return 1
    if (state === 'closed') return 0
    if (state === 'closing') return 1 - clamp(t / 0.9) ** 2
    return emergeJelly(clamp((t - OPEN_INFLATE_AT) / (1 - OPEN_INFLATE_AT)), feel.decay, opts.wobble !== false)
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
      const e = extent()
      // Resume part-way through the inflate when reversing a close.
      let start = 0
      if (e > 0.02) {
        const ui = Math.sqrt(clamp(e)) * 0.35
        start = OPEN_INFLATE_AT + ui * (1 - OPEN_INFLATE_AT)
      }
      state = 'opening'
      t = start
      mt = start * feel.open
      fresh = start === 0
      seed++
      waited = 0
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
      const e = extent()
      state = 'closing'
      t = 0.9 * Math.sqrt(clamp(1 - e))
      mt = 0
      const ms = Math.round(((1 - t) * feel.close * 1000) / speed())
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
      const nextFeel = (opts.feel ?? EMERGE_FEEL)[presetName]
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
      host.removeAttribute(EMERGE_STATE_ATTR)
      host.removeAttribute(EMERGE_STILL_ATTR)
      host.style.removeProperty(EMERGE_CONTENT_VAR)
      host.style.removeProperty(EMERGE_CLOSE_VAR)
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

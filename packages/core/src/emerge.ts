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
  type EmergeDripOptions,
  type EmergeMomentumEffects,
} from './emerge-momentum'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import {
  EMERGE_SURFACE_FOREGROUND_VAR,
  EMERGE_SURFACE_VAR,
  EMERGE_TINT_ATTR,
  resolveSurfaceColors,
  type EmergeSurfaceColor,
  type EmergeSurfaceColors,
} from './surface-color'
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
  /** Flow mode (`flow: true`): open / close durations (s) at speed 1. Default 1.25x / 1.2x
   *  `open` / `close`. */
  flowOpen?: number
  flowClose?: number
  /** Flow mode: neck thickness as a fraction of the anchor's facing edge. Default 0.46. */
  flowNeck?: number
}

export const EMERGE_FEEL: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.42, close: 0.28, bulb: 0.34, decay: 7, travel: 0.45, snap: 0.45, softness: 4, flowOpen: 0.5, flowClose: 0.32, flowNeck: 0.38 }),
  playful: Object.freeze({ open: 0.56, close: 0.34, bulb: 0.42, decay: 4.5, travel: 1, snap: 0.65, softness: 5, flowOpen: 0.68, flowClose: 0.4, flowNeck: 0.46 }),
  wild: Object.freeze({ open: 0.72, close: 0.4, bulb: 0.5, decay: 3, travel: 1.6, snap: 0.9, softness: 6, flowOpen: 0.86, flowClose: 0.48, flowNeck: 0.56 }),
})

/** Effect toggles. All default true, except `flow` (default false). */
export interface EmergeEffects {
  /** Flow out of the anchor (default false): goo bulges out of the anchor's facing edge,
   *  runs across the gap as a thick neck and swells into the panel at its final rect; the
   *  neck then pinches off with a wobble. Close sucks it back up the neck into the anchor.
   *  false: the panel inflates from a bulb at the anchor edge (the original emerge). */
  flow?: boolean
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
/** Flow mode: root circles along the anchor edge, and neck lumps from there to the panel. */
export const EMERGE_FLOW_ROOT = 3
export const EMERGE_FLOW_NECK = 4
/** Circles a pose always returns (zero radius when unused): bulb + neck lumps, or in flow
 *  mode root + neck. */
export const EMERGE_CIRCLES = Math.max(1 + EMERGE_NECK_LUMPS, EMERGE_FLOW_ROOT + EMERGE_FLOW_NECK)

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
  /** The anchor's facing edge as a cross range, panel-local (flow mode spreads over it). */
  anchorLo: number
  anchorHi: number
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
    anchorLo: a0,
    anchorHi: a1,
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
  flow: fx.flow === true,
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
  if (fx.flow) return flowPose(tt, b, phase, feel, fx)
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

// ---- flow mode ----------------------------------------------------------------------------
// The goo flows out of the anchor instead of inflating next to it. Root circles sit ON the
// anchor's facing edge (tucked in by FLOW.overlap px only, so the goo never paints over the
// anchor itself), swell out of it as a wide dome, and a head the width of the neck runs out
// with inertia toward the panel's far side while its breadth swells (lagging) to the
// panel's. The near edge then lets go of the anchor with a momentum launch that stretches
// the thick neck, which pinches off with a wobble; the root stubs wobble back into the edge.
// Close is the reverse with an accelerating suck: the near edge reattaches, the far edge and
// breadth shrink back up the neck to a head, and head, neck and root drain into the edge.

/** Flow mode: open-phase time by which the panel has landed (open momentum keys off it). */
export const EMERGE_FLOW_LAND = 0.6

const FLOW = {
  bulge: 0.2,
  tipAt: 0.1,
  tipLen: 0.6,
  swellAt: 0.28,
  swellLen: 0.55,
  detachAt: 0.4,
  detachLen: 0.42,
  pinchAt: 0.58,
  pinchLen: 0.16,
  recoil: 0.3,
  fadeAt: 0.6,
  fadeLen: 0.3,
  /** How far (px) the root / attached body tuck into the anchor edge (hides the seam). */
  overlap: 3,
} as const
const FLOW_ROOT_SIZE = [0.86, 1.1, 0.86] as const
const FLOW_NECK_SIZE = [1, 0.84, 0.88, 1] as const

/** Flow open / close duration (s) at speed 1 for `feel`. */
export function emergeFlowDuration(feel: EmergeFeel, phase: EmergePhase): number {
  return phase === 'open' ? (feel.flowOpen ?? feel.open * 1.25) : (feel.flowClose ?? feel.close * 1.2)
}

function flowGeom(b: EmergeBridge, feel: EmergeFeel) {
  const aB = Math.max(0, b.anchorHi - b.anchorLo)
  const edgeLen = aB > 0 ? aB : 36
  const cap = Math.max(10, Math.min(b.breadth > 0 ? b.breadth : 36, edgeLen, 140))
  const nw = clamp((feel.flowNeck ?? 0.46) * edgeLen, 10, cap)
  const rr = clamp(nw * 0.3, 4, 20)
  const hw = clamp(nw * 0.8, 8, Math.max(8, b.breadth))
  const hd = clamp(nw * 0.6, 8, Math.max(8, b.depth))
  // Root circles spread over the neck's width, kept on the anchor's edge.
  const lo = b.anchorLo + rr * 0.5
  const hi = b.anchorHi - rr * 0.5
  const rootCross = [-1, 0, 1].map((k) => (hi > lo ? clamp(b.sourceCross + k * (nw / 2 - rr), lo, hi) : b.sourceCross))
  return { rr, hw, hd, rootCross, edge: -b.gap - FLOW.overlap }
}

function flowPose(t: number, b: EmergeBridge, phase: EmergePhase, feel: EmergeFeel, fx: Required<EmergeEffects>): EmergePose {
  const circles: EmergeCircle[] = Array.from({ length: EMERGE_CIRCLES }, zero)
  if (phase === 'close' && t >= 1) return { body: { cx: 0, cy: 0, w: 0, h: 0 }, circles, content: 0 }
  if (phase === 'open' && t >= 1) return emergeRestPose(b)
  const g = flowGeom(b, feel)
  let slab: Slab
  let rootR: number
  let neckR: number
  let pull = 0
  let content: number
  if (phase === 'open') {
    const s1 = Math.max(0, emergeJelly(t / FLOW.bulge, feel.decay * 1.4, fx.wobble))
    const reach = emergeJelly(clamp((t - FLOW.tipAt) / FLOW.tipLen), feel.decay, fx.wobble)
    const dq = clamp((t - FLOW.detachAt) / FLOW.detachLen)
    const launch = fx.momentum ? feel.travel * b.bulb * hump(dq, 0.7) : 0
    const near = lerp(g.edge, 0, smooth(dq * 1.6)) + launch
    const far = Math.max(near + 1, lerp(g.edge + g.hd * s1, b.depth, reach))
    const cq = Math.min(1.08, emergeJelly(clamp((t - FLOW.swellAt) / FLOW.swellLen), feel.decay * 1.15, fx.wobble))
    slab = {
      near,
      extent: (far - near) * Math.min(1, s1 * 4),
      crossCenter: lerp(b.sourceCross, b.breadth / 2, clamp(cq)),
      crossSize: Math.max(0, lerp(g.hw * (0.7 + 0.3 * s1), b.breadth, cq)),
    }
    // Pinch: the neck thins (wobbling) and its halves recoil into root and panel; the root
    // stubs then wobble back into the anchor edge.
    const pq = clamp((t - FLOW.pinchAt) / FLOW.pinchLen)
    const kr = clamp((t - FLOW.pinchAt) / FLOW.recoil)
    const wob = fx.wobble && kr > 0 ? 0.25 * Math.sin(kr * 3 * Math.PI) * (1 - kr) : 0
    rootR = g.rr * s1 * (1 - smooth(kr)) * (1 + wob)
    const pinchWob = fx.wobble && pq > 0 ? 0.18 * Math.sin(pq * 2 * Math.PI) : 0
    neckR = g.rr * 0.95 * s1 * (1 - smooth(pq)) * (1 + pinchWob)
    pull = smooth(pq)
    content = fx.fade ? smooth((t - FLOW.fadeAt) / FLOW.fadeLen) : 1
  } else {
    const attach = smooth(t / 0.3)
    const cs = smooth(t / 0.6)
    const suck = smooth((t - 0.62) / 0.38)
    const near = lerp(0, g.edge, attach)
    const headFar = lerp(g.edge + g.hd, g.edge, suck)
    const far = Math.max(near, lerp(b.depth, headFar, smooth(t / 0.75) ** 1.3))
    slab = {
      near,
      extent: far - near,
      crossCenter: lerp(b.breadth / 2, b.sourceCross, cs),
      crossSize: lerp(b.breadth, g.hw, cs) * (1 - 0.85 * suck),
    }
    const grow = smooth(t / 0.25)
    rootR = g.rr * grow * (1 - smooth((t - 0.72) / 0.28))
    neckR = g.rr * 0.95 * grow * (1 - suck)
    content = fx.fade ? 1 - smooth(t / 0.2) : 0
  }
  const body = slabToBody(slab, b)
  if (fx.bridge) {
    const rootMain = (r: number): number => g.edge + r
    for (let k = 0; k < EMERGE_FLOW_ROOT; k++) {
      const r = Math.max(0, rootR * FLOW_ROOT_SIZE[k]!)
      if (r < 0.3) continue
      const p = toLocal(b, rootMain(r), g.rootCross[k]!)
      circles[k] = { x: p.x, y: p.y, r }
    }
    if (neckR > 0.3) {
      const m0 = rootMain(Math.max(rootR, neckR))
      const half = slab.crossSize / 2
      const c1 = clamp(b.sourceCross, slab.crossCenter - half, slab.crossCenter + half)
      const m1 = slab.near + Math.min(neckR, Math.max(0, slab.extent) / 2)
      for (let k = 0; k < EMERGE_FLOW_NECK; k++) {
        const f = (k + 0.5) / EMERGE_FLOW_NECK
        // After the pinch, the root-side half recoils to the root, the rest into the panel.
        const ff = lerp(f, k < EMERGE_FLOW_NECK / 2 ? 0 : 1, pull * 0.85)
        const p = toLocal(b, lerp(m0, m1, ff), lerp(b.sourceCross, c1, ff))
        circles[EMERGE_FLOW_ROOT + k] = { x: p.x, y: p.y, r: Math.max(0, neckR * FLOW_NECK_SIZE[k]!) }
      }
    }
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

/** Like `emergeOverflow`, split into the screen-bottom overhang and the rest (top, left,
 *  right): falling drops only need room below, so the goo layer stays small elsewhere. */
export function emergeOverflowSides(pose: EmergePose, width: number, height: number): { side: number; bottom: number } {
  let side = 0
  let bottom = 0
  const box = (x0: number, y0: number, x1: number, y1: number): void => {
    side = Math.max(side, -x0, -y0, x1 - width)
    bottom = Math.max(bottom, y1 - height)
  }
  const { body } = pose
  if (body.w > 0 && body.h > 0) box(body.cx - body.w / 2, body.cy - body.h / 2, body.cx + body.w / 2, body.cy + body.h / 2)
  for (const c of pose.circles) if (c.r > 0) box(c.x - c.r, c.y - c.r, c.x + c.r, c.y + c.r)
  return { side: Math.max(0, side), bottom: Math.max(0, bottom) }
}

// ---- DOM ----------------------------------------------------------------------------------

export type EmergeState = 'closed' | 'opening' | 'open' | 'closing'

export interface EmergeOptions extends EmergeEffects, EmergeMomentumEffects, EmergeDripOptions {
  /** What the goo emerges from: an element, or a getter returning its rect (same space as
   *  `host.getBoundingClientRect()`). */
  anchor?: Element | (() => Element | EmergeRect | null | undefined) | null
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
  /** Color of the goo panel, bridge and drops, and of the content text: 'trigger' (default:
   *  the anchor element's background, see surface-color.ts for the rule and its fallback),
   *  'popover' (the host's own CSS, `--goop-color`), a CSS color, a resolved pair, or a
   *  getter. Resolved on every `open()` and published as `--goop-surface` /
   *  `--goop-surface-foreground` on the host (with `data-goop-tint`). */
  surfaceColor?: EmergeSurfaceColor
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
  /** The surface colors resolved at the last open (null: the host's own CSS). */
  readonly colors: EmergeSurfaceColors | null
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
  let padBottom = -1
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
  const flowOn = (): boolean => opts.flow === true
  /** Phase duration (s) at speed 1: flow mode has its own. */
  const phaseDur = (phase: EmergePhase): number =>
    flowOn() ? emergeFlowDuration(feel, phase) : phase === 'open' ? feel.open : feel.close
  /** Flow mode: open momentum (slosh, burst) waits for the panel to land. */
  const shift = (): number => (flowOn() ? Math.max(0, EMERGE_FLOW_LAND * phaseDur('open') - 0.12) : 0)
  const closeMs = (): number => (reduced ? 0 : Math.round((phaseDur('close') * 1000) / speed()))

  const rectOf = (el: Element): EmergeRect => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, width: r.width, height: r.height }
  }
  const anchorTarget = (): Element | EmergeRect | null => {
    const a = opts.anchor
    if (!a) return null
    return typeof a === 'function' ? (a() ?? null) : a
  }
  const anchorRect = (): EmergeRect | null => {
    const a = anchorTarget()
    if (!a) return null
    return 'getBoundingClientRect' in a ? rectOf(a) : a
  }

  let colors: EmergeSurfaceColors | null = null
  /** Resolve the surface colors now (on open, so a reopen picks up theme / trigger changes). */
  const applyColors = (): void => {
    const a = anchorTarget()
    colors = resolveSurfaceColors(opts.surfaceColor, a && 'getBoundingClientRect' in a ? a : null, host)
    if (colors) {
      host.style.setProperty(EMERGE_SURFACE_VAR, colors.background)
      host.style.setProperty(EMERGE_SURFACE_FOREGROUND_VAR, colors.foreground)
      host.setAttribute(EMERGE_TINT_ATTR, '')
    } else clearColors()
  }
  const clearColors = (): void => {
    host.style.removeProperty(EMERGE_SURFACE_VAR)
    host.style.removeProperty(EMERGE_SURFACE_FOREGROUND_VAR)
    host.removeAttribute(EMERGE_TINT_ATTR)
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

  const setPad = (side: number, bottom: number): void => {
    if (!renderer || (side === pad && bottom === padBottom)) return
    pad = side
    padBottom = bottom
    renderer.setPadding({ side, bottom })
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
    const need = emergeOverflowSides(pose, W, H)
    // Grow in 8px steps while animating, shrink back at rest. Room below for falling drops.
    const step = (px: number): number => (px > 0 ? blur + Math.ceil(px / 8) * 8 : blur)
    setPad(step(Math.ceil(need.side)), Math.max(step(Math.ceil(need.side)), step(Math.ceil(need.bottom))))
    host.style.setProperty(EMERGE_CONTENT_VAR, String(Math.round(pose.content * 1000) / 1000))
  }

  const drawNow = (): void => {
    const b = bridge()
    let pose: EmergePose
    if (state === 'open' || (reduced && state === 'opening')) pose = emergeRestPose(b)
    else if (state === 'closed' || (reduced && state === 'closing')) pose = emergePose(1, b, 'close', feel, opts)
    else pose = emergePose(t, b, state === 'opening' ? 'open' : 'close', feel, opts)
    const phase: EmergePhase = state === 'open' || state === 'opening' ? 'open' : 'close'
    const sec = phase === 'open' ? mt - shift() : mt
    if (!reduced && state !== 'closed' && sec >= 0 && sec < emergeMomentumEnd(phase)) {
      const fx = { ...opts, openDrips: fresh ? opts.openDrips : false }
      pose = emergeMomentum(pose, b, phase, sec, fx, {
        preset: presetName,
        seed,
        bodyAt: (s) => emergePose((s + shift()) / phaseDur('open'), b, 'open', feel, opts).body,
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
    padBottom = -1
    blobs = Array.from({ length: EMERGE_CIRCLES + EMERGE_MOMENTUM_CIRCLES }, () => renderer!.createBlob())
    drawNow()
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    if (state === 'open' && !reduced && mt - shift() < emergeMomentumEnd('open')) {
      // Open finished; the slosh and drops play out.
      mt += dt * speed()
      drawNow()
      return mt - shift() < emergeMomentumEnd('open')
    }
    if (state !== 'opening' && state !== 'closing') return false
    if (state === 'opening' && t === 0 && opts.ready && !opts.ready() && waited++ < READY_MAX_FRAMES) {
      drawNow()
      return true
    }
    const dur = phaseDur(state === 'opening' ? 'open' : 'close') / speed()
    t = Math.min(1, t + dt / dur)
    mt += dt * speed()
    if (t >= 1) {
      state = state === 'opening' ? 'open' : 'closed'
      syncAttrs()
      drawNow()
      return state === 'open' && !reduced && mt - shift() < emergeMomentumEnd('open')
    }
    drawNow()
    return true
  }

  /** Approximate time in the other phase with the same body extent (smooth reversal). */
  const extent = (): number => {
    if (state === 'open') return 1
    if (state === 'closed') return 0
    // Flow mode: a phase's progress mirrors the other's (close replays the open in reverse).
    if (flowOn()) return state === 'closing' ? 1 - t : t
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
      applyColors()
      if (reduced) {
        state = 'open'
        syncAttrs()
        drawNow()
        return
      }
      const e = extent()
      // Resume part-way through the inflate when reversing a close.
      let start = 0
      if (flowOn()) start = e > 0.02 ? clamp(e, 0, 0.95) : 0
      else if (e > 0.02) {
        const ui = Math.sqrt(clamp(e)) * 0.35
        start = OPEN_INFLATE_AT + ui * (1 - OPEN_INFLATE_AT)
      }
      state = 'opening'
      t = start
      mt = start * phaseDur('open')
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
      t = flowOn() ? clamp(1 - e) : 0.9 * Math.sqrt(clamp(1 - e))
      mt = 0
      const ms = Math.round(((1 - t) * phaseDur('close') * 1000) / speed())
      syncAttrs(ms)
      drawNow()
      wakeTicker(tick)
      return ms
    },
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      const colorChanged = 'surfaceColor' in next && next.surfaceColor !== opts.surfaceColor
      opts = { ...opts, ...next }
      if (colorChanged && state !== 'closed') applyColors()
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
    get colors() {
      return colors
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
      clearColors()
      host.style.removeProperty(EMERGE_CONTENT_VAR)
      host.style.removeProperty(EMERGE_CLOSE_VAR)
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

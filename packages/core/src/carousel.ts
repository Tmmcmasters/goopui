// Carousel goo (GoopCarousel): slides that feel like jelly, plus goo dots.
//
// Everything is driven by the slides' real motion (embla, or any other scroller, moves them;
// core reads where each slide is every frame and derives its velocity). Three slide effects,
// each its own toggle:
//
// - `stretch`: while a slide travels it stretches a little along the motion (and thins a touch
//   across it), with momentum: a damped spring chases a stretch proportional to its speed. When
//   the slide snaps and stops, the spring overshoots into a slight squash and wobbles back, the
//   jelly settle. Applied with the CSS `scale` property on the slide's surface (it composes with
//   any transform and never changes layout).
// - `slosh`: the slide's leading and trailing edges are goo with inertia (the Sidebar's edge sim,
//   `./sidebar`, with the carousel's own feel table). The trailing edge drags behind while it
//   travels and braking kicks low, wide mounds out of the leading edge, then they slosh back.
//   The mounds are one or two raised-cosine humps re-rolled for every motion (never a knob).
// - `rubberBand`: dragging past the first / last slide leaves a gap between the carousel's edge
//   and that slide; the slide's outer edge reaches back into the gap as ONE low, wide mound
//   (a raised cosine over the whole edge, slightly off-centre), sprung, so it lags and wobbles.
//   It never crosses the carousel's edge (it is clamped to the gap), so it is never clipped.
//
// Slosh and rubber band are drawn in the slide's own colour: core finds the slide's surface (an
// element marked `data-goop-surface`, else the first descendant that paints a background, e.g.
// a Card) and redraws that surface's rounded box as one aria-hidden <svg> path (its background,
// border and radius read from it) with the edges pushed out, behind its content (z-index -1 in
// its own stacking context). No filter. At rest the svg hides and the surface shows as it is.
// The goo is ink overflow inside the carousel's clipped viewport, so it never changes the page's
// scroll size, and nothing ever changes layout.
//
// Dots (`attachCarouselDots`): the active dot is the Tabs indicator's goo blob (the menu
// highlight engine) that flows between dots with momentum and lands with a jelly overshoot.
//
// Reduced motion: none of the slide effects run (the slides just move) and the dot blob snaps.
// No DOM access until an attach runs (SSR-safe); the sim and path helpers are pure.

import type { GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { attachMenuHighlight, MENU_CONTAINER_ATTR, type MenuFeel, type MenuHighlightHandle } from './menu'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import {
  createSidebarEdge,
  kickSidebarEdge,
  rerollSidebarEdge,
  sidebarEdgeAt,
  sidebarEdgeBulge,
  sidebarEdgeCount,
  sidebarEdgeSettled,
  sidebarRandom,
  stepSidebarEdge,
  type SidebarEdge,
  type SidebarEdgeFeel,
} from './sidebar'
import { TABS_FEEL, type TabsIndicatorOptions } from './tabs'
import { readPreset } from './tuning'

/** Every individually toggleable carousel effect (GoopCarousel props). Core runs `stretch`,
 *  `slosh`, `rubberBand` and `dots`; `squish` (Previous / Next are GoopButtons) is the
 *  adapters' wiring. */
export const CAROUSEL_EFFECTS = ['stretch', 'slosh', 'rubberBand', 'squish', 'dots'] as const
export type CarouselEffect = (typeof CAROUSEL_EFFECTS)[number]

/** Scroll axis (embla's `axis`; shadcn's `orientation` horizontal = 'x'). */
export type CarouselAxis = 'x' | 'y'

/** Per-preset feel of the slide goo. Lengths in px, times in s. */
export interface CarouselFeel {
  /** Slosh: sim column spacing along an edge. */
  spacing: number
  /** Slosh: largest outward bulge (keep it well under the gap between slides). */
  bulge: number
  /** Slosh: largest inward offset (drawn as nothing; only shapes the rebound). */
  dip: number
  /** Slosh: column spring period. */
  response: number
  /** Slosh: damping ratio at strength 1. */
  damping: number
  /** Slosh: neighbour tension, 0..1. */
  coupling: number
  /** Slosh: share of the slide's velocity change (px/s) handed to the goo as a kick. */
  kick: number
  /** Slosh: trailing offset per px/s of slide velocity. */
  lag: number
  /** Stretch: largest growth per side along the motion (px). */
  stretch: number
  /** Stretch: growth per side per px/s of slide speed. */
  stretchGain: number
  /** Stretch: spring period (s). */
  stretchResponse: number
  /** Stretch: damping ratio (under 1 wobbles on the snap). */
  stretchDamping: number
  /** Stretch: extra push into the squash as the slide brakes (share of how fast the stretch
   *  target falls), so the snap ends in a visible jelly wobble. */
  stretchKick: number
  /** Rubber band: tallest mound (px; also capped at a share of the edge, so it stays low). */
  band: number
  /** Rubber band: mound height per px of overscroll (under 1: never reaches the wall). */
  bandGain: number
  /** Rubber band: spring period (s). */
  bandResponse: number
  /** Rubber band: damping ratio. */
  bandDamping: number
}

export const CAROUSEL_FEEL: Readonly<Record<GoopPreset, Readonly<CarouselFeel>>> = Object.freeze({
  subtle: Object.freeze({
    spacing: 30, bulge: 3, dip: 3, response: 0.34, damping: 0.55, coupling: 0.42, kick: 0.035, lag: 0.0016,
    stretch: 2, stretchGain: 0.0025, stretchResponse: 0.3, stretchDamping: 0.5, stretchKick: 0.8,
    band: 10, bandGain: 0.4, bandResponse: 0.22, bandDamping: 0.7,
  }),
  playful: Object.freeze({
    spacing: 26, bulge: 5, dip: 5, response: 0.4, damping: 0.34, coupling: 0.38, kick: 0.06, lag: 0.003,
    stretch: 3, stretchGain: 0.004, stretchResponse: 0.36, stretchDamping: 0.3, stretchKick: 1.6,
    band: 18, bandGain: 0.5, bandResponse: 0.24, bandDamping: 0.55,
  }),
  wild: Object.freeze({
    spacing: 24, bulge: 8, dip: 7, response: 0.48, damping: 0.22, coupling: 0.34, kick: 0.1, lag: 0.0048,
    stretch: 5, stretchGain: 0.006, stretchResponse: 0.42, stretchDamping: 0.2, stretchKick: 2.4,
    band: 28, bandGain: 0.6, bandResponse: 0.26, bandDamping: 0.42,
  }),
})

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
const fmt = (v: number): string => (Math.round(v * 100) / 100).toString()

/** The sidebar sim's feel from a carousel feel (it reads no render fields). */
const simFeel = (f: Readonly<CarouselFeel>): SidebarEdgeFeel => ({
  spacing: f.spacing,
  bulge: f.bulge,
  dip: f.dip,
  response: f.response,
  damping: f.damping,
  coupling: f.coupling,
  kick: f.kick,
  lag: f.lag,
  radius: 0,
  softness: 0,
})

// ---- springs (pure) -------------------------------------------------------------------------

/** A 1D damped spring (`x` position, `v` velocity). */
export interface CarouselSpring {
  x: number
  v: number
}

export const createCarouselSpring = (): CarouselSpring => ({ x: 0, v: 0 })

const SUB_DT = 1 / 240

/** Advance a spring toward `target` by `dt` s (mutates). `period` s, `zeta` damping ratio. */
export function stepCarouselSpring(s: CarouselSpring, dt: number, target: number, period: number, zeta: number): void {
  if (!(dt > 0) || !Number.isFinite(target)) return
  const w = (2 * Math.PI) / Math.max(0.02, period)
  let left = Math.min(dt, 0.1)
  while (left > 1e-6) {
    const h = Math.min(SUB_DT, left)
    left -= h
    s.v += (w * w * (target - s.x) - 2 * zeta * w * s.v) * h
    s.x += s.v * h
  }
}

export const carouselSpringSettled = (s: CarouselSpring, eps = 0.05): boolean => Math.abs(s.x) < eps && Math.abs(s.v) < eps * 10

// ---- stretch (pure) -------------------------------------------------------------------------

/** The stretch (px per side) a slide chases at `speed` px/s. `strength` 0..2. */
export function carouselStretchTarget(speed: number, length: number, feel: Readonly<CarouselFeel>, strength = 1): number {
  if (!(strength > 0) || !(length > 0)) return 0
  const cap = Math.min(feel.stretch * strength, length * 0.025 * strength)
  return clamp(Math.abs(speed) * feel.stretchGain * strength, 0, cap)
}

/** The slide brakes (its stretch target fell from `prev` to `next` px this frame): push the
 *  stretch spring on into a squash, so the snap ends in a jelly wobble (mutates). */
export function brakeCarouselStretch(s: CarouselSpring, prev: number, next: number, feel: Readonly<CarouselFeel>): void {
  if (!(next < prev)) return
  // The whole fall, summed over the frames, hands the spring a velocity of about
  // `fall * kick * ω`: an extra squash of roughly `kick` times the stretch it loses.
  s.v += (next - prev) * feel.stretchKick * ((2 * Math.PI) / Math.max(0.02, feel.stretchResponse))
}

/** CSS `scale` for a stretch of `px` per side on a slide `length` px long along `axis`: it grows
 *  along the motion and thins a little across it (and the reverse while it squashes). Pure. */
export function carouselStretchScale(px: number, length: number, axis: CarouselAxis = 'x'): string {
  if (!(length > 0) || Math.abs(px) < 0.01) return ''
  const along = 1 + (2 * px) / length
  const across = 1 - 0.4 * (along - 1)
  const a = (Math.round(along * 10000) / 10000).toString()
  const c = (Math.round(across * 10000) / 10000).toString()
  return axis === 'x' ? `${a} ${c}` : `${c} ${a}`
}

// ---- rubber band (pure) ---------------------------------------------------------------------

/** The rubber-band mound's profile at fraction `f` along the edge: one raised cosine over the
 *  whole edge, peaking at `centre` (0..1). Low and wide by construction, never a knob. */
export function carouselBandShape(f: number, centre = 0.5): number {
  const c = clamp(centre, 0.2, 0.8)
  const half = Math.max(c, 1 - c)
  const x = (clamp(f, 0, 1) - c) / half
  if (Math.abs(x) >= 1) return 0
  const k = Math.cos((Math.PI * x) / 2)
  return k * k
}

/** The mound height the band chases for `overscroll` px past an end, on an edge `length` px
 *  long. Capped by the feel and at 12% of the edge (a low mound), and always under the gap. */
export function carouselBandTarget(overscroll: number, length: number, feel: Readonly<CarouselFeel>, strength = 1): number {
  if (!(overscroll > 0) || !(strength > 0)) return 0
  const cap = Math.min(feel.band * strength, Math.max(0, length) * 0.12)
  return clamp(overscroll * feel.bandGain * Math.min(1, strength), 0, cap)
}

// ---- slosh sim (pure) -----------------------------------------------------------------------

/** Both scroll-axis edges of one slide. `start` is left / top, `end` right / bottom. Offsets
 *  are outward (away from the slide), px. */
export interface CarouselSlideEdges {
  start: SidebarEdge
  end: SidebarEdge
}

export function createCarouselSlideEdges(length: number, feel: Readonly<CarouselFeel> = CAROUSEL_FEEL.playful, rand: () => number = Math.random): CarouselSlideEdges {
  const n = sidebarEdgeCount(length, simFeel(feel))
  return { start: createSidebarEdge(n, rand), end: createSidebarEdge(n, rand) }
}

/**
 * Advance one slide's edges by `dt` s (mutates). `velocity` is the slide's speed along the
 * scroll axis (px/s, + = right / down); `dv` its change since the last step. The trailing edge
 * drags behind while it travels, and braking kicks the leading edge out (the goo keeps going).
 * `slosh` 0..2 scales it (0: nothing moves).
 */
export function stepCarouselSlide(
  edges: CarouselSlideEdges,
  dt: number,
  feel: Readonly<CarouselFeel>,
  velocity: number,
  dv: number,
  slosh = 1,
): void {
  const f = simFeel(feel)
  if (Math.abs(dv) > 1) {
    kickSidebarEdge(edges.end, dv, f, slosh)
    kickSidebarEdge(edges.start, -dv, f, slosh)
  }
  stepSidebarEdge(edges.end, dt, f, velocity, slosh)
  stepSidebarEdge(edges.start, dt, f, -velocity, slosh)
}

export function rerollCarouselSlide(edges: CarouselSlideEdges, rand: () => number = Math.random): void {
  rerollSidebarEdge(edges.start, rand)
  rerollSidebarEdge(edges.end, rand)
}

export function carouselSlideSettled(edges: CarouselSlideEdges): boolean {
  return sidebarEdgeSettled(edges.start) && sidebarEdgeSettled(edges.end)
}

/** Largest outward slosh bulge of a slide right now (px). */
export function carouselSlideBulge(edges: CarouselSlideEdges): number {
  return Math.max(sidebarEdgeBulge(edges.start), sidebarEdgeBulge(edges.end))
}

export function resetCarouselSlide(edges: CarouselSlideEdges): void {
  for (const e of [edges.start, edges.end]) for (let i = 0; i < e.d.length; i++) e.d[i] = e.v[i] = 0
}

/** A slide surface's box (its border box, px). */
export interface CarouselSurfaceBox {
  width: number
  height: number
  radius: number
  /** Border width: the path runs down the middle of the border. */
  border: number
}

/** A rubber-band mound on one edge: `height` px, peaking at `centre` (0..1 along the edge). */
export interface CarouselBand {
  height: number
  centre: number
}

/** Rubber-band mounds on a slide's start / end edges (omitted: none). */
export interface CarouselSlideBands {
  start?: CarouselBand | null
  end?: CarouselBand | null
}

/**
 * SVG path of the surface's rounded box with the scroll-axis edges pushed out by the slosh sim
 * plus any rubber-band mound (`start` = left / top, `end` = right / bottom), in the surface's
 * own coordinates (0,0 = its top-left border corner). Inward offsets are drawn flat; the offsets
 * fade out before each corner so the corners never move. Pure.
 */
export function carouselSlidePath(
  box: CarouselSurfaceBox,
  edges: CarouselSlideEdges | null,
  axis: CarouselAxis = 'x',
  bands: CarouselSlideBands = {},
): string {
  const { width: w, height: h, border } = box
  const i = border / 2
  const r = Math.max(0, Math.min(box.radius - i, (w - border) / 2, (h - border) / 2))
  const x0 = i
  const y0 = i
  const x1 = w - i
  const y1 = h - i
  const hx = Math.max(0, x1 - x0 - 2 * r)
  const vy = Math.max(0, y1 - y0 - 2 * r)
  let d = `M${fmt(x0 + r)} ${fmt(y0)}`
  // One straight edge of `len` px with the sim `edge` and `band` on it (either may be null);
  // `flip` when the walk runs against the edge's direction (bottom / left walk back).
  const walk = (
    len: number,
    edge: SidebarEdge | null,
    band: CarouselBand | null | undefined,
    flip: boolean,
    point: (s: number, out: number) => [number, number],
  ): void => {
    const end = point(len, 0)
    const hasEdge = !!edge && sidebarEdgeBulge(edge) >= 0.05
    const hasBand = !!band && band.height >= 0.05
    if (len <= 0 || (!hasEdge && !hasBand)) {
      d += `L${fmt(end[0])} ${fmt(end[1])}`
      return
    }
    const fade = Math.min(len / 2, 10)
    const steps = Math.max(8, Math.ceil(len / 4))
    for (let k = 0; k <= steps; k++) {
      const s = (len * k) / steps
      const f = flip ? 1 - s / len : s / len
      const edgeFade = Math.max(0, Math.min(1, s / fade, (len - s) / fade)) ** 2
      const slosh = hasEdge ? Math.max(0, sidebarEdgeAt(edge!, f)) * edgeFade : 0
      const mound = hasBand ? band!.height * carouselBandShape(f, band!.centre) : 0
      const p = point(s, slosh + mound)
      d += `L${fmt(p[0])} ${fmt(p[1])}`
    }
  }
  const arc = (x: number, y: number): void => {
    d += r > 0 ? `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y)}` : `L${fmt(x)} ${fmt(y)}`
  }
  const horiz = axis === 'x'
  const e = edges
  walk(hx, horiz ? null : (e?.start ?? null), horiz ? null : bands.start, false, (s, out) => [x0 + r + s, y0 - out])
  arc(x1, y0 + r)
  walk(vy, horiz ? (e?.end ?? null) : null, horiz ? bands.end : null, false, (s, out) => [x1 + out, y0 + r + s])
  arc(x1 - r, y1)
  walk(hx, horiz ? null : (e?.end ?? null), horiz ? null : bands.end, true, (s, out) => [x1 - r - s, y1 + out])
  arc(x0, y1 - r)
  walk(vy, horiz ? (e?.start ?? null) : null, horiz ? bands.start : null, true, (s, out) => [x0 - out, y1 - r - s])
  arc(x0 + r, y0)
  return `${d}Z`
}

// ---- DOM: slides ----------------------------------------------------------------------------

/** The slides core looks for inside the viewport (shadcn's CarouselItem markup). */
export const CAROUSEL_SLIDE_SELECTOR = '[data-slot="carousel-item"],[aria-roledescription="slide"]'
/** Attribute marking a slide's surface explicitly (otherwise core finds the first painted one). */
export const CAROUSEL_SURFACE_ATTR = 'data-goop-surface'
/** `data-goop` value of the goo svg core inserts into each surface. */
export const CAROUSEL_SLOSH_PART = 'carousel-slosh'

const SVG_NS = 'http://www.w3.org/2000/svg'
const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}
const painted = (bg: string | undefined): boolean => {
  if (!bg || bg === 'transparent') return false
  const m = /rgba?\(([^)]+)\)/.exec(bg)
  if (!m) return true
  const parts = m[1]!.split(/[\s,/]+/).filter(Boolean)
  return parts.length < 4 || px(parts[3]) > 0.05
}

/**
 * The surface of a slide whose box the goo redraws: an element marked `data-goop-surface`,
 * else the slide itself or its first descendant (breadth-first, a few levels deep) that paints
 * a background and covers most of the slide. Null when nothing paints (no jelly to draw).
 */
export function findCarouselSurface(slide: Element): HTMLElement | null {
  const marked = slide.matches(`[${CAROUSEL_SURFACE_ATTR}]`) ? slide : slide.querySelector(`[${CAROUSEL_SURFACE_ATTR}]`)
  if (marked) return marked as HTMLElement
  const win = slide.ownerDocument.defaultView
  if (!win) return null
  const sw = (slide as HTMLElement).offsetWidth || 0
  const sh = (slide as HTMLElement).offsetHeight || 0
  let level: Element[] = [slide]
  for (let depth = 0; depth < 5 && level.length; depth++) {
    const next: Element[] = []
    for (const el of level) {
      if (!(el instanceof win.HTMLElement)) continue
      if (el.getAttribute('data-goop') === CAROUSEL_SLOSH_PART) continue
      const big = !sw || !sh || (el.offsetWidth >= sw * 0.5 && el.offsetHeight >= sh * 0.5)
      if (big && painted(win.getComputedStyle(el).backgroundColor)) return el
      next.push(...el.children)
    }
    level = next
  }
  return null
}

export interface CarouselOptions {
  /** Slides stretch along the motion and wobble on the snap: `true` (default), `false` or 0..2. */
  stretch?: boolean | number
  /** Slide edges slosh in low, wide mounds: `true` (default), `false` or 0..2. */
  slosh?: boolean | number
  /** Gooey rubber band past the first / last slide: `true` (default), `false` or 0..2. */
  rubberBand?: boolean | number
  /** How far the content is dragged past an end right now, px: > 0 past the start, < 0 past the
   *  end, 0 inside (adapters read it from the scroller, e.g. embla's engine). Default: none. */
  overscroll?: () => number
  /** Scroll axis. Default 'x'. */
  axis?: CarouselAxis
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the viewport, then 'playful'. */
  preset?: GoopPreset
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
  /** Per-preset feel table. Default CAROUSEL_FEEL. */
  feel?: Readonly<Record<GoopPreset, Readonly<CarouselFeel>>>
  /** Seed for the mounds (tests). Default random. */
  seed?: number
}

export interface CarouselHandle {
  /** The slides are (about to be) moving: follow them until they and the goo settle. Call it
   *  from the scroller's scroll / pointer-down events (cheap to call every frame). */
  track(): void
  /** Re-scan the slides (they were added, removed or restyled). */
  refresh(): void
  update(opts?: CarouselOptions): void
  /** Largest outward bulge over all slides right now, slosh plus rubber band (px). */
  readonly bulge: number
  /** Largest stretch right now (px per side; negative while squashed). */
  readonly stretch: number
  /** Current rubber-band mound height (px; the larger of the two ends). */
  readonly band: number
  /** Slides are being followed or the goo is still moving. */
  readonly active: boolean
  readonly reducedMotion: boolean
  /** Number of slides the goo follows. */
  readonly slides: number
  destroy(): void
}

const strengthOf = (v: boolean | number | undefined): number => (v === false ? 0 : v === true || v === undefined ? 1 : clamp(Number(v) || 0, 0, 2))

/** Time constant of the speed the stretch follows (s). */
const STRETCH_SMOOTHING = 0.07

/** How long the slides may sit still after `track()` before core stops following them (s). */
const TRACK_GRACE = 0.3

interface SlideState {
  slide: HTMLElement
  /** The element that stretches (the surface, else the slide's first child). */
  body: HTMLElement | null
  surface: HTMLElement | null
  svg: SVGSVGElement | null
  path: SVGPathElement | null
  edges: CarouselSlideEdges
  box: CarouselSurfaceBox
  spring: CarouselSpring
  /** Last stretch target (px), to tell braking. */
  target: number
  /** Speed smoothed over STRETCH_SMOOTHING (px/s), what the stretch follows. */
  smooth: number
  last: number | null
  vel: number
  prevPosition: string
  prevIsolation: string
  prevScale: string
  shown: boolean
}

interface BandState {
  spring: CarouselSpring
  centre: number
}

/**
 * Attach the slide goo to a carousel `viewport` (the clipping element, embla's root). Finds the
 * slides inside (`CAROUSEL_SLIDE_SELECTOR`), stretches their surfaces with the CSS `scale`
 * property, and inserts into each surface an aria-hidden `<svg data-goop="carousel-slosh">` that
 * redraws it with goo edges. Call `track()` whenever the slides move; pointer-down and wheel on
 * the viewport also start it.
 */
export function attachCarousel(viewport: HTMLElement, options: CarouselOptions = {}): CarouselHandle {
  const doc = viewport.ownerDocument
  const win = doc.defaultView
  let opts: CarouselOptions = { ...options }
  let rand = sidebarRandom(opts.seed ?? Math.random())
  const feelOf = (): CarouselFeel => (opts.feel ?? CAROUSEL_FEEL)[readPreset(viewport, opts.preset)]
  let feel = feelOf()
  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  let destroyed = false
  let states: SlideState[] = []
  let still = TRACK_GRACE
  let running = false
  const bands: { start: BandState; end: BandState } = {
    start: { spring: createCarouselSpring(), centre: 0.5 },
    end: { spring: createCarouselSpring(), centre: 0.5 },
  }

  const axis = (): CarouselAxis => (opts.axis === 'y' ? 'y' : 'x')
  const stretchOn = (): number => strengthOf(opts.stretch)
  const sloshOn = (): number => strengthOf(opts.slosh)
  const bandOn = (): number => strengthOf(opts.rubberBand)
  const on = (): boolean => !reduced && (stretchOn() > 0 || sloshOn() > 0 || bandOn() > 0)
  const overscroll = (): number => {
    if (bandOn() <= 0 || !opts.overscroll) return 0
    const v = opts.overscroll()
    return Number.isFinite(v) ? v : 0
  }

  /** Length of a slide's body along the scroll axis, and of its surface edges across it. */
  const along = (s: SlideState): number => {
    const el = s.body
    if (!el) return 0
    return axis() === 'x' ? el.offsetWidth : el.offsetHeight
  }
  const edgeLength = (s: SlideState): number => (axis() === 'x' ? s.box.height : s.box.width)

  const measure = (s: SlideState): void => {
    if (!s.surface || !s.svg || !s.path) return
    const cs = win?.getComputedStyle(s.surface)
    const border = px(cs?.borderTopWidth)
    s.box = { width: s.surface.offsetWidth, height: s.surface.offsetHeight, radius: px(cs?.borderTopLeftRadius), border }
    const bg = cs?.backgroundColor ?? ''
    s.path.setAttribute('fill', painted(bg) ? bg : 'transparent')
    if (border > 0) {
      s.path.setAttribute('stroke', cs?.borderTopColor ?? 'transparent')
      s.path.setAttribute('stroke-width', String(border))
    } else s.path.removeAttribute('stroke')
    // The svg covers the border box (absolute inset is the padding box).
    s.svg.style.left = `${-border}px`
    s.svg.style.top = `${-border}px`
    s.svg.style.width = `${s.box.width}px`
    s.svg.style.height = `${s.box.height}px`
    const n = sidebarEdgeCount(edgeLength(s), simFeel(feel))
    if (n !== s.edges.start.d.length) s.edges = createCarouselSlideEdges(edgeLength(s), feel, rand)
  }

  const hide = (s: SlideState): void => {
    if (!s.shown || !s.svg) return
    s.shown = false
    s.svg.style.display = 'none'
  }

  const setScale = (s: SlideState, value: string): void => {
    if (!s.body) return
    s.body.style.scale = value || s.prevScale
  }

  const release = (s: SlideState): void => {
    s.svg?.remove()
    if (s.surface) {
      s.surface.style.position = s.prevPosition
      s.surface.style.isolation = s.prevIsolation
    }
    if (s.body) s.body.style.scale = s.prevScale
  }

  const scan = (): void => {
    // Slides of a carousel nested inside a slide belong to that carousel.
    const slides = [...viewport.querySelectorAll<HTMLElement>(CAROUSEL_SLIDE_SELECTOR)].filter((el) => {
      const outer = el.parentElement?.closest(CAROUSEL_SLIDE_SELECTOR)
      return !outer || !viewport.contains(outer)
    })
    const keep: SlideState[] = []
    for (const slide of slides) {
      const surface = findCarouselSurface(slide)
      const old = states.find((s) => s.slide === slide)
      if (old && old.surface === surface) {
        keep.push(old)
        continue
      }
      if (old) release(old)
      const child = slide.firstElementChild
      const body = surface ?? (child && 'style' in child ? (child as HTMLElement) : null)
      let svg: SVGSVGElement | null = null
      let path: SVGPathElement | null = null
      const prevPosition = surface?.style.position ?? ''
      const prevIsolation = surface?.style.isolation ?? ''
      if (surface) {
        svg = doc.createElementNS(SVG_NS, 'svg') as SVGSVGElement
        svg.setAttribute('aria-hidden', 'true')
        svg.setAttribute('focusable', 'false')
        svg.setAttribute('data-goop', CAROUSEL_SLOSH_PART)
        svg.style.cssText = 'position:absolute;overflow:visible;pointer-events:none;z-index:-1;display:none;'
        path = doc.createElementNS(SVG_NS, 'path') as SVGPathElement
        svg.append(path)
        if (win?.getComputedStyle(surface).position === 'static') surface.style.position = 'relative'
        surface.style.isolation = 'isolate'
        surface.prepend(svg)
      }
      const s: SlideState = {
        slide,
        body,
        surface,
        svg,
        path,
        edges: createCarouselSlideEdges(0, feel, rand),
        box: { width: 0, height: 0, radius: 0, border: 0 },
        spring: createCarouselSpring(),
        target: 0,
        smooth: 0,
        last: null,
        vel: 0,
        prevPosition,
        prevIsolation,
        prevScale: body?.style.scale ?? '',
        shown: false,
      }
      measure(s)
      keep.push(s)
    }
    for (const s of states) if (!keep.includes(s)) release(s)
    states = keep
  }

  const posOf = (s: SlideState): number => {
    const r = s.slide.getBoundingClientRect()
    return axis() === 'x' ? r.left : r.top
  }

  const resetAll = (): void => {
    for (const s of states) {
      resetCarouselSlide(s.edges)
      s.spring.x = s.spring.v = 0
      s.target = 0
      s.smooth = 0
      s.last = null
      s.vel = 0
      setScale(s, '')
      hide(s)
    }
    for (const b of [bands.start, bands.end]) b.spring.x = b.spring.v = 0
  }

  const settleAll = (): void => {
    removeTicker(tick)
    running = false
    resetAll()
  }

  /** The drawn band on a slide's edge: clamped to the gap so it never crosses the wall. */
  const bandFor = (b: BandState, gap: number): CarouselBand | null => {
    const hgt = Math.min(b.spring.x, Math.max(0, gap - 1))
    return hgt >= 0.05 ? { height: hgt, centre: b.centre } : null
  }

  const draw = (s: SlideState, start: CarouselBand | null, end: CarouselBand | null): void => {
    if (!s.svg || !s.path) return
    const slosh = sloshOn() > 0 ? carouselSlideBulge(s.edges) : 0
    if (slosh < 0.05 && !start && !end) return hide(s)
    if (!s.shown) {
      s.shown = true
      s.svg.style.display = ''
    }
    s.path.setAttribute('d', carouselSlidePath(s.box, sloshOn() > 0 ? s.edges : null, axis(), { start, end }))
  }

  const tick: Ticker = (rawDt) => {
    if (destroyed) return false
    if (!on()) {
      settleAll()
      return false
    }
    const dt = rawDt * Math.max(0.05, opts.speed ?? 1)
    const stretch = stretchOn()
    const slosh = sloshOn()
    const band = bandOn()
    const vp = viewport.getBoundingClientRect()
    const span = axis() === 'x' ? vp.width : vp.height
    let moving = false
    let settled = true
    for (const s of states) {
      const pos = posOf(s)
      let v = s.last === null || !(rawDt > 0) ? 0 : (pos - s.last) / rawDt
      // A loop teleport (the slide jumps a whole lap) is not motion.
      if (s.last !== null && Math.abs(pos - s.last) > Math.max(120, span * 0.5)) v = s.vel
      s.last = pos
      if (Math.abs(v) >= 1) moving = true
      const dv = v - s.vel
      // A new motion from rest bulges differently each time.
      if (Math.abs(s.vel) < 1 && Math.abs(v) >= 1) rerollCarouselSlide(s.edges, rand)
      s.vel = v
      if (slosh > 0) {
        stepCarouselSlide(s.edges, dt, feel, v, dv, slosh)
        if (!carouselSlideSettled(s.edges)) settled = false
      }
      if (stretch > 0 && s.body) {
        const len = along(s)
        const zeta = clamp(feel.stretchDamping / Math.max(0.5, stretch), 0.08, 1)
        // Smoothed speed: pointer moves and frames don't line up, and a frame with no move
        // must not read as braking (it would kick a squash mid-drag).
        s.smooth += (v - s.smooth) * (1 - Math.exp(-rawDt / STRETCH_SMOOTHING))
        const target = carouselStretchTarget(s.smooth, len, feel, stretch)
        brakeCarouselStretch(s.spring, s.target, target, feel)
        s.target = target
        stepCarouselSpring(s.spring, dt, target, feel.stretchResponse, zeta)
        if (!carouselSpringSettled(s.spring, 0.02)) settled = false
        setScale(s, carouselStretchScale(s.spring.x, len, axis()))
      }
    }
    // Rubber band: the first / last slide's outer edge reaches back toward the wall.
    const over = band > 0 ? overscroll() : 0
    const first = states[0]
    const last = states[states.length - 1]
    let startBand: CarouselBand | null = null
    let endBand: CarouselBand | null = null
    if (band > 0) {
      const zeta = clamp(feel.bandDamping / Math.max(0.5, band), 0.1, 1)
      const sides = [
        { b: bands.start, gap: Math.max(0, over), s: first },
        { b: bands.end, gap: Math.max(0, -over), s: last },
      ]
      for (const side of sides) {
        const len = side.s ? edgeLength(side.s) : 0
        // A new pull from rest reaches out at a slightly different place each time.
        if (side.gap > 0 && side.b.spring.x < 0.05 && side.b.spring.v <= 0.5) side.b.centre = 0.4 + 0.2 * rand()
        stepCarouselSpring(side.b.spring, dt, carouselBandTarget(side.gap, len, feel, band), feel.bandResponse, zeta)
        if (side.b.spring.x < 0) side.b.spring.x = 0
        if (!carouselSpringSettled(side.b.spring) || side.gap > 0) settled = false
      }
      // The stretch also pushes the outer edge toward the wall: leave room for it.
      const grow = (s: SlideState | undefined): number => Math.max(0, s?.spring.x ?? 0)
      startBand = bandFor(bands.start, Math.max(0, over) - grow(first))
      endBand = bandFor(bands.end, Math.max(0, -over) - grow(last))
    }
    for (const s of states) {
      const sb = s === first ? startBand : null
      const eb = s === last ? endBand : null
      draw(s, sb, eb)
    }
    still = moving ? 0 : still + rawDt
    if (still >= TRACK_GRACE && settled) {
      running = false
      resetAll()
      return false
    }
    return true
  }

  const track = (): void => {
    if (destroyed || !on() || !states.length) return
    if (!running) {
      for (const s of states) {
        s.last = posOf(s)
        s.vel = 0
        s.smooth = 0
      }
      running = true
    }
    still = 0
    wakeTicker(tick)
  }

  scan()

  const onPointer = (): void => track()
  viewport.addEventListener('pointerdown', onPointer, { passive: true })
  viewport.addEventListener('wheel', onPointer, { passive: true })

  const ro = win?.ResizeObserver
    ? new win.ResizeObserver(() => {
        for (const s of states) measure(s)
      })
    : null
  ro?.observe(viewport)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) settleAll()
  })

  return {
    track,
    refresh() {
      if (destroyed) return
      scan()
      for (const s of states) measure(s)
    },
    update(next = {}) {
      if (destroyed) return
      const axisChanged = 'axis' in next && next.axis !== opts.axis
      opts = { ...opts, ...next }
      if ('seed' in next && next.seed !== undefined) rand = sidebarRandom(next.seed)
      feel = feelOf()
      reduced = readReduced()
      if (axisChanged) settleAll()
      for (const s of states) measure(s)
      if (!on()) settleAll()
    },
    get bulge() {
      let m = 0
      for (const s of states) m = Math.max(m, carouselSlideBulge(s.edges))
      return Math.max(m, bands.start.spring.x, bands.end.spring.x)
    },
    get stretch() {
      let m = 0
      for (const s of states) if (Math.abs(s.spring.x) > Math.abs(m)) m = s.spring.x
      return m
    },
    get band() {
      return Math.max(0, bands.start.spring.x, bands.end.spring.x)
    },
    get active() {
      return running
    },
    get reducedMotion() {
      return reduced
    },
    get slides() {
      return states.length
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      ro?.disconnect()
      unwatch()
      viewport.removeEventListener('pointerdown', onPointer)
      viewport.removeEventListener('wheel', onPointer)
      for (const s of states) release(s)
      states = []
    },
  }
}

// ---- DOM: dots ------------------------------------------------------------------------------

/** The dot buttons the dots blob rides; the active one carries `data-state="active"`. */
export const CAROUSEL_DOT_SELECTOR = '[data-goop-carousel-dot]'

/** Per-preset feel of the dots blob: the Tabs indicator's (it travels sideways between items). */
export const CAROUSEL_DOTS_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = TABS_FEEL

/** The active dot of `list` (dots of nested carousels are skipped). */
export function findActiveCarouselDot(list: Element): Element | null {
  for (const el of list.querySelectorAll(`${CAROUSEL_DOT_SELECTOR}[data-state="active"]`)) {
    const owner = el.closest(`[${MENU_CONTAINER_ATTR}]`)
    if (owner === list || owner === null) return el
  }
  return null
}

/** Dots options: the Tabs indicator's (feel defaults to CAROUSEL_DOTS_FEEL). */
export type CarouselDotsOptions = TabsIndicatorOptions

/**
 * Attach the goo dots blob to a dot list: the active dot's fill is a goo blob that flows to
 * the next active dot with momentum, stretching on the way and landing with a jelly
 * overshoot. Inserts an aria-hidden `[data-goop="highlight"]` element behind the dots
 * (colored by `--goop-color` on it). Reduced motion: the blob snaps.
 */
export function attachCarouselDots(list: HTMLElement, options: CarouselDotsOptions = {}): MenuHighlightHandle {
  return attachMenuHighlight(list, { feel: CAROUSEL_DOTS_FEEL, ...options, pop: false, followPointer: false, find: findActiveCarouselDot })
}

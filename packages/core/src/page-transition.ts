// Page transition: a thick band of goo pours in from one edge of the viewport, slows over
// the middle of the screen (the route swaps there, cover() resolves), holds while the next
// page gets ready, then flows on and out the far edge. Part of the page stays visible above
// and below the band for most of the run, so it never reads as a full-screen blackout.
// `band: false` gives the older wall instead: it covers the whole viewport, then drains.
//
// Rendering: one fixed, full-viewport, aria-hidden <svg> with one <path> (plus an optional
// accent path for a coloured lip on the moving edges and round the bubbles), rewritten once
// per frame. No SVG filter, no canvas, no WebGL: the goo look comes from the edge shape
// itself. Cost per frame: ~2 x PAGE_TRANSITION_SAMPLES points for the band's outline, plus
// PAGE_TRANSITION_HOLE_POINTS per live bubble. The overlay is position: fixed, so it never
// adds to the page's scroll size.
//
// The edges: the band's leading front and its trailing edge. Each edge is flat plus a few
// low, wide raised-cosine mounds (the `emergeMound` profile: zero slope at the peak and
// where it meets the edge, asymmetric widths), re-rolled every transition, so it never
// repeats and is never a symmetric centred bump. Mounds always point into the empty side:
// the front bulges ahead, the trailing edge stretches back (poured goo lagging behind).
// Their height follows the edge's speed with a lag (momentum overshoot when the band
// brakes). The sides drag a little against the viewport walls (meniscus). Mounds wobble in
// height and drift along the edge while they move.
//
// Bubbles: a few see-through holes (true cut-outs: hole subpaths with fill-rule evenodd, so
// the page shows through them) of mixed sizes, carried by the goo but rising through it,
// against the pour. They wobble (never perfect circles), squash a little as they
// accelerate, and some merge (the smaller one is drawn as a lobe of the bigger that slides
// in, so the two never overlap). One that reaches the band's edge pops into it: the hole
// collapses into the edge, which dips into the goo where it popped (a low, wide notch),
// then relaxes. Holes are clamped inside the band's body. Re-rolled every transition;
// nothing is left at idle.
//
// Split (`split: true`, the default with the band): the band is the seam between the two
// pages. cover() snapshots the old page and resolves once the DOM may change; reveal() says
// the new page is ready. The band then sweeps the whole way through in one go: behind its
// trailing edge is the new page, ahead of its front the old one, and no swap is ever seen.
// The old page is clipped to the region ahead of the front (a little inside the goo, so the
// seam is always under it) with a path built from the same edge samples as the goo.
//   - View Transitions (`document.startViewTransition`): the old page is the
//     `::view-transition-old(root)` snapshot, clipped every frame (Web Animations with
//     `pseudoElement`, or a rewritten style rule); the new page is the live
//     `::view-transition-new(root)`. The band is named (`view-transition-name`) only after
//     the snapshot is taken, so it's its own live group painted above root. Rendering is
//     paused while the new page loads, so the sweep starts once it's ready.
//   - Fallback (no View Transitions): a clone of the page's visible part (canvases copied;
//     a blank WebGL canvas gets the page background) in a fixed overlay under the band,
//     clipped the same way. Here the band pours in at once and waits near the top edge,
//     with nothing new revealed, until the new page is ready.
//   - If neither works, the swap-behind-the-band run below.
//
// Reduced motion: no goo, no bubbles, no split; the overlay (a plain full-viewport fill)
// fades in and out quickly.
//
// Nothing touches `document` until the first cover().

import type { GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion } from './reduced-motion'
import { readPreset } from './tuning'

/** Direction the goo travels: 'down' pours in from the top edge and drains out the bottom. */
export type PageTransitionDirection = 'up' | 'down' | 'left' | 'right'

/** 'idle' (hidden) -> 'covering' -> 'covered' (holding) -> 'revealing' -> 'idle'. With the
 *  band, 'covered' means the band is over the middle of the screen (the swap point). */
export type PageTransitionPhase = 'idle' | 'covering' | 'covered' | 'revealing'

/** Per-preset feel. Times in seconds; lengths as fractions of the travel length. */
export interface PageTransitionFeel {
  /** Cover / reveal durations (s) at speed 1. */
  cover: number
  reveal: number
  /** Front mound height (fraction of the viewport's travel length, capped in px). */
  bulge: number
  /** Trailing-edge stretch while moving (fraction of travel length, capped in px). */
  lag: number
  /** Wobble: mound height oscillation (0..1 of its height). */
  wobble: number
  /** Wobble frequency (Hz). */
  hz: number
  /** Band thickness (fraction of the travel length). */
  band: number
  /** Bubbles per transition at strength 1. */
  bubbles: number
  /** Fastest bubble rise through the goo (travel lengths per second). */
  rise: number
}

export const PAGE_TRANSITION_FEEL: Readonly<Record<GoopPreset, Readonly<PageTransitionFeel>>> = Object.freeze({
  subtle: Object.freeze({ cover: 0.42, reveal: 0.56, bulge: 0.05, lag: 0.07, wobble: 0.16, hz: 2.2, band: 0.46, bubbles: 4, rise: 0.9 }),
  playful: Object.freeze({ cover: 0.5, reveal: 0.65, bulge: 0.075, lag: 0.1, wobble: 0.26, hz: 2.4, band: 0.52, bubbles: 6, rise: 1.1 }),
  wild: Object.freeze({ cover: 0.58, reveal: 0.76, bulge: 0.105, lag: 0.14, wobble: 0.36, hz: 2.7, band: 0.58, bubbles: 8, rise: 1.3 }),
})

/** Samples along each edge. Kept modest: the path is rewritten every frame. */
export const PAGE_TRANSITION_SAMPLES = 28
/** Mounds per edge. */
export const PAGE_TRANSITION_MOUNDS = 3
/** Points round each bubble hole. */
export const PAGE_TRANSITION_HOLE_POINTS = 20
/** Most bubbles one transition spawns (bubbles: 2 on wild). */
export const PAGE_TRANSITION_MAX_BUBBLES = 14
/** Default wall colour: `--goop-page-transition`, then the theme's `--primary`. */
export const PAGE_TRANSITION_COLOR = 'var(--goop-page-transition, var(--primary, #111))'
/** CSS custom property read for the accent lip when `accent` isn't set. */
export const PAGE_TRANSITION_ACCENT_VAR = '--goop-page-transition-accent'
/** CSS custom property read for the body highlight when `highlight` isn't set. */
export const PAGE_TRANSITION_HIGHLIGHT_VAR = '--goop-page-transition-highlight'
/** Attribute on the overlay with the current phase. */
export const PAGE_TRANSITION_ATTR = 'data-goop-page-transition'
/** Attribute on the split fallback's old-page clone overlay. */
export const PAGE_TRANSITION_OLD_ATTR = 'data-goop-page-transition-old'
/** `view-transition-name` the band gets during a split view transition. */
export const PAGE_TRANSITION_VT_NAME = 'goop-page-transition'
/** How far inside the goo (px, behind its front) the old page is cut off. */
export const PAGE_TRANSITION_SEAM_INSET = 10
/** A clip path that shows nothing (the old page is gone). */
export const PAGE_TRANSITION_CLIP_NONE = 'M0 0Z'
/** The split sweep slows over the middle: speed 1 +- this (0..1). */
const SWEEP_EASE_K = 0.45

const MOUND_PX_MAX = 70
const TAIL_PX_MAX = 96
const REDUCED_COVER = 0.14
const REDUCED_REVEAL = 0.18
/** The band keeps creeping (and its bubbles rising) for this long while held, then rests. */
const HOLD_LIVE = 4

export interface PageTransitionOptions {
  /** Travel direction. Default 'down' (pours from the top, drains out the bottom). */
  direction?: PageTransitionDirection
  /** Goo fill, any CSS colour or `var()`. Default PAGE_TRANSITION_COLOR. */
  color?: string
  /** Lip colour on the moving edges and round the bubbles (e.g. a deeper shade), or false
   *  for none. Default: the `--goop-page-transition-accent` custom property when set on
   *  <html>, else none. */
  accent?: string | false
  /** A soft lighter glow through the middle of the band (an SVG linear gradient), or false.
   *  Default: `--goop-page-transition-highlight` when set on <html>, else none. */
  highlight?: string | false
  /** Total duration (ms) of cover + reveal at speed 1, split like the preset's. Default
   *  from the preset (~1150). The hold in between lasts until reveal() is called. */
  duration?: number
  /** Cover / reveal durations (ms); override `duration`. */
  coverDuration?: number
  revealDuration?: number
  /** Speed multiplier. Default 1. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default `--goop-preset` on <html>, then playful. */
  preset?: GoopPreset
  /** A band that sweeps through (`true`, default), the older full-screen wall (`false`), or
   *  the band's thickness as a fraction of the travel length (0.2..1). */
  band?: boolean | number
  /** See-through bubbles rising through the goo. `true` (default), `false` or 0..2 (how
   *  many: 1 is the preset's count, 4 / 6 / 8). */
  bubbles?: boolean | number
  /** Mounds on the leading front. `true` (default), `false` (a flat front) or 0..2. */
  bulge?: boolean | number
  /** Mounds and bubbles wobble and drift while moving. `true` (default), `false` or 0..2. */
  wobble?: boolean | number
  /** The trailing edge stretches back while moving. `true` (default), `false` or 0..2. */
  lag?: boolean | number
  /** Master switch. `false`: cover() / reveal() resolve at once and nothing is drawn. */
  enabled?: boolean
  /** Force reduced motion on (`true`) or ignore the OS setting (`false`). Default 'auto'. */
  reducedMotion?: boolean | 'auto'
  /** Overlay z-index. Default 2147483000. */
  zIndex?: number
  /** Seed for the first transition's mounds and bubbles (each transition re-rolls).
   *  Default random. */
  seed?: number
  /** The band is the seam between the pages (`true`, default): the new page behind it, the
   *  old one ahead of it, never a visible swap (View Transitions, else a clone of the old
   *  page). `false`: the page swaps while the band is over the middle. Only with the band,
   *  never under reduced motion. */
  split?: boolean
}

/** How a split transition shows the old page: a view transition, a clone, or no split. */
export type PageTransitionSeam = 'view-transition' | 'clone' | null

export interface PageTransitionHandle {
  /** Pour the goo in. Resolves once the band is over the middle of the screen (the wall:
   *  once the viewport is fully covered); at once when already there, disabled, or after
   *  destroy(). */
  cover(): Promise<void>
  /** Flow on and out. Waits for a running cover first. Resolves when the overlay is hidden. */
  reveal(): Promise<void>
  readonly phase: PageTransitionPhase
  /** Is the current / next transition the reduced-motion fade? */
  readonly reducedMotion: boolean
  /** Live bubbles (holes being drawn) right now. */
  readonly bubbleCount: number
  /** How the running (else the next) transition splits the pages: 'view-transition',
   *  'clone', or null (no split: swap behind the band, the wall, or reduced motion). With a
   *  split, cover() resolves once the old page is held (change the DOM then), reveal() means
   *  the new page is ready, and nothing should wait for a frame in between: rendering is
   *  paused during a view transition's update. */
  readonly seam: PageTransitionSeam
  update(options: PageTransitionOptions): void
  destroy(): void
}

// ---- Pure geometry ----------------------------------------------------------------------------

/** One mound on an edge. `at`, `lo`, `hi` are fractions of the edge's breadth. */
export interface PageTransitionMound {
  /** Peak position (0..1 along the edge). */
  at: number
  /** Half-widths before / after the peak (asymmetric). */
  lo: number
  hi: number
  /** Relative height (0..1). */
  height: number
  /** Wobble phase (radians) and drift direction (-1..1). */
  phase: number
  drift: number
}

/** Deterministic 0..1 hash of (seed, a, b). */
function rand(seed: number, a: number, b: number): number {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * The mounds for one edge, fixed per seed: PAGE_TRANSITION_MOUNDS low, wide swells, one per
 * band of the edge with jitter (never stacked, never one centred bump), uneven heights and
 * asymmetric widths. Pure.
 */
export function pageTransitionMounds(seed: number): PageTransitionMound[] {
  const n = PAGE_TRANSITION_MOUNDS
  const out: PageTransitionMound[] = []
  // Which band gets the tallest mound: never the middle one alone, so it never reads as a
  // centred knob.
  const tall = rand(seed, 9, 1) < 0.5 ? 0 : n - 1
  // Often one of the others is barely there, so some edges have two mounds, some three, and
  // the spacing never reads as a regular wave.
  const faint = rand(seed, 9, 2) < 0.55 ? (tall + 1 + Math.floor(rand(seed, 9, 3) * (n - 1))) % n : -1
  for (let i = 0; i < n; i++) {
    const r = (k: number): number => rand(seed, i + 1, k)
    const band = 1 / n
    const at = band * (i + 0.5) + (r(1) - 0.5) * band * 0.85
    out.push({
      at,
      lo: 0.15 + r(2) * 0.17,
      hi: 0.15 + r(3) * 0.17,
      height: i === tall ? 0.85 + r(4) * 0.15 : i === faint ? 0.12 + r(4) * 0.16 : 0.38 + r(4) * 0.4,
      phase: r(5) * Math.PI * 2,
      drift: r(6) * 2 - 1,
    })
  }
  return out
}

/** Raised cosine on |x| < 1: 1 at 0, 0 with zero slope at +-1. */
const rc = (x: number): number => (x <= -1 || x >= 1 ? 0 : (1 + Math.cos(Math.PI * x)) / 2)
const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))

/**
 * Height of an edge's mound profile at `u` (0..1 along the edge) and time `time` (s): the
 * sum of the mounds (each `emergeMound`'s raised-cosine profile, asymmetric widths), scaled
 * by `amp` (px), wobbled by `wobble` (0..1) at `hz`, minus a small drag near the viewport
 * walls (the sides trail, like a meniscus; `wallSign` +1 adds it instead, for a
 * trailing edge whose sides hang back). Pure.
 */
export function pageTransitionProfile(
  u: number,
  mounds: readonly PageTransitionMound[],
  amp: number,
  time: number,
  wobble: number,
  hz: number,
  /** -1: the sides trail behind the edge (a front); +1: they stretch back further (a tail). */
  wallSign = -1,
): number {
  let h = 0
  for (const m of mounds) {
    const w = 2 * Math.PI * hz * time + m.phase
    const at = m.at + m.drift * wobble * 0.03 * Math.sin(w * 0.55)
    const k = 1 + wobble * Math.sin(w)
    const x = (u - at) / (u < at ? m.lo : m.hi)
    h += m.height * k * rc(x)
  }
  const wall = Math.min(u, 1 - u) / 0.14
  const drag = wall >= 1 ? 0 : 0.22 * (1 - wall * wall * (3 - 2 * wall))
  return amp * (h + wallSign * drag)
}

/** The tallest a profile can get for `amp`, `wobble` (px): bounds for offscreen starts. */
export function pageTransitionReach(mounds: readonly PageTransitionMound[], amp: number, wobble: number): number {
  // Mounds overlap at most two at a time (one per band, widths < 2 bands).
  const hs = mounds.map((m) => m.height).sort((a, b) => b - a)
  return amp * (1 + wobble) * ((hs[0] ?? 0) + (hs[1] ?? 0))
}

/** Cubic bezier easing (CSS `cubic-bezier(x1, y1, x2, y2)`), solved by bisection. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const at = (a: number, b: number, s: number): number => 3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s
  return (t: number): number => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let lo = 0
    let hi = 1
    let s = t
    for (let i = 0; i < 22; i++) {
      s = (lo + hi) / 2
      if (at(x1, x2, s) < t) lo = s
      else hi = s
    }
    return at(y1, y2, s)
  }
}

/** Cover: a thick pour that eases to a slow crawl over the middle (the wall: into the far
 *  edge). Reveal: gathers itself, then flows on and away, unhurried. */
export const PAGE_TRANSITION_COVER_EASE = cubicBezier(0.4, 0.06, 0.24, 1)
export const PAGE_TRANSITION_REVEAL_EASE = cubicBezier(0.5, 0, 0.75, 0.8)

/** Speed of an easing at `t` (progress per unit time), central difference. */
function easeSpeed(ease: (t: number) => number, t: number): number {
  const e = 0.012
  return (ease(clamp(t + e)) - ease(clamp(t - e))) / (2 * e)
}

// ---- Bubbles (pure) -------------------------------------------------------------------------

/** One bubble of a transition, fixed per seed. Placed when it spawns, relative to the band. */
export interface PageTransitionBubbleSpec {
  /** When it appears, as a fraction of the run: 0..0.5 is the cover, 0.5..1 the reveal. */
  at: number
  /** Where across the band's breadth (0..1). */
  u: number
  /** Where along the band: 0 at its front, 1 at its tail. */
  depth: number
  /** Radius as a fraction of the biggest bubble (0..1). */
  size: number
  /** Rise speed through the goo as a fraction of the preset's fastest (0..1). */
  rise: number
  /** Wobble phase (radians). */
  phase: number
  /** Index of a bubble this one spawns just behind (nearer the front), faster, so it
   *  catches up and merges; -1 for none. */
  follow: number
}

/**
 * The bubbles for one transition, fixed per seed: `count` of mixed sizes (two big, the rest
 * medium and small), spread across the band in shuffled slots, most during the cover and a
 * few more as the reveal starts. One pair (two from 7 bubbles) is set up to merge: a fast
 * one spawns right behind a slow one. Pure.
 */
export function pageTransitionBubbles(seed: number, count: number): PageTransitionBubbleSpec[] {
  const n = Math.max(0, Math.min(PAGE_TRANSITION_MAX_BUBBLES, Math.round(count)))
  const r = (i: number, k: number): number => rand(seed + 3.1, i + 1, k + 20)
  // Shuffled slots across the breadth, so neighbours in time aren't neighbours in space.
  const slots = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(r(i, 0) * (i + 1))
    ;[slots[i], slots[j]] = [slots[j]!, slots[i]!]
  }
  const early = Math.ceil(n * 0.65)
  const out: PageTransitionBubbleSpec[] = []
  for (let i = 0; i < n; i++) {
    // Two big ones (one early, one late), then medium / small alternating.
    const big = i === 0 || i === early
    const size = big ? 0.82 + r(i, 1) * 0.18 : i % 2 ? 0.22 + r(i, 1) * 0.14 : 0.44 + r(i, 1) * 0.2
    const at = i < early ? 0.12 + (0.3 * (i + r(i, 2) * 0.8)) / Math.max(1, early) : 0.5 + (0.12 * (i - early + r(i, 2) * 0.8)) / Math.max(1, n - early)
    out.push({
      at,
      u: (slots[i]! + 0.5 + (r(i, 3) - 0.5) * 0.6) / Math.max(1, n),
      depth: 0.16 + r(i, 4) * 0.42,
      size,
      // Big bubbles rise faster (buoyancy), with spread.
      rise: clamp(0.35 + size * 0.4 + (r(i, 5) - 0.5) * 0.3, 0.25, 1),
      phase: r(i, 6) * Math.PI * 2,
      follow: -1,
    })
  }
  // Merge pairs: a small, fast one spawns just behind a slower, bigger one.
  const pairs = n >= 7 ? 2 : n >= 3 ? 1 : 0
  for (let p = 0; p < pairs; p++) {
    const target = p === 0 ? 0 : early
    const catcher = p === 0 ? 1 : Math.min(n - 1, early + 1)
    if (catcher === target || !out[catcher] || !out[target]) continue
    const t = out[target]!
    t.rise = Math.min(t.rise, 0.42)
    out[catcher] = { ...out[catcher]!, at: t.at, u: t.u, depth: t.depth, rise: 1, follow: target }
  }
  return out
}

// ---- Frame (pure) ---------------------------------------------------------------------------

/** A bubble hole for one frame, in the travel frame (px). */
export interface PageTransitionHole {
  /** Centre: along the travel direction (0 at the entry edge) and across it. */
  main: number
  cross: number
  /** Radius (px). */
  r: number
  /** Squash (0..~0.2): shorter along the travel, wider across. */
  squash: number
  /** Wobble phase (radians). */
  phase: number
  /** A smaller bubble being absorbed: drawn as a lobe of this one, never a second hole. */
  partner?: { main: number; cross: number; r: number }
}

/** A notch in an edge where a bubble popped: dips into the goo, then relaxes. */
export interface PageTransitionDent {
  edge: 'front' | 'tail'
  /** Centre and half-width along the edge (fractions of its breadth). */
  at: number
  half: number
  /** Depth into the goo (px). */
  depth: number
}

/** One frame of the goo, in the travel frame: `main` runs along the travel direction from
 *  the entry edge (0) to the far edge (`length`), `cross` across it (0..`breadth`). */
export interface PageTransitionFrameInput {
  direction: PageTransitionDirection
  width: number
  height: number
  /** Front / trailing positions along `main` (px, before mounds). */
  front: number
  tail: number
  /** Mound amplitudes (px) on the front / trailing edge. */
  frontAmp: number
  tailAmp: number
  frontMounds: readonly PageTransitionMound[]
  tailMounds: readonly PageTransitionMound[]
  time: number
  wobble: number
  hz: number
  /** Accent lip thickness (px) on moving edges and bubble rims; 0 for none. */
  rim?: number
  /** Bubble holes, cut out of the goo (clamped inside its body). */
  holes?: readonly PageTransitionHole[]
  /** Pop notches on the edges. */
  dents?: readonly PageTransitionDent[]
}

export interface PageTransitionFrame {
  /** The goo's path (viewport px; draw with fill-rule evenodd so holes cut through). Empty
   *  when nothing is on screen. */
  d: string
  /** The accent lip's path (slightly larger goo, slightly smaller holes, drawn underneath),
   *  or '' for none. */
  accent: string
}

const fmt = (v: number): string => (Math.round(v * 10) / 10).toString()

/** Smooth open run through `pts` (quadratic curves through midpoints), ends on the last. */
function smoothPath(pts: readonly [number, number][], out: string[]): void {
  const n = pts.length
  out.push(`M${fmt(pts[0]![0])} ${fmt(pts[0]![1])}`)
  for (let i = 1; i < n - 1; i++) {
    const [x, y] = pts[i]!
    const [nx, ny] = pts[i + 1]!
    out.push(`Q${fmt(x)} ${fmt(y)} ${fmt((x + nx) / 2)} ${fmt((y + ny) / 2)}`)
  }
  out.push(`L${fmt(pts[n - 1]![0])} ${fmt(pts[n - 1]![1])}`)
}

/** Smooth closed loop through `pts` (quadratic curves through midpoints). */
function smoothLoop(pts: readonly [number, number][], out: string[]): void {
  const n = pts.length
  const mid = (i: number): [number, number] => {
    const a = pts[i % n]!
    const b = pts[(i + 1) % n]!
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  }
  const [mx, my] = mid(0)
  out.push(`M${fmt(mx)} ${fmt(my)}`)
  for (let i = 1; i <= n; i++) {
    const [x, y] = pts[i % n]!
    const [ex, ey] = mid(i)
    out.push(`Q${fmt(x)} ${fmt(y)} ${fmt(ex)} ${fmt(ey)}`)
  }
  out.push('Z')
}

const dentAt = (dents: readonly PageTransitionDent[] | undefined, edge: 'front' | 'tail', u: number): number => {
  if (!dents) return 0
  let s = 0
  for (const d of dents) if (d.edge === edge) s += d.depth * rc((u - d.at) / d.half)
  return s
}

/** Where an edge of the goo is (px along main) at `u` (0..1 across), mounds and pop notches
 *  included. Pure. */
export function pageTransitionEdge(f: PageTransitionFrameInput, edge: 'front' | 'tail', u: number): number {
  if (edge === 'front') {
    const m = f.frontAmp > 0 ? pageTransitionProfile(u, f.frontMounds, f.frontAmp, f.time, f.wobble, f.hz) : 0
    return f.front + m - dentAt(f.dents, 'front', u)
  }
  const t = f.tailAmp > 0 ? pageTransitionProfile(u, f.tailMounds, f.tailAmp, f.time, f.wobble, f.hz, 1) : 0
  return f.tail - t + dentAt(f.dents, 'tail', u)
}

/**
 * The goo's outline for one frame: the front edge (mounds pointing ahead, into the empty
 * side) across the viewport, then the trailing edge back (mounds pointing behind), then one
 * closed loop per bubble hole. Each edge is PAGE_TRANSITION_SAMPLES + 1 points, clamped a few
 * px outside the viewport so the path stays small; each hole PAGE_TRANSITION_HOLE_POINTS,
 * clamped inside the goo's body so it always cuts the goo (never adds goo outside it). A
 * fully covered viewport is a plain rect (plus holes). Pure.
 */
export function pageTransitionFrame(f: PageTransitionFrameInput): PageTransitionFrame {
  const vertical = f.direction === 'up' || f.direction === 'down'
  const length = vertical ? f.height : f.width
  const breadth = vertical ? f.width : f.height
  const pad = 6
  const rim = f.rim ?? 0
  const n = PAGE_TRANSITION_SAMPLES
  const toXY = (main: number, cross: number): [number, number] => {
    switch (f.direction) {
      case 'down':
        return [cross, main]
      case 'up':
        return [cross, f.height - main]
      case 'right':
        return [main, cross]
      default:
        return [f.width - main, cross]
    }
  }
  const holes = (shrink: number, out: string[]): void => {
    if (!f.holes?.length) return
    const hn = PAGE_TRANSITION_HOLE_POINTS
    const wob = Math.min(1.6, f.wobble / 0.26)
    const w = 2 * Math.PI * f.hz * 0.7 * f.time
    for (const h of f.holes) {
      // The lip's holes are a little smaller (a goo rim), thinnest round small bubbles.
      const r = h.r - Math.min(shrink, h.r * 0.24)
      if (r < 0.8) continue
      let lobe: { a: number; half: number; height: number } | null = null
      if (h.partner && h.partner.r > 0.5) {
        const pm = h.partner.main - h.main
        const pc = h.partner.cross - h.cross
        const dist = Math.hypot(pm, pc)
        const pr = h.partner.r - Math.min(shrink, h.partner.r * 0.24)
        const height = dist + pr - r
        if (dist > 0.5 && height > 0) {
          lobe = { a: Math.atan2(pc, pm), half: Math.min(Math.PI * 0.9, Math.max(0.5, 2.2 * Math.asin(Math.min(1, pr / dist)))), height }
        }
      }
      const pts: [number, number][] = []
      let open = false
      for (let k = 0; k < hn; k++) {
        const th = (k / hn) * Math.PI * 2
        let rho = r * (1 + wob * (0.07 * Math.sin(2 * th + h.phase + w) + 0.045 * Math.sin(3 * th + 1.7 * h.phase - 1.3 * w)))
        if (lobe) {
          let da = th - lobe.a
          da = Math.atan2(Math.sin(da), Math.cos(da))
          if (Math.abs(da) < lobe.half) rho += lobe.height * Math.cos((Math.PI / 2) * (da / lobe.half))
        }
        const c = clamp(h.cross + rho * Math.sin(th) * (1 + 0.7 * h.squash), -pad + 1, breadth + pad - 1)
        const u = clamp(c / breadth)
        const lo = Math.max(pageTransitionEdge(f, 'tail', u), -pad) + 2.5
        const hi = Math.min(pageTransitionEdge(f, 'front', u), length + pad) - 2.5
        const m = h.main + rho * Math.cos(th) * (1 - h.squash)
        if (lo <= hi) open = true
        pts.push(toXY(clamp(lo > hi ? (lo + hi) / 2 : clamp(m, lo, hi), -pad + 1, length + pad - 1), c))
      }
      // Wholly squeezed out of the goo (popped into an edge, or off screen): nothing to cut.
      if (open) smoothLoop(pts, out)
    }
  }
  const outline = (grow: number, holeShrink: number): string => {
    const fronts: number[] = []
    const tails: number[] = []
    let frontMin = Infinity
    let frontMax = -Infinity
    let tailMin = Infinity
    let tailMax = -Infinity
    for (let i = 0; i <= n; i++) {
      const u = i / n
      const m = f.frontAmp > 0 ? pageTransitionProfile(u, f.frontMounds, f.frontAmp, f.time, f.wobble, f.hz) : 0
      const t = f.tailAmp > 0 ? pageTransitionProfile(u, f.tailMounds, f.tailAmp, f.time, f.wobble, f.hz, 1) : 0
      // The lip is thicker at mound peaks (the goo is fattest there).
      const gf = grow * (0.15 + 1.1 * clamp(m / Math.max(1, f.frontAmp)))
      const gt = grow * (0.15 + 1.1 * clamp(t / Math.max(1, f.tailAmp)))
      const fm = clamp(f.front + m + gf - dentAt(f.dents, 'front', u), -pad, length + pad)
      const tm = Math.min(fm, clamp(f.tail - t - gt + dentAt(f.dents, 'tail', u), -pad, length + pad))
      fronts.push(fm)
      tails.push(tm)
      frontMin = Math.min(frontMin, fm)
      frontMax = Math.max(frontMax, fm)
      tailMin = Math.min(tailMin, tm)
      tailMax = Math.max(tailMax, tm)
    }
    // Nothing on screen: the front hasn't entered, or the tail has left.
    if (frontMax <= 0 || tailMin >= length || frontMax <= tailMin) return ''
    const out: string[] = []
    const flatFront = frontMin >= length
    const flatTail = tailMax <= 0
    if (flatFront && flatTail) {
      const [x0, y0] = toXY(-pad, -pad)
      const [x1, y1] = toXY(length + pad, breadth + pad)
      const x = Math.min(x0, x1)
      const y = Math.min(y0, y1)
      out.push(`M${fmt(x)} ${fmt(y)}H${fmt(Math.max(x0, x1))}V${fmt(Math.max(y0, y1))}H${fmt(x)}Z`)
      holes(holeShrink, out)
      return out.join('')
    }
    const front: [number, number][] = []
    for (let i = 0; i <= n; i++) front.push(toXY(fronts[i]!, (i / n) * breadth))
    // Run the edge a little past the side walls, so the corners stay square off-screen.
    front.unshift(toXY(fronts[0]!, -pad))
    front.push(toXY(fronts[n]!, breadth + pad))
    smoothPath(front, out)
    const tail: [number, number][] = [toXY(tails[n]!, breadth + pad)]
    for (let i = n; i >= 0; i--) tail.push(toXY(tails[i]!, (i / n) * breadth))
    tail.push(toXY(tails[0]!, -pad))
    const [tx, ty] = tail[0]!
    out.push(`L${fmt(tx)} ${fmt(ty)}`)
    const sub: string[] = []
    smoothPath(tail, sub)
    // Drop the tail's own M (we're already there).
    out.push(...sub.slice(1), 'Z')
    holes(holeShrink, out)
    return out.join('')
  }
  return { d: outline(0, 0), accent: rim > 0 ? outline(rim, rim * 0.75) : '' }
}

/** Viewport point for a travel-frame point. */
function travelToXY(f: Pick<PageTransitionFrameInput, 'direction' | 'width' | 'height'>, main: number, cross: number): [number, number] {
  switch (f.direction) {
    case 'down':
      return [cross, main]
    case 'up':
      return [cross, f.height - main]
    case 'right':
      return [main, cross]
    default:
      return [f.width - main, cross]
  }
}

/**
 * Where the split seam is (px along main, unclamped) at each of PAGE_TRANSITION_SAMPLES + 1
 * points across: `inset` px behind the goo's front (inside the goo), mounds and pop notches
 * included. With `prev` (last frame's seam) it never moves back (the old side only shrinks)
 * unless the front itself recedes past it: it always stays at least 1px inside the goo. Pure.
 */
export function pageTransitionSplitEdge(f: PageTransitionFrameInput, inset = PAGE_TRANSITION_SEAM_INSET, prev?: readonly number[] | null): number[] {
  const n = PAGE_TRANSITION_SAMPLES
  const out: number[] = []
  for (let i = 0; i <= n; i++) {
    const front = pageTransitionEdge(f, 'front', i / n)
    let e = front - inset
    const p = prev?.[i]
    if (p !== undefined && Number.isFinite(p)) e = Math.min(Math.max(p, e), front - Math.min(1, inset))
    out.push(e)
  }
  return out
}

/**
 * The old page's region for one frame (viewport px), as an SVG path for `clip-path:
 * path()`: everything ahead of `seam` (from pageTransitionSplitEdge), drawn through the same
 * smooth curve as the goo's front. PAGE_TRANSITION_CLIP_NONE once the seam is past the far
 * edge everywhere. Pure.
 */
export function pageTransitionSplitClip(f: Pick<PageTransitionFrameInput, 'direction' | 'width' | 'height'>, seam: readonly number[]): string {
  const vertical = f.direction === 'up' || f.direction === 'down'
  const length = vertical ? f.height : f.width
  const breadth = vertical ? f.width : f.height
  const pad = 6
  const n = seam.length - 1
  if (n < 1 || Math.min(...seam) >= length) return PAGE_TRANSITION_CLIP_NONE
  const at = (i: number): number => clamp(seam[i]!, -pad, length + pad)
  const edge: [number, number][] = [travelToXY(f, at(0), -pad)]
  for (let i = 0; i <= n; i++) edge.push(travelToXY(f, at(i), (i / n) * breadth))
  edge.push(travelToXY(f, at(n), breadth + pad))
  const out: string[] = []
  smoothPath(edge, out)
  const [x1, y1] = travelToXY(f, length + pad, breadth + pad)
  const [x0, y0] = travelToXY(f, length + pad, -pad)
  out.push(`L${fmt(x1)} ${fmt(y1)}L${fmt(x0)} ${fmt(y0)}Z`)
  return out.join('')
}

/** The split sweep's easing: monotonic, quick in and out, slower over the middle. */
export function pageTransitionSweepEase(p: number): number {
  const x = clamp(p)
  return x + (SWEEP_EASE_K * Math.sin(2 * Math.PI * x)) / (2 * Math.PI)
}

// ---- Controller -----------------------------------------------------------------------------

const strengthOf = (v: boolean | number | undefined): number =>
  v === false ? 0 : v === true || v === undefined ? 1 : Number.isFinite(v) ? clamp(v, 0, 2) : 1

const easeOut = (t: number): number => 1 - (1 - clamp(t)) * (1 - clamp(t))
const easeInOut = (t: number): number => {
  const x = clamp(t)
  return x * x * (3 - 2 * x)
}

interface Motion {
  kind: 'cover' | 'reveal'
  /** Seconds since start, and duration (s). */
  t: number
  dur: number
  reduced: boolean
  /** Front / tail start and end (px along main). */
  f0: number
  f1: number
  t0: number
  t1: number
  /** Opacity start (reduced motion). */
  o0: number
}

/** A live bubble (travel frame, px). */
interface Bubble {
  main: number
  cross: number
  /** Target radius, current (eased) radius. */
  base: number
  r: number
  rise: number
  age: number
  squash: number
  phase: number
  state: 'live' | 'pop' | 'merge'
  /** Seconds in the current pop / merge. */
  st: number
  /** Merging: the bubble absorbing this one, and the offset it started from. */
  into: Bubble | null
  om: number
  oc: number
  /** Being absorbed into this one right now. */
  partner: Bubble | null
}

interface Dent extends PageTransitionDent {
  peak: number
  t: number
}

/** Pop timings (s): the hole collapses, the notch dips, then relaxes. */
const POP_SHRINK = 0.11
const DENT_IN = 0.08
const DENT_OUT = 0.38
const MERGE = 0.24

/** The bits of a ViewTransition we use. */
interface ViewTransitionLike {
  ready: Promise<void>
  finished: Promise<void>
  skipTransition(): void
}
type StartViewTransition = (update: () => Promise<void>) => ViewTransitionLike

/** The split sweep: `p` runs 0..1 over `dur` (s); held short of `gate` until ready. */
interface Sweep {
  p: number
  dur: number
  f0: number
  f1: number
  gate: number
}

/** Elements never copied into the old-page clone. */
const CLONE_SKIP = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT'])

/** Rules for a split view transition: no UA cross-fade, the old snapshot opaque and on top of
 *  the live new page, the band's group untouched, and the live page clickable underneath. */
const VT_CSS = (name: string): string =>
  `::view-transition{pointer-events:none}` +
  `::view-transition-group(root),::view-transition-old(root),::view-transition-new(root),::view-transition-group(${name}),::view-transition-old(${name}),::view-transition-new(${name}){animation:none}` +
  `::view-transition-old(root),::view-transition-new(root){mix-blend-mode:normal;opacity:1}` +
  // The new image is painted over the old one by default: lift the (clipped) old page above it.
  `::view-transition-old(root){z-index:1}` +
  `::view-transition-image-pair(root){isolation:auto}`
const VT_PSEUDO = '::view-transition-old(root)'
const VT_HOLD = `@keyframes goop-pt-hold{from{opacity:1}to{opacity:1}}`

/** Mount a goo page-transition overlay. SSR-safe: inert without a document. */
export function createPageTransition(initial: PageTransitionOptions = {}): PageTransitionHandle {
  let opts: PageTransitionOptions = { ...initial }
  const doc: Document | null = typeof document !== 'undefined' ? document : null
  let svg: SVGSVGElement | null = null
  let wall: SVGPathElement | null = null
  let lip: SVGPathElement | null = null
  let grad: SVGLinearGradientElement | null = null
  let gradStops: SVGStopElement[] = []
  let phase: PageTransitionPhase = 'idle'
  let destroyed = false
  let motion: Motion | null = null
  let clock = 0
  let seed = opts.seed ?? Math.random() * 1000
  let frontMounds = pageTransitionMounds(seed)
  let tailMounds = pageTransitionMounds(seed + 17.3)
  // Current band position (px along main) and opacity.
  let front = 0
  let tail = 0
  let opacity = 1
  let frontAmp = 0
  let tailAmp = 0
  let accent: string | null = null
  let highlight: string | null = null
  /** 'rect': the reduced-motion fade (a plain fill); 'goo': the band / wall. */
  let mode: 'rect' | 'goo' = 'goo'
  /** Band thickness (px) for this transition; Infinity for the wall. */
  let thick = Infinity
  let coverWaiters: (() => void)[] = []
  let revealWaiters: (() => void)[] = []
  let revealQueued = false
  // Hold (band over the middle, waiting for reveal()).
  let hold = 0
  let holdFront = 0
  let holdTail = 0
  let holdSpawn = 0
  // Bubbles.
  let specs: PageTransitionBubbleSpec[] = []
  let spawned: (Bubble | null)[] = []
  let next = 0
  let bubbles: Bubble[] = []
  let dents: Dent[] = []
  let runPos = 0
  let vBand = 0
  let aBand = 0
  let prevFront = 0
  let prevTail = 0
  // Split.
  let seamMode: PageTransitionSeam = null
  let sweep: Sweep | null = null
  /** The new page is ready (the split sweep may pass the gate). */
  let ready = true
  /** The band stays hidden (display: none) until a view transition has its old snapshot. */
  let veiled = false
  let seamEdge: number[] | null = null
  let vt: ViewTransitionLike | null = null
  let finishUpdate: (() => void) | null = null
  let clipAnim: Animation | null = null
  let vtStyle: HTMLStyleElement | null = null
  let oldClone: HTMLElement | null = null
  /** Bumped per split run, so late promise callbacks from an ended one do nothing. */
  let runId = 0
  /** Cleanup still waiting for a finished view transition (run on destroy). */
  let tidyLater: (() => void) | null = null

  const flush = (list: (() => void)[]): void => {
    for (const fn of list) fn()
  }
  const preset = (): GoopPreset => (doc ? readPreset(doc.documentElement, opts.preset) : (opts.preset ?? 'playful'))
  const feel = (): PageTransitionFeel => PAGE_TRANSITION_FEEL[preset()]
  const reduced = (): boolean => {
    const rm = opts.reducedMotion ?? 'auto'
    if (rm === true) return true
    if (rm === false) return false
    return doc ? isReducedMotion(doc) : false
  }
  const speed = (): number => (opts.speed && opts.speed > 0 ? opts.speed : 1)
  const durations = (): { cover: number; reveal: number } => {
    const fe = feel()
    let cover = fe.cover
    let reveal = fe.reveal
    if (opts.duration && opts.duration > 0) {
      const total = opts.duration / 1000
      cover = (total * fe.cover) / (fe.cover + fe.reveal)
      reveal = total - cover
    }
    if (opts.coverDuration && opts.coverDuration > 0) cover = opts.coverDuration / 1000
    if (opts.revealDuration && opts.revealDuration > 0) reveal = opts.revealDuration / 1000
    return { cover: cover / speed(), reveal: reveal / speed() }
  }
  const viewport = (): { width: number; height: number } => {
    const win = doc?.defaultView
    return { width: win?.innerWidth || 1024, height: win?.innerHeight || 768 }
  }
  const vertical = (): boolean => {
    const d = opts.direction ?? 'down'
    return d === 'up' || d === 'down'
  }
  const length = (): number => {
    const v = viewport()
    return vertical() ? v.height : v.width
  }
  const breadth = (): number => {
    const v = viewport()
    return vertical() ? v.width : v.height
  }
  /** Band thickness (px) from the option; Infinity for the wall. */
  const bandPx = (): number => {
    const b = opts.band
    if (b === false || b === 0) return Infinity
    const frac = typeof b === 'number' && Number.isFinite(b) ? clamp(b, 0.2, 1) : feel().band
    return frac >= 1 ? Infinity : frac * length()
  }
  /** Mound amplitudes (px) at full strength for this viewport. */
  const amps = (): { front: number; tail: number } => {
    const fe = feel()
    const L = length()
    const B = breadth()
    // Low and wide: never taller than a small share of the edge's breadth (phones), nor of
    // the band.
    const cap = Number.isFinite(thick) ? thick * 0.2 : Infinity
    return {
      front: Math.min(MOUND_PX_MAX, fe.bulge * L, 0.085 * B, cap) * strengthOf(opts.bulge),
      tail: Math.min(TAIL_PX_MAX, fe.lag * L, 0.12 * B, cap) * strengthOf(opts.lag),
    }
  }
  const wobble = (): number => feel().wobble * strengthOf(opts.wobble)

  const mount = (): void => {
    if (svg || !doc?.body) return
    const NS = 'http://www.w3.org/2000/svg'
    svg = doc.createElementNS(NS, 'svg') as SVGSVGElement
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    svg.setAttribute('preserveAspectRatio', 'none')
    svg.setAttribute(PAGE_TRANSITION_ATTR, 'idle')
    const s = svg.style
    s.position = 'fixed'
    s.inset = '0'
    s.top = '0'
    s.left = '0'
    s.width = '100%'
    s.height = '100%'
    s.overflow = 'hidden'
    s.pointerEvents = 'none'
    s.display = 'none'
    s.contain = 'strict'
    s.zIndex = String(opts.zIndex ?? 2147483000)
    const defs = doc.createElementNS(NS, 'defs')
    grad = doc.createElementNS(NS, 'linearGradient') as SVGLinearGradientElement
    grad.setAttribute('id', `goop-pt-${Math.floor(Math.random() * 1e9).toString(36)}`)
    grad.setAttribute('gradientUnits', 'userSpaceOnUse')
    gradStops = [0, 0.42, 1].map((o) => {
      const st = doc.createElementNS(NS, 'stop') as SVGStopElement
      st.setAttribute('offset', String(o))
      grad!.appendChild(st)
      return st
    })
    defs.appendChild(grad)
    lip = doc.createElementNS(NS, 'path') as SVGPathElement
    wall = doc.createElementNS(NS, 'path') as SVGPathElement
    // Bubble holes are subpaths: evenodd cuts them out.
    lip.setAttribute('fill-rule', 'evenodd')
    wall.setAttribute('fill-rule', 'evenodd')
    svg.append(defs, lip, wall)
    doc.body.appendChild(svg)
  }

  const cssVar = (name: string): string | null => {
    const raw = doc?.defaultView?.getComputedStyle?.(doc.documentElement)?.getPropertyValue(name)?.trim()
    return raw ? `var(${name})` : null
  }
  const resolveAccent = (): string | null => {
    if (opts.accent === false) return null
    if (typeof opts.accent === 'string' && opts.accent) return opts.accent
    return cssVar(PAGE_TRANSITION_ACCENT_VAR)
  }
  const resolveHighlight = (): string | null => {
    if (opts.highlight === false) return null
    if (typeof opts.highlight === 'string' && opts.highlight) return opts.highlight
    return cssVar(PAGE_TRANSITION_HIGHLIGHT_VAR)
  }

  const setPhase = (p: PageTransitionPhase): void => {
    phase = p
    if (!svg) return
    svg.setAttribute(PAGE_TRANSITION_ATTR, p)
    svg.style.display = p === 'idle' || veiled ? 'none' : 'block'
    // Block clicks while (being) covered, so a double click can't start two navigations;
    // let them through while it flows away.
    svg.style.pointerEvents = p === 'covering' || p === 'covered' ? 'auto' : 'none'
  }

  const frameInput = (): PageTransitionFrameInput => {
    const vp = viewport()
    const L = vertical() ? vp.height : vp.width
    const holes: PageTransitionHole[] = []
    for (const b of bubbles) {
      if (b.state === 'merge') continue
      const shown = drawnR(b)
      if (shown <= 0.5) continue
      const p = b.partner
      holes.push({
        main: b.main,
        cross: b.cross + wander(b),
        r: shown,
        squash: b.squash,
        phase: b.phase,
        ...(p ? { partner: { main: p.main, cross: p.cross + wander(p), r: drawnR(p) } } : {}),
      })
    }
    return {
      direction: opts.direction ?? 'down',
      width: vp.width,
      height: vp.height,
      front,
      tail,
      frontAmp,
      tailAmp,
      frontMounds,
      tailMounds,
      time: clock,
      wobble: wobble(),
      hz: feel().hz,
      rim: accent ? Math.min(9, Math.max(3, L * 0.008)) : 0,
      holes,
      dents,
    }
  }

  const draw = (): void => {
    if (!svg || !wall || !lip) return
    const vp = viewport()
    svg.setAttribute('viewBox', `0 0 ${vp.width} ${vp.height}`)
    if (mode === 'rect') {
      wall.setAttribute('d', `M0 0H${vp.width}V${vp.height}H0Z`)
      lip.setAttribute('d', '')
      svg.style.opacity = String(opacity)
      return
    }
    svg.style.opacity = '1'
    const input = frameInput()
    const frame = pageTransitionFrame(input)
    if (sweep && seamMode) applyClip(input)
    wall.setAttribute('d', frame.d)
    lip.setAttribute('d', frame.accent)
    if (highlight && grad) {
      // The glow runs along the band, from its tail to its front (on screen).
      const L = vertical() ? vp.height : vp.width
      const a = clamp(tail, -8, L + 8)
      const b = Math.max(a + 1, clamp(front, -8, L + 8))
      const dir = opts.direction ?? 'down'
      const [x1, y1, x2, y2] =
        dir === 'down' ? [0, a, 0, b] : dir === 'up' ? [0, vp.height - a, 0, vp.height - b] : dir === 'right' ? [a, 0, b, 0] : [vp.width - a, 0, vp.width - b, 0]
      grad.setAttribute('x1', fmt(x1))
      grad.setAttribute('y1', fmt(y1))
      grad.setAttribute('x2', fmt(x2))
      grad.setAttribute('y2', fmt(y2))
    }
  }

  // ---- Bubbles ----

  const drawnR = (b: Bubble): number => {
    const grow = easeOut(b.age / 0.2)
    const pop = b.state === 'pop' ? 1 - easeInOut(b.st / POP_SHRINK) : 1
    return b.r * grow * pop
  }
  const wander = (b: Bubble): number => 0.1 * b.r * Math.sin(2 * Math.PI * 1.3 * b.age + b.phase) * Math.min(1.5, strengthOf(opts.wobble))
  const bubbleTotal = (): number => Math.round(feel().bubbles * strengthOf(opts.bubbles))
  const bubbleMax = (): number => {
    const v = viewport()
    const r = Math.min(60, Math.max(16, 0.09 * Math.min(v.width, v.height)))
    return Number.isFinite(thick) ? Math.min(r, thick * 0.17) : r
  }
  const clearBubbles = (): void => {
    bubbles = []
    dents = []
    specs = []
    spawned = []
    next = 0
  }

  const overlaps = (main: number, cross: number, r: number): boolean =>
    bubbles.some((o) => Math.hypot(o.main - main, o.cross - cross) < o.base + r + 6)

  /** Place a bubble in the band, or null when there's no room on screen yet. */
  const place = (spec: PageTransitionBubbleSpec, r: number, extraRise = 1): Bubble | null => {
    const L = length()
    const B = breadth()
    const fe = feel()
    const lo = Math.max(tail + r + 10, r + 10)
    const hi = Math.min(front - r - 10, L - r - 10)
    if (hi < lo) return null
    const span = Number.isFinite(thick) ? thick : Math.min(front - Math.max(tail, 0), L)
    let main = clamp(front - spec.depth * span, lo, hi)
    let cross = clamp(spec.u * B, r + 10, Math.max(r + 10, B - r - 10))
    const target = spec.follow >= 0 ? spawned[spec.follow] : null
    if (target && bubbles.includes(target) && target.state === 'live') {
      // Spawn just behind the one it will catch: nearer the front, a hair to one side.
      main = clamp(target.main + (target.base + r) * 1.35, lo, hi)
      cross = clamp(target.cross + (spec.phase / Math.PI - 1) * 0.3 * target.base, r + 10, Math.max(r + 10, B - r - 10))
    } else {
      // Don't spawn on top of another bubble: try two other spots across the band.
      let ok = !overlaps(main, cross, r)
      for (let k = 1; k <= 2 && !ok; k++) {
        const c = clamp(((spec.u + k / 3) % 1) * B, r + 10, Math.max(r + 10, B - r - 10))
        if (!overlaps(main, c, r)) {
          cross = c
          ok = true
        }
      }
      if (!ok) return null
    }
    return {
      main,
      cross,
      base: r,
      r,
      rise: fe.rise * L * spec.rise * extraRise,
      age: 0,
      squash: 0,
      phase: spec.phase,
      state: 'live',
      st: 0,
      into: null,
      om: 0,
      oc: 0,
      partner: null,
    }
  }

  const spawnDue = (): void => {
    const rMax = bubbleMax()
    while (next < specs.length && specs[next]!.at <= runPos) {
      const spec = specs[next]!
      const b = place(spec, Math.max(5, spec.size * rMax))
      if (!b) {
        // No room yet (band not on screen): try again next frame, unless the run is past.
        if (runPos - spec.at < 0.12) return
        spawned[next] = null
      } else {
        spawned[next] = b
        bubbles.push(b)
      }
      next++
    }
  }

  const popInto = (b: Bubble, edge: 'front' | 'tail'): void => {
    const B = breadth()
    b.state = 'pop'
    b.st = 0
    if (b.partner) b.partner = null
    // A low, wide notch (never a sharp nick): about three radii either side, under a radius deep.
    const peak = Math.min(b.r * 0.8, Number.isFinite(thick) ? thick * 0.2 : b.r * 0.8)
    dents.push({ edge, at: clamp(b.cross / B), half: Math.max(0.08, (3.2 * b.r) / B), depth: 0, peak, t: 0 })
  }

  const stepBubbles = (dt: number): void => {
    if (dt <= 0) return
    const L = length()
    for (const b of bubbles) {
      b.age += dt
      b.st += dt
      // Carried by the goo, rising through it against the pour (speeding up from rest).
      const k = Math.exp(-b.age / 0.22)
      const rise = b.rise * (1 - k)
      b.main += (0.8 * vBand - rise) * dt
      b.r += (b.base - b.r) * (1 - Math.exp(-dt / 0.08))
      // Squash a little as it accelerates (and as the goo around it lurches).
      const acc = (b.rise / 0.22) * k + 0.5 * Math.abs(aBand)
      const target = 0.2 * clamp(acc / (4 * L))
      b.squash += (target - b.squash) * (1 - Math.exp(-dt / 0.06))
      if (b.state === 'merge' && b.into) {
        const e = easeInOut(b.st / MERGE)
        b.main = b.into.main + b.om * (1 - e)
        b.cross = b.into.cross + b.oc * (1 - e)
        b.r = b.base * Math.sqrt(1 - e)
      }
    }
    // Merges: two live bubbles about to touch become one (the smaller slides into the bigger).
    for (let i = 0; i < bubbles.length; i++) {
      const a = bubbles[i]!
      if (a.state !== 'live' || a.age < 0.1 || a.partner) continue
      for (let j = i + 1; j < bubbles.length; j++) {
        const c = bubbles[j]!
        if (c.state !== 'live' || c.age < 0.1 || c.partner) continue
        const ra = drawnR(a)
        const rc2 = drawnR(c)
        if (Math.hypot(a.main - c.main, a.cross - c.cross) > ra + rc2 + 0.3 * Math.min(ra, rc2)) continue
        const [big, small] = a.base >= c.base ? [a, c] : [c, a]
        small.state = 'merge'
        small.st = 0
        small.into = big
        small.om = small.main - big.main
        small.oc = small.cross - big.cross
        big.partner = small
        big.base = Math.sqrt(big.base * big.base + small.base * small.base)
        break
      }
    }
    // Pops: a bubble that reaches an edge opens into it.
    const f = frameInput()
    const B = breadth()
    for (const b of bubbles) {
      if (b.state !== 'live' || b.age < 0.06) continue
      const u = clamp(b.cross / B)
      const ext = drawnR(b) * (1 - b.squash) * 1.1
      const gap = Math.max(1.5, 0.08 * b.base)
      if (b.main - ext <= Math.max(pageTransitionEdge(f, 'tail', u), -40) + gap) popInto(b, 'tail')
      else if (b.main + ext >= Math.min(pageTransitionEdge(f, 'front', u), L + 40) - gap) popInto(b, 'front')
    }
    bubbles = bubbles.filter((b) => {
      if (b.state === 'pop') return b.st < POP_SHRINK
      if (b.state === 'merge') {
        const keep = b.st < MERGE && !!b.into && bubbles.includes(b.into) && b.into.state === 'live'
        if (!keep && b.into?.partner === b) b.into.partner = null
        return keep
      }
      return true
    })
    for (const d of dents) {
      d.t += dt
      d.depth = d.peak * (d.t < DENT_IN ? Math.sin((Math.PI / 2) * (d.t / DENT_IN)) : 0.5 * (1 + Math.cos(Math.PI * clamp((d.t - DENT_IN) / DENT_OUT))))
    }
    dents = dents.filter((d) => d.t < DENT_IN + DENT_OUT)
  }

  /** While held, top the band up with a small bubble now and then, so it stays alive. */
  const holdBubbles = (dt: number): void => {
    if (!specs.length || hold > HOLD_LIVE - 1) return
    holdSpawn -= dt
    if (holdSpawn > 0 || bubbles.length >= 3) return
    holdSpawn = 0.42
    const i = Math.floor(hold * 10)
    const spec: PageTransitionBubbleSpec = {
      at: 0,
      u: rand(seed, 50 + i, 1),
      depth: 0.3 + rand(seed, 50 + i, 2) * 0.35,
      size: 0.25 + rand(seed, 50 + i, 3) * 0.4,
      rise: 0.5,
      phase: rand(seed, 50 + i, 4) * 6.28,
      follow: -1,
    }
    const b = place(spec, Math.max(5, spec.size * bubbleMax()))
    if (b) bubbles.push(b)
  }

  // ---- Motion ----

  const finish = (m: Motion): void => {
    motion = null
    if (m.kind === 'cover') {
      if (!Number.isFinite(thick)) {
        // The wall, fully covered: a plain rect (the front's mounds are past the far edge).
        frontAmp = 0
        tailAmp = 0
      }
      hold = 0
      holdSpawn = 0.3
      holdFront = front
      holdTail = tail
      setPhase('covered')
      draw()
      const list = coverWaiters
      coverWaiters = []
      flush(list)
      if (revealQueued) {
        revealQueued = false
        startReveal()
      }
    } else {
      front = 0
      tail = 0
      clearBubbles()
      setPhase('idle')
      const list = revealWaiters
      revealWaiters = []
      flush(list)
    }
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    clock += dt
    if (sweep) return stepSweep(sweep, dt)
    const m = motion
    if (m) {
      m.t += dt
      const p = clamp(m.t / m.dur)
      if (m.reduced) {
        opacity = m.kind === 'cover' ? m.o0 + (1 - m.o0) * p : m.o0 * (1 - p)
        draw()
      } else {
        const ease = m.kind === 'cover' ? PAGE_TRANSITION_COVER_EASE : PAGE_TRANSITION_REVEAL_EASE
        const e = ease(p)
        front = m.f0 + (m.f1 - m.f0) * e
        tail = m.t0 + (m.t1 - m.t0) * e
        runPos = m.kind === 'cover' ? Math.max(runPos, 0.5 * p) : Math.max(runPos, 0.5 + 0.5 * p)
        // Mound height follows speed, read slightly in the past: a braking front keeps
        // bulging forward for a moment (momentum overshoot); a tail stretches as it speeds up.
        const a = amps()
        const lagged = clamp(p - 0.16)
        const sp = clamp(easeSpeed(ease, lagged) / 1.6)
        const moving = (from: number, to: number): number => (Math.abs(to - from) > 1 ? 1 : 0)
        frontAmp = a.front * moving(m.f0, m.f1) * (0.35 + 0.65 * sp) * Math.min(1, p * 6)
        tailAmp = a.tail * moving(m.t0, m.t1) * (0.3 + 0.9 * sp)
        if (Number.isFinite(thick) && m.kind === 'reveal') frontAmp = Math.max(frontAmp, a.front * 0.35)
        goo(dt)
      }
      if (p >= 1) {
        finish(m)
        return motion !== null || holding()
      }
      return true
    }
    if (!holding()) return false
    // Held over the middle: the band keeps creeping on, slower and slower, its mounds
    // easing down and its bubbles still rising.
    hold += dt
    if (Number.isFinite(thick)) {
      const creep = 0.045 * length() * (1 - Math.exp(-hold / 0.7))
      front = holdFront + creep
      tail = holdTail + creep
      const a = amps()
      const settle = 1 - Math.exp(-dt / 0.35)
      frontAmp += (a.front * 0.3 - frontAmp) * settle
      tailAmp += (a.tail * 0.3 - tailAmp) * settle
      holdBubbles(dt)
    }
    goo(dt)
    return holding()
  }

  /** Bubbles and the redraw for one goo frame. */
  const goo = (dt: number): void => {
    if (dt > 0) {
      const v = ((front - prevFront) + (tail - prevTail)) / 2 / dt
      // Wall: one edge moves at a time; the goo itself moves about half as fast.
      const carry = Number.isFinite(thick) ? v : v * 0.5
      aBand = (carry - vBand) / dt
      vBand = carry
    }
    prevFront = front
    prevTail = tail
    spawnDue()
    stepBubbles(dt)
    draw()
  }

  /** Keep ticking while held: the band is alive (bounded), or bubbles / notches remain. */
  const holding = (): boolean =>
    phase === 'covered' && mode === 'goo' && !motion && (Number.isFinite(thick) ? hold < HOLD_LIVE : bubbles.length > 0 || dents.length > 0)

  const run = (m: Motion): void => {
    motion = m
    // A Set: safe to call from inside the ticker (cover finishing straight into a reveal).
    wakeTicker(tick)
    // No rAF (SSR-ish / tests without timers): jump to the end.
    if (typeof requestAnimationFrame !== 'function') {
      m.t = m.dur
      tick(0)
    }
  }

  const reroll = (): void => {
    seed += 7.77
    frontMounds = pageTransitionMounds(seed)
    tailMounds = pageTransitionMounds(seed + 17.3)
  }

  const startCover = (): void => {
    prime()
    const L = length()
    const wasIdle = phase === 'idle'
    // Mid-fade (reduced motion), keep fading even if the preference just changed.
    const isReduced = wasIdle ? reduced() : mode === 'rect'
    mode = isReduced ? 'rect' : 'goo'
    if (wasIdle) {
      thick = bandPx()
      reroll()
      clock = 0
      opacity = 0
      runPos = 0
      vBand = 0
      aBand = 0
      clearBubbles()
      if (!isReduced) specs = pageTransitionBubbles(seed + 5.5, Math.min(PAGE_TRANSITION_MAX_BUBBLES, bubbleTotal()))
    }
    const a = amps()
    const w = wobble()
    if (wasIdle) {
      front = -pageTransitionReach(frontMounds, a.front, w) - 8
      tail = Number.isFinite(thick) ? front - thick : -pageTransitionReach(tailMounds, a.tail, w) - 8
      prevFront = front
      prevTail = tail
    }
    setPhase('covering')
    const { cover } = durations()
    if (isReduced) {
      const o0 = wasIdle ? 0 : opacity
      // A drain interrupted part-way: snap to a full fill and fade from what was visible.
      run({ kind: 'cover', t: 0, dur: REDUCED_COVER * (1 - o0) + 0.001, reduced: true, f0: 0, f1: 0, t0: 0, t1: 0, o0 })
      return
    }
    opacity = 1
    let end: number
    let tailEnd: number
    if (Number.isFinite(thick)) {
      // The band comes to rest centred on the screen.
      end = L / 2 + thick / 2
      tailEnd = end - thick
    } else {
      // Past the far edge by the most the side walls' drag can pull the front back.
      end = L + 0.25 * a.front + 8
      tailEnd = -pageTransitionReach(tailMounds, a.tail, w) - 8
    }
    // Re-covering mid-run: scale the time by how far it has to go.
    const share = wasIdle ? 1 : clamp(Math.max(Math.abs(end - front), Math.abs(tail - tailEnd)) / (L + 8), 0.3, 1)
    run({ kind: 'cover', t: 0, dur: cover * share, reduced: false, f0: front, f1: end, t0: tail, t1: tailEnd, o0: 1 })
  }

  const startReveal = (): void => {
    setPhase('revealing')
    const { reveal } = durations()
    if (mode === 'rect') {
      run({ kind: 'reveal', t: 0, dur: REDUCED_REVEAL, reduced: true, f0: 0, f1: 0, t0: 0, t1: 0, o0: opacity || 1 })
      return
    }
    opacity = 1
    const L = length()
    const a = amps()
    tailMounds = pageTransitionMounds(seed + 31.1 + Math.random())
    const reach = pageTransitionReach(tailMounds, a.tail, wobble())
    const tailEnd = L + reach + 10
    if (Number.isFinite(thick)) {
      run({ kind: 'reveal', t: 0, dur: reveal, reduced: false, f0: front, f1: front + (tailEnd - tail), t0: tail, t1: tailEnd, o0: 1 })
      return
    }
    const frontEnd = Math.max(front, L + 8)
    run({ kind: 'reveal', t: 0, dur: reveal, reduced: false, f0: frontEnd, f1: frontEnd, t0: tail, t1: tailEnd, o0: 1 })
  }

  // ---- Split ----

  /** Which split the next transition would use (null: none). */
  const seamFor = (): PageTransitionSeam => {
    if (!doc?.body || opts.split === false || opts.enabled === false || reduced() || !Number.isFinite(bandPx())) return null
    if (typeof (doc as Document & { startViewTransition?: unknown }).startViewTransition === 'function') return 'view-transition'
    return typeof doc.body.cloneNode === 'function' ? 'clone' : null
  }

  /** The page's background colour (for the clone, and blank WebGL canvases in it). */
  const pageBackground = (): string => {
    const win = doc?.defaultView
    if (!doc || !win?.getComputedStyle) return '#fff'
    for (const el of [doc.body, doc.documentElement]) {
      const bg = win.getComputedStyle(el).backgroundColor
      if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg
    }
    return '#fff'
  }

  /** Copy a canvas's pixels into its clone; a blank result (WebGL without a kept buffer)
   *  gets the page background instead. */
  const copyCanvas = (from: HTMLCanvasElement, to: HTMLCanvasElement, bg: string): void => {
    try {
      if (!from.width || !from.height) return
      to.width = from.width
      to.height = from.height
      const ctx = to.getContext('2d')
      if (!ctx) return
      ctx.drawImage(from, 0, 0)
      const probe = doc!.createElement('canvas')
      probe.width = probe.height = 6
      const pc = probe.getContext('2d')
      if (!pc) return
      pc.drawImage(to, 0, 0, 6, 6)
      const px = pc.getImageData(0, 0, 6, 6).data
      let blank = true
      for (let i = 3; i < px.length; i += 4) if (px[i]) blank = false
      if (blank) {
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, to.width, to.height)
      }
    } catch {
      // Tainted or unsupported: leave the clone's canvas as it is.
    }
  }

  /** A fixed, aria-hidden overlay holding a copy of the page as it looks now (the old page),
   *  scrolled to the same spot, just under the band. */
  const buildClone = (): HTMLElement => {
    const d = doc!
    const body = d.body
    const win = d.defaultView
    const bg = pageBackground()
    const wrap = d.createElement('div')
    wrap.setAttribute('aria-hidden', 'true')
    wrap.setAttribute(PAGE_TRANSITION_OLD_ATTR, '')
    wrap.setAttribute('inert', '')
    const ws = wrap.style
    ws.position = 'fixed'
    ws.inset = '0'
    ws.top = '0'
    ws.left = '0'
    ws.width = '100%'
    ws.height = '100%'
    // A scroll container (scrolled from script only), so sticky content sticks as it did.
    // No containment or transform: fixed content inside stays fixed to the viewport.
    ws.overflow = 'hidden'
    ws.pointerEvents = 'none'
    ws.zIndex = String((opts.zIndex ?? 2147483000) - 1)
    ws.background = bg
    const inner = d.createElement('div')
    inner.className = body.className
    const bcs = win?.getComputedStyle?.(body)
    const is = inner.style
    is.position = 'relative'
    is.width = `${d.documentElement.clientWidth || win?.innerWidth || 0}px`
    is.minHeight = `${Math.max(d.documentElement.scrollHeight, body.scrollHeight, win?.innerHeight || 0)}px`
    if (bcs) {
      is.color = bcs.color
      is.fontFamily = bcs.fontFamily
      is.lineHeight = bcs.lineHeight
      is.padding = bcs.padding
    }
    const pairs: [Element, Element][] = []
    for (const child of Array.from(body.children)) {
      if (child === svg || CLONE_SKIP.has(child.tagName) || child.hasAttribute(PAGE_TRANSITION_OLD_ATTR)) continue
      const copy = child.cloneNode(true) as Element
      inner.appendChild(copy)
      pairs.push([child, copy])
    }
    if (!pairs.length) throw new Error('nothing to clone')
    // Fresh copies would replay their entrance animations from the start (blank): freeze them.
    const freeze = d.createElement('style')
    const sel = `[${PAGE_TRANSITION_OLD_ATTR}]`
    freeze.textContent = `${sel} *,${sel} *::before,${sel} *::after{animation:none!important;transition:none!important}`
    wrap.append(freeze, inner)
    body.appendChild(wrap)
    wrap.scrollTop = win?.scrollY ?? 0
    wrap.scrollLeft = win?.scrollX ?? 0
    for (const [from, to] of pairs) {
      const a = Array.from(from.querySelectorAll('*'))
      const b = Array.from(to.querySelectorAll('*'))
      if (a.length !== b.length) continue
      // Read every scroll offset first, then write (one layout).
      const scrolled: [number, number, number][] = []
      a.forEach((el, i) => {
        if (el.scrollTop || el.scrollLeft) scrolled.push([i, el.scrollTop, el.scrollLeft])
      })
      for (const [i, top, left] of scrolled) {
        b[i]!.scrollTop = top
        b[i]!.scrollLeft = left
      }
      a.forEach((el, i) => {
        if (el.tagName === 'CANVAS') copyCanvas(el as HTMLCanvasElement, b[i] as HTMLCanvasElement, bg)
      })
    }
    return wrap
  }

  const clipValue = (d: string): string => `path('${d}')`

  /** Clip the old page (snapshot or clone) to the region ahead of the band's front. */
  const applyClip = (input: PageTransitionFrameInput): void => {
    seamEdge = pageTransitionSplitEdge(input, PAGE_TRANSITION_SEAM_INSET, seamEdge)
    const clip = clipValue(pageTransitionSplitClip(input, seamEdge))
    if (seamMode === 'clone') {
      if (oldClone) oldClone.style.clipPath = clip
      return
    }
    if (clipAnim) {
      ;(clipAnim.effect as KeyframeEffect | null)?.setKeyframes([{ clipPath: clip }, { clipPath: clip }])
    } else if (vtStyle) {
      // No Web Animations on pseudo-elements: a style rule, kept alive by a no-op animation.
      vtStyle.textContent = VT_CSS(PAGE_TRANSITION_VT_NAME) + VT_HOLD + `${VT_PSEUDO}{clip-path:${clip};animation:goop-pt-hold 600s linear}`
    }
  }

  /** Start clipping the old snapshot (the view transition's pseudo-elements now exist). The
   *  clip animation also keeps the transition alive until the sweep ends. */
  const startClip = (): void => {
    const root = doc!.documentElement
    const vp = viewport()
    const full = clipValue(`M-10 -10H${vp.width + 10}V${vp.height + 10}H-10Z`)
    const canPseudo = typeof KeyframeEffect !== 'undefined' && 'pseudoElement' in KeyframeEffect.prototype && typeof root.animate === 'function'
    if (canPseudo) {
      try {
        clipAnim = root.animate([{ clipPath: full }, { clipPath: full }], { duration: 600000, fill: 'forwards', pseudoElement: VT_PSEUDO })
        return
      } catch {
        clipAnim = null
      }
    }
    if (vtStyle) vtStyle.textContent = VT_CSS(PAGE_TRANSITION_VT_NAME) + VT_HOLD + `${VT_PSEUDO}{clip-path:${full};animation:goop-pt-hold 600s linear}`
  }

  /** End a split run: hide the band, let the view transition finish, clean up, settle. */
  const endSplit = (abort: boolean): void => {
    runId++
    removeTicker(tick)
    const t = vt
    const anim = clipAnim
    const style = vtStyle
    vt = null
    clipAnim = null
    vtStyle = null
    const none = clipValue(PAGE_TRANSITION_CLIP_NONE)
    if (t && !abort) {
      // Hold the empty clip until the pseudo-elements are gone, so the old page never
      // flashes back: finish the clip animation (fill forwards) or drop the keep-alive,
      // then tidy up once the transition has finished.
      try {
        ;(anim?.effect as KeyframeEffect | null | undefined)?.setKeyframes([{ clipPath: none }, { clipPath: none }])
        anim?.finish()
      } catch {
        anim?.cancel()
      }
      if (style) style.textContent = VT_CSS(PAGE_TRANSITION_VT_NAME) + `${VT_PSEUDO}{clip-path:${none}}`
      const late = setTimeout(() => t.skipTransition(), 400)
      const tidy = (): void => {
        clearTimeout(late)
        anim?.cancel()
        style?.remove()
        if (tidyLater === tidy) tidyLater = null
      }
      tidyLater = tidy
      t.finished.then(tidy, tidy)
    } else {
      anim?.cancel()
      style?.remove()
      t?.skipTransition()
    }
    finishUpdate?.()
    finishUpdate = null
    oldClone?.remove()
    oldClone = null
    svg?.style.removeProperty('view-transition-name')
    sweep = null
    seamEdge = null
    seamMode = null
    ready = true
    veiled = false
    revealQueued = false
    front = 0
    tail = 0
    clearBubbles()
    wall?.setAttribute('d', '')
    lip?.setAttribute('d', '')
    setPhase('idle')
    const list = [...coverWaiters, ...revealWaiters]
    coverWaiters = []
    revealWaiters = []
    flush(list)
  }

  /** Mount the overlay and set its colours for a fresh run (split or swap). */
  const prime = (): void => {
    mount()
    accent = resolveAccent()
    highlight = resolveHighlight()
    const color = opts.color || PAGE_TRANSITION_COLOR
    if (grad && gradStops.length === 3) {
      gradStops[0]!.style.stopColor = color
      gradStops[1]!.style.stopColor = highlight ?? color
      gradStops[2]!.style.stopColor = color
    }
    if (wall) wall.style.fill = highlight && grad ? `url(#${grad.id})` : color
    if (lip) lip.style.fill = accent ?? 'none'
  }

  /** The new page is ready: let the split sweep through. */
  const openGate = (): void => {
    ready = true
    setPhase('revealing')
    const f = finishUpdate
    finishUpdate = null
    f?.()
  }

  const wake = (): void => {
    wakeTicker(tick)
    // No rAF (SSR-ish / tests without timers): jump to the end.
    if (typeof requestAnimationFrame !== 'function' && sweep && ready) {
      sweep.p = 1
      tick(0)
    }
  }

  /** Start a split run. False when it can't start (the caller falls back to the swap). */
  const startSplit = (kind: Exclude<PageTransitionSeam, null>): boolean => {
    prime()
    if (!svg) return false
    mode = 'goo'
    thick = bandPx()
    reroll()
    clock = 0
    opacity = 1
    runPos = 0
    vBand = 0
    aBand = 0
    clearBubbles()
    specs = pageTransitionBubbles(seed + 5.5, Math.min(PAGE_TRANSITION_MAX_BUBBLES, bubbleTotal()))
    const L = length()
    const a = amps()
    const w = wobble()
    // The trailing mounds stretch with speed past their nominal height: allow for it.
    const tailReach = pageTransitionReach(tailMounds, a.tail, w) * 1.3
    const f0 = -pageTransitionReach(frontMounds, a.front, w) - 8
    const f1 = L + tailReach + 10 + thick
    // The gate: the trailing edge's mounds still just behind the entry edge, so nothing of
    // the new page shows yet. Invert the ease by bisection.
    const target = clamp((thick - tailReach - 2 - f0) / (f1 - f0))
    let lo = 0
    let hi = 1
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2
      if (pageTransitionSweepEase(mid) < target) lo = mid
      else hi = mid
    }
    const { cover: c, reveal: r } = durations()
    const next: Sweep = { p: 0, dur: c + r, f0, f1, gate: lo }
    front = f0
    tail = f0 - thick
    prevFront = front
    prevTail = tail
    frontAmp = 0
    tailAmp = 0
    seamEdge = null
    revealQueued = false
    seamMode = kind
    const id = ++runId
    if (kind === 'clone') {
      try {
        oldClone = buildClone()
      } catch {
        oldClone?.remove()
        oldClone = null
        seamMode = null
        return false
      }
      ready = false
      sweep = next
      setPhase('covered')
      draw()
      const list = coverWaiters
      coverWaiters = []
      flush(list)
      wake()
      return true
    }
    // View transition: the band must not be in the old snapshot.
    veiled = true
    setPhase('covering')
    const style = doc!.createElement('style')
    style.setAttribute(PAGE_TRANSITION_OLD_ATTR, '')
    style.textContent = VT_CSS(PAGE_TRANSITION_VT_NAME)
    ;(doc!.head ?? doc!.documentElement).appendChild(style)
    vtStyle = style
    let t: ViewTransitionLike
    try {
      const start = (doc as Document & { startViewTransition: StartViewTransition }).startViewTransition
      t = start.call(
        doc,
        () =>
          new Promise<void>((resolve) => {
            if (id !== runId) return resolve()
            finishUpdate = resolve
            // The old page is captured: show the band (empty for now) as its own live group,
            // above root, and let the caller change the DOM.
            veiled = false
            svg?.style.setProperty('view-transition-name', PAGE_TRANSITION_VT_NAME)
            wall?.setAttribute('d', '')
            lip?.setAttribute('d', '')
            setPhase('covered')
            const list = coverWaiters
            coverWaiters = []
            flush(list)
            if (revealQueued) {
              revealQueued = false
              openGate()
            }
          }),
      )
    } catch {
      style.remove()
      vtStyle = null
      veiled = false
      seamMode = null
      runId++
      return false
    }
    vt = t
    t.ready.then(
      () => {
        if (id !== runId) return
        startClip()
        sweep = next
        draw()
        wake()
      },
      () => {
        // Skipped (timed out, superseded, hidden tab): the DOM has changed anyway; end now.
        if (id === runId) endSplit(true)
      },
    )
    return true
  }

  const stepSweep = (sw: Sweep, dt: number): boolean => {
    // Held short of the gate (easing into it) until the new page is ready.
    const rate = ready ? 1 : clamp((sw.gate - sw.p) / 0.05)
    sw.p = Math.min(1, sw.p + (dt / sw.dur) * rate)
    front = sw.f0 + (sw.f1 - sw.f0) * pageTransitionSweepEase(sw.p)
    tail = front - thick
    runPos = sw.p
    // Mound heights follow the speed, read slightly in the past (momentum), eased so a hold
    // at the gate settles them.
    const a = amps()
    const held = !ready && sw.p > sw.gate - 0.02
    const sp = held ? 0 : (1 + SWEEP_EASE_K * Math.cos(2 * Math.PI * clamp(sw.p - 0.08))) / (1 + SWEEP_EASE_K)
    const settle = 1 - Math.exp(-dt / 0.1)
    frontAmp += (a.front * (0.35 + 0.65 * sp) * Math.min(1, sw.p * 8) - frontAmp) * settle
    tailAmp += (a.tail * (0.3 + 0.9 * sp) - tailAmp) * settle
    goo(dt)
    if (sw.p >= 1) {
      endSplit(false)
      return false
    }
    return true
  }

  return {
    cover() {
      if (destroyed || opts.enabled === false || !doc) return Promise.resolve()
      if (phase === 'covered') return Promise.resolve()
      revealQueued = false
      if (seamMode && phase === 'revealing') endSplit(true)
      const p = new Promise<void>((resolve) => coverWaiters.push(resolve))
      if (phase === 'covering') return p
      if (phase === 'idle') {
        const s = seamFor()
        // View transition, else the clone, else the swap.
        if (s === 'view-transition' && startSplit(s)) return p
        if (s && startSplit('clone')) return p
      }
      if (phase === 'revealing') {
        // A new navigation mid-drain: the drain is superseded.
        const list = revealWaiters
        revealWaiters = []
        flush(list)
      }
      startCover()
      return p
    },
    reveal() {
      if (destroyed || !doc || phase === 'idle') return Promise.resolve()
      const p = new Promise<void>((resolve) => revealWaiters.push(resolve))
      if (phase === 'covering') revealQueued = true
      else if (phase === 'covered') {
        if (seamMode) openGate()
        else startReveal()
      }
      return p
    },
    get phase() {
      return phase
    },
    get reducedMotion() {
      return reduced()
    },
    get bubbleCount() {
      return bubbles.filter((b) => b.state !== 'merge').length
    },
    get seam() {
      return phase === 'idle' ? seamFor() : seamMode
    },
    update(nextOpts) {
      opts = { ...opts, ...nextOpts }
      if (svg && nextOpts.zIndex !== undefined) svg.style.zIndex = String(nextOpts.zIndex)
      if (opts.enabled === false && phase !== 'idle') {
        // Turned off mid-transition: drop the overlay now.
        if (seamMode) return endSplit(true)
        removeTicker(tick)
        motion = null
        revealQueued = false
        front = 0
        tail = 0
        clearBubbles()
        setPhase('idle')
        const list = [...coverWaiters, ...revealWaiters]
        coverWaiters = []
        revealWaiters = []
        flush(list)
      }
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      if (seamMode) endSplit(true)
      tidyLater?.()
      removeTicker(tick)
      motion = null
      clearBubbles()
      svg?.remove()
      svg = wall = lip = grad = null
      gradStops = []
      phase = 'idle'
      const list = [...coverWaiters, ...revealWaiters]
      coverWaiters = []
      revealWaiters = []
      flush(list)
    },
  }
}

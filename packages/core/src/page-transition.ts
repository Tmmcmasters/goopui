// Page transition: a wall of goo pours in from one edge of the viewport, covers it, holds
// while the next page gets ready, then drains out the far edge revealing the new page.
//
// Rendering: one fixed, full-viewport, aria-hidden <svg> with one <path> (plus an optional
// accent path for a coloured lip on the moving edges), rewritten once per frame. No SVG
// filter, no canvas, no WebGL: the goo look comes from the edge shape itself, so the cost
// per frame is a single filled path of ~2 x PAGE_TRANSITION_SAMPLES points. The overlay is
// position: fixed, so it never adds to the page's scroll size.
//
// The edges: the wall's leading front and (while draining) its trailing edge. Each edge is
// flat plus a few low, wide raised-cosine mounds (the `emergeMound` profile: zero slope at
// the peak and where it meets the edge, asymmetric widths), re-rolled every transition, so
// it never repeats and is never a symmetric centred bump. Mounds always point into the empty
// side: the front bulges ahead as it pours in, the trailing edge stretches back as it drains
// (poured goo lagging behind). Their height follows the edge's speed with a lag, so a front
// that brakes keeps bulging forward for a moment (momentum overshoot) and a tail that speeds
// up stretches out. The sides drag a little against the viewport walls (meniscus). Mounds
// wobble in height and drift along the edge while they move. Nothing is left behind.
//
// Reduced motion: no goo; the overlay (a plain full-viewport fill) fades in and out quickly.
//
// Nothing touches `document` until the first cover().

import type { GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion } from './reduced-motion'
import { readPreset } from './tuning'

/** Direction the goo travels: 'down' pours in from the top edge and drains out the bottom. */
export type PageTransitionDirection = 'up' | 'down' | 'left' | 'right'

/** 'idle' (hidden) -> 'covering' -> 'covered' (holding) -> 'revealing' -> 'idle'. */
export type PageTransitionPhase = 'idle' | 'covering' | 'covered' | 'revealing'

/** Per-preset feel. Times in seconds; lengths as fractions of the travel length. */
export interface PageTransitionFeel {
  /** Cover / reveal durations (s) at speed 1. */
  cover: number
  reveal: number
  /** Front mound height (fraction of the viewport's travel length, capped in px). */
  bulge: number
  /** Trailing-edge stretch while draining (fraction of travel length, capped in px). */
  lag: number
  /** Wobble: mound height oscillation (0..1 of its height). */
  wobble: number
  /** Wobble frequency (Hz). */
  hz: number
}

export const PAGE_TRANSITION_FEEL: Readonly<Record<GoopPreset, Readonly<PageTransitionFeel>>> = Object.freeze({
  subtle: Object.freeze({ cover: 0.25, reveal: 0.29, bulge: 0.05, lag: 0.07, wobble: 0.16, hz: 2.6 }),
  playful: Object.freeze({ cover: 0.28, reveal: 0.32, bulge: 0.075, lag: 0.1, wobble: 0.26, hz: 3 }),
  wild: Object.freeze({ cover: 0.34, reveal: 0.38, bulge: 0.105, lag: 0.14, wobble: 0.36, hz: 3.4 }),
})

/** Samples along each edge. Kept modest: the path is rewritten every frame. */
export const PAGE_TRANSITION_SAMPLES = 28
/** Mounds per edge. */
export const PAGE_TRANSITION_MOUNDS = 3
/** Default wall colour: `--goop-page-transition`, then the theme's `--primary`. */
export const PAGE_TRANSITION_COLOR = 'var(--goop-page-transition, var(--primary, #111))'
/** CSS custom property read for the accent lip when `accent` isn't set. */
export const PAGE_TRANSITION_ACCENT_VAR = '--goop-page-transition-accent'
/** Attribute on the overlay with the current phase. */
export const PAGE_TRANSITION_ATTR = 'data-goop-page-transition'

const MOUND_PX_MAX = 70
const TAIL_PX_MAX = 96
const REDUCED_COVER = 0.14
const REDUCED_REVEAL = 0.18

export interface PageTransitionOptions {
  /** Travel direction. Default 'down' (pours from the top, drains out the bottom). */
  direction?: PageTransitionDirection
  /** Wall fill, any CSS colour or `var()`. Default PAGE_TRANSITION_COLOR. */
  color?: string
  /** Lip colour on the moving edges (e.g. a brand colour), or false for none. Default: the
   *  `--goop-page-transition-accent` custom property when set on <html>, else none. */
  accent?: string | false
  /** Total duration (ms) of cover + reveal at speed 1, split like the preset's. Default
   *  from the preset (~600). The hold in between lasts until reveal() is called. */
  duration?: number
  /** Cover / reveal durations (ms); override `duration`. */
  coverDuration?: number
  revealDuration?: number
  /** Speed multiplier. Default 1. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default `--goop-preset` on <html>, then playful. */
  preset?: GoopPreset
  /** Mounds on the leading front. `true` (default), `false` (a flat front) or 0..2. */
  bulge?: boolean | number
  /** Mounds wobble and drift while moving. `true` (default), `false` or 0..2. */
  wobble?: boolean | number
  /** The trailing edge stretches back while draining. `true` (default), `false` or 0..2. */
  lag?: boolean | number
  /** Master switch. `false`: cover() / reveal() resolve at once and nothing is drawn. */
  enabled?: boolean
  /** Force reduced motion on (`true`) or ignore the OS setting (`false`). Default 'auto'. */
  reducedMotion?: boolean | 'auto'
  /** Overlay z-index. Default 2147483000. */
  zIndex?: number
  /** Seed for the first transition's mounds (each transition re-rolls). Default random. */
  seed?: number
}

export interface PageTransitionHandle {
  /** Pour the goo in. Resolves once the viewport is fully covered (at once when already
   *  covered, disabled, or after destroy()). */
  cover(): Promise<void>
  /** Drain it out. Waits for a running cover first. Resolves when the overlay is hidden. */
  reveal(): Promise<void>
  readonly phase: PageTransitionPhase
  /** Is the current / next transition the reduced-motion fade? */
  readonly reducedMotion: boolean
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

/** Cover: a quick pour that brakes into the far edge. Reveal: lets go, then drains away. */
export const PAGE_TRANSITION_COVER_EASE = cubicBezier(0.5, 0.05, 0.22, 1)
export const PAGE_TRANSITION_REVEAL_EASE = cubicBezier(0.55, 0, 0.3, 1)

/** Speed of an easing at `t` (progress per unit time), central difference. */
function easeSpeed(ease: (t: number) => number, t: number): number {
  const e = 0.012
  return (ease(clamp(t + e)) - ease(clamp(t - e))) / (2 * e)
}

/** One frame of the wall, in the travel frame: `main` runs along the travel direction from
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
  /** Accent lip thickness (px) on moving edges; 0 for none. */
  rim?: number
}

export interface PageTransitionFrame {
  /** The wall's path (viewport px). Empty when nothing is on screen. */
  d: string
  /** The accent lip's path (a slightly larger wall drawn underneath), or '' for none. */
  accent: string
}

const fmt = (v: number): string => (Math.round(v * 10) / 10).toString()

/** Smooth closed path through `pts` (quadratic curves through midpoints). */
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

/**
 * The wall's outline for one frame: the front edge (mounds pointing ahead, into the empty
 * side) across the viewport, then the trailing edge back (mounds pointing behind). Each edge
 * is PAGE_TRANSITION_SAMPLES + 1 points, clamped a few px outside the viewport so the path
 * stays small. A fully covered viewport is a plain rect. Pure.
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
  const outline = (grow: number): string => {
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
      const fm = clamp(f.front + m + gf, -pad, length + pad)
      const tm = clamp(f.tail - t - gt, -pad, length + pad)
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
      return `M${fmt(x)} ${fmt(y)}H${fmt(Math.max(x0, x1))}V${fmt(Math.max(y0, y1))}H${fmt(x)}Z`
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
    return out.join('')
  }
  return { d: outline(0), accent: rim > 0 ? outline(rim) : '' }
}

// ---- Controller -----------------------------------------------------------------------------

const strengthOf = (v: boolean | number | undefined): number =>
  v === false ? 0 : v === true || v === undefined ? 1 : Number.isFinite(v) ? clamp(v, 0, 2) : 1

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

/** Mount a goo page-transition overlay. SSR-safe: inert without a document. */
export function createPageTransition(initial: PageTransitionOptions = {}): PageTransitionHandle {
  let opts: PageTransitionOptions = { ...initial }
  const doc: Document | null = typeof document !== 'undefined' ? document : null
  let svg: SVGSVGElement | null = null
  let wall: SVGPathElement | null = null
  let lip: SVGPathElement | null = null
  let phase: PageTransitionPhase = 'idle'
  let destroyed = false
  let motion: Motion | null = null
  let clock = 0
  let seed = opts.seed ?? Math.random() * 1000
  let frontMounds = pageTransitionMounds(seed)
  let tailMounds = pageTransitionMounds(seed + 17.3)
  // Current wall position (px along main) and opacity.
  let front = 0
  let tail = 0
  let opacity = 1
  let frontAmp = 0
  let tailAmp = 0
  let accent: string | null = null
  /** 'rect': the reduced-motion fade (a plain fill); 'goo': the wall. */
  let mode: 'rect' | 'goo' = 'goo'
  let coverWaiters: (() => void)[] = []
  let revealWaiters: (() => void)[] = []
  let revealQueued = false

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
  /** Mound amplitudes (px) at full strength for this viewport. */
  const amps = (): { front: number; tail: number } => {
    const fe = feel()
    const L = length()
    const v = viewport()
    const B = vertical() ? v.width : v.height
    // Low and wide: never taller than a small share of the edge's breadth (phones).
    return {
      front: Math.min(MOUND_PX_MAX, fe.bulge * L, 0.085 * B) * strengthOf(opts.bulge),
      tail: Math.min(TAIL_PX_MAX, fe.lag * L, 0.12 * B) * strengthOf(opts.lag),
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
    lip = doc.createElementNS(NS, 'path') as SVGPathElement
    wall = doc.createElementNS(NS, 'path') as SVGPathElement
    svg.append(lip, wall)
    doc.body.appendChild(svg)
  }

  const resolveAccent = (): string | null => {
    if (opts.accent === false) return null
    if (typeof opts.accent === 'string' && opts.accent) return opts.accent
    const raw = doc?.defaultView?.getComputedStyle?.(doc.documentElement)?.getPropertyValue(PAGE_TRANSITION_ACCENT_VAR)?.trim()
    return raw ? `var(${PAGE_TRANSITION_ACCENT_VAR})` : null
  }

  const setPhase = (p: PageTransitionPhase): void => {
    phase = p
    if (!svg) return
    svg.setAttribute(PAGE_TRANSITION_ATTR, p)
    svg.style.display = p === 'idle' ? 'none' : 'block'
    // Block clicks while the screen is (being) covered; let them through while draining.
    svg.style.pointerEvents = p === 'covering' || p === 'covered' ? 'auto' : 'none'
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
    const fe = feel()
    const L = vertical() ? vp.height : vp.width
    const frame = pageTransitionFrame({
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
      hz: fe.hz,
      rim: accent ? Math.min(9, Math.max(3, L * 0.008)) : 0,
    })
    wall.setAttribute('d', frame.d)
    lip.setAttribute('d', frame.accent)
  }

  const finish = (m: Motion): void => {
    motion = null
    if (m.kind === 'cover') {
      // Fully covered: a plain rect (the front's mounds are past the far edge anyway).
      frontAmp = 0
      tailAmp = 0
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
      setPhase('idle')
      const list = revealWaiters
      revealWaiters = []
      flush(list)
    }
  }

  const tick: Ticker = (dt) => {
    if (!motion || destroyed) return false
    const m = motion
    m.t += dt
    clock += dt
    const p = clamp(m.t / m.dur)
    if (m.reduced) {
      opacity = m.kind === 'cover' ? m.o0 + (1 - m.o0) * p : m.o0 * (1 - p)
    } else {
      const ease = m.kind === 'cover' ? PAGE_TRANSITION_COVER_EASE : PAGE_TRANSITION_REVEAL_EASE
      const e = ease(p)
      front = m.f0 + (m.f1 - m.f0) * e
      tail = m.t0 + (m.t1 - m.t0) * e
      // Mound height follows speed, read slightly in the past: a braking front keeps bulging
      // forward for a moment (momentum overshoot); a draining tail stretches as it speeds up.
      const a = amps()
      const lagged = clamp(p - 0.16)
      const sp = clamp(easeSpeed(ease, lagged) / 1.6)
      const moving = (from: number, to: number): number => (Math.abs(to - from) > 1 ? 1 : 0)
      frontAmp = a.front * moving(m.f0, m.f1) * (0.35 + 0.65 * sp) * Math.min(1, p * 6)
      tailAmp = a.tail * moving(m.t0, m.t1) * (0.25 + 0.95 * sp)
    }
    draw()
    if (p >= 1) {
      finish(m)
      return motion !== null
    }
    return true
  }

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
    mount()
    accent = resolveAccent()
    if (wall) wall.style.fill = opts.color || PAGE_TRANSITION_COLOR
    if (lip) lip.style.fill = accent ?? 'none'
    const L = length()
    const wasIdle = phase === 'idle'
    // Mid-fade (reduced motion), keep fading even if the preference just changed.
    const isReduced = wasIdle ? reduced() : mode === 'rect'
    mode = isReduced ? 'rect' : 'goo'
    const a = amps()
    const w = wobble()
    if (wasIdle) {
      reroll()
      clock = 0
      opacity = 0
      front = -pageTransitionReach(frontMounds, a.front, w) - 8
      tail = -pageTransitionReach(tailMounds, a.tail, w) - 8
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
    // Past the far edge by the most the side walls' drag can pull the front back.
    const end = L + 0.25 * a.front + 8
    const tailHome = -pageTransitionReach(tailMounds, a.tail, w) - 8
    // Re-covering mid-drain: the tail runs back toward the entry edge (scaled time).
    const share = wasIdle ? 1 : clamp(Math.max((end - front) / (end + 8), (tail - tailHome) / (L + 8)), 0.3, 1)
    run({ kind: 'cover', t: 0, dur: cover * share, reduced: false, f0: front, f1: end, t0: tail, t1: tailHome, o0: 1 })
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
    const frontEnd = Math.max(front, L + 8)
    run({ kind: 'reveal', t: 0, dur: reveal, reduced: false, f0: frontEnd, f1: frontEnd, t0: tail, t1: L + reach + 10, o0: 1 })
  }

  return {
    cover() {
      if (destroyed || opts.enabled === false || !doc) return Promise.resolve()
      if (phase === 'covered') return Promise.resolve()
      revealQueued = false
      const p = new Promise<void>((resolve) => coverWaiters.push(resolve))
      if (phase === 'covering') return p
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
      else if (phase === 'covered') startReveal()
      return p
    },
    get phase() {
      return phase
    },
    get reducedMotion() {
      return reduced()
    },
    update(next) {
      opts = { ...opts, ...next }
      if (svg && next.zIndex !== undefined) svg.style.zIndex = String(next.zIndex)
      if (opts.enabled === false && phase !== 'idle') {
        // Turned off mid-transition: drop the overlay now.
        removeTicker(tick)
        motion = null
        revealQueued = false
        front = 0
        tail = 0
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
      removeTicker(tick)
      motion = null
      svg?.remove()
      svg = wall = lip = null
      phase = 'idle'
      const list = [...coverWaiters, ...revealWaiters]
      coverWaiters = []
      revealWaiters = []
      flush(list)
    },
  }
}

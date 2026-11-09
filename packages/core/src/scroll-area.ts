// Scroll area goo thumb: the scrollbar thumb is a soft goo body. While the content scrolls it
// stretches a little with the scroll speed (a tail trailing behind its leading end, slightly
// thinner across), and when the scroll runs into an end and keeps pushing (wheel, trackpad,
// touch) it squashes against that end, then springs back with a small jelly wobble.
//
// Cheap on purpose: no filter and no layer. Each thumb's visible body is one element inside
// the thumb (`[data-goop-scroll-thumb]`; the thumb itself keeps the primitive's translate)
// whose `transform` is set only while a spring moves, on the shared frame loop, then cleared.
// At rest nothing runs. Scroll speed is measured in viewports per second, so it reads the same
// for a short list and a long one. The stretch never reaches past the scrollbar's track (it is
// limited to the room behind the thumb), so the root's `overflow: hidden` never clips it, and
// transforms never change layout or the scroll size. Listeners are passive: scrolling itself is
// never blocked or changed. Reduced motion: the thumb stays a plain thumb.
// No DOM access until `attachScrollArea` is called (SSR-safe); the shape helpers are pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { clamp, isSpringSettled, springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable scroll area effects (boolean or multiplier). */
export const SCROLL_AREA_EFFECTS = ['stretch', 'jelly'] as const
export type ScrollAreaEffect = (typeof SCROLL_AREA_EFFECTS)[number]

export interface ScrollAreaFeel {
  /** Stretch per viewport-per-second of scroll speed. */
  gain: number
  /** Most the thumb stretches (fraction of its length). Low. */
  max: number
  /** Squash per viewport of push past an end (wheel / touch). */
  squashGain: number
  /** Most the thumb squashes against an end (fraction of its length). */
  squash: number
  /** Spring response (s) and damping ratio: under 1, so it wobbles once or twice on settling. */
  response: number
  damping: number
}

export const SCROLL_AREA_FEEL: Readonly<Record<GoopPreset, Readonly<ScrollAreaFeel>>> = Object.freeze({
  subtle: Object.freeze({ gain: 0.025, max: 0.08, squashGain: 0.25, squash: 0.08, response: 0.3, damping: 0.55 }),
  playful: Object.freeze({ gain: 0.035, max: 0.14, squashGain: 0.35, squash: 0.14, response: 0.32, damping: 0.42 }),
  wild: Object.freeze({ gain: 0.05, max: 0.22, squashGain: 0.5, squash: 0.22, response: 0.36, damping: 0.32 }),
})

/** Set on the element inside each thumb that paints it (the goo body). */
export const SCROLL_THUMB_ATTR = 'data-goop-scroll-thumb'
/** Set on the scrolling viewport inside the root. */
export const SCROLL_VIEWPORT_ATTR = 'data-goop-scroll-viewport'
/** Core marks the root it is attached to (so nested scroll areas keep their own thumbs). */
export const SCROLL_ROOT_ATTR = 'data-goop-scroll-root'

export interface ScrollAreaOptions {
  /** The thumb stretches with scroll speed. `false`: off; `true`: the preset's; a number scales it. */
  stretch?: boolean | number
  /** Pushing past an end squashes the thumb against it; it springs back with a jelly wobble.
   *  `false`: off; `true`: the preset's; a number scales it. */
  jelly?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the thumb static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface ScrollAreaHandle {
  update(options: ScrollAreaOptions): void
  /** Current deformation per axis (fraction of the thumb's length; negative = squash). */
  readonly stretch: { x: number; y: number }
  readonly running: boolean
  destroy(): void
}

/** How far the thumb stretches at `speed` viewports per second (pure). */
export function scrollStretch(speed: number, feel: ScrollAreaFeel = SCROLL_AREA_FEEL.playful, strength = 1): number {
  if (!(strength > 0) || !Number.isFinite(speed)) return 0
  return clamp(Math.abs(speed) * feel.gain, 0, feel.max) * Math.min(3, strength)
}

/** How far the thumb squashes (a negative stretch) after pushing `push` viewports past an end (pure). */
export function scrollSquash(push: number, feel: ScrollAreaFeel = SCROLL_AREA_FEEL.playful, strength = 1): number {
  if (!(strength > 0) || !Number.isFinite(push)) return 0
  // Soft saturation: the first push reads, a long one never flattens the thumb.
  const k = Math.abs(push) * feel.squashGain
  return -(feel.squash * (1 - Math.exp(-k / Math.max(1e-6, feel.squash)))) * Math.min(3, strength)
}

/**
 * The transform for a thumb deformed by `s` (fraction of its length; negative = squash) along
 * `axis`, its leading end toward `dir` (+1 down / right). Scales about the leading end, so a
 * stretch is a tail trailing behind and a squash presses against the end it hit. Across, it
 * thins while stretched and widens a touch while squashed (keeps the body's volume), capped so
 * it stays inside the scrollbar's padding. Pure.
 */
export function scrollThumbTransform(axis: 'x' | 'y', s: number, dir: number): { transform: string; origin: string } {
  const along = Math.max(0.5, 1 + s)
  const across = clamp(1 - s * 0.35, 0.8, 1.06)
  const fmt = (v: number): string => (Math.round(v * 1000) / 1000).toString()
  if (axis === 'y') return { transform: `scale(${fmt(across)}, ${fmt(along)})`, origin: dir >= 0 ? '50% 100%' : '50% 0%' }
  return { transform: `scale(${fmt(along)}, ${fmt(across)})`, origin: dir >= 0 ? '100% 50%' : '0% 50%' }
}

/** Scroll / wheel / touch input further apart than this (s) counts as stopped. */
const IDLE = 0.09
const AXES = ['x', 'y'] as const
type Axis = 'x' | 'y'

/** Attach the goo thumb to a scroll area `root` (its viewport: `[data-goop-scroll-viewport]`,
 *  or the root itself; each thumb's body: `[data-goop-scroll-thumb]` inside the thumb, whose
 *  parent is the scrollbar with `data-orientation`). */
export function attachScrollArea(root: HTMLElement, initial: ScrollAreaOptions = {}): ScrollAreaHandle {
  const doc = root.ownerDocument
  let options: ScrollAreaOptions = { ...initial }
  const readReduced = (): boolean =>
    options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  const viewport = root.querySelector<HTMLElement>(`[${SCROLL_VIEWPORT_ATTR}]`) ?? root
  root.setAttribute(SCROLL_ROOT_ATTR, '')

  let feel: ScrollAreaFeel = SCROLL_AREA_FEEL[GOOP_DEFAULT_PRESET]
  let cfg: SpringConfig = springConfig({ response: feel.response, dampingRatio: feel.damping })
  const resolveFeel = (): void => {
    feel = SCROLL_AREA_FEEL[readPreset(root, options.preset)] ?? SCROLL_AREA_FEEL[GOOP_DEFAULT_PRESET]
    const sp = options.speed && options.speed > 0 ? options.speed : 1
    cfg = springConfig({ response: feel.response / sp, dampingRatio: feel.damping })
  }
  resolveFeel()

  type AxisState = { s: SpringState; target: number; dir: number; pos: number; at: number; idle: number; push: number }
  const fresh = (pos: number): AxisState => ({ s: { x: 0, v: 0 }, target: 0, dir: 1, pos, at: 0, idle: 0, push: 0 })
  const axes: Record<Axis, AxisState> = { x: fresh(viewport.scrollLeft), y: fresh(viewport.scrollTop) }
  let painted = false

  const stretchOn = (): number => (reduced ? 0 : effectStrength(options.stretch))
  const jellyOn = (): number => (reduced ? 0 : effectStrength(options.jelly))

  const orientationOf = (el: HTMLElement): string | null => {
    let n: HTMLElement | null = el
    while (n && n !== root) {
      const o = n.getAttribute('data-orientation')
      if (o) return o
      n = n.parentElement
    }
    return null
  }
  const thumbs = (axis: Axis): HTMLElement[] =>
    Array.from(root.querySelectorAll<HTMLElement>(`[${SCROLL_THUMB_ATTR}]`)).filter((el) => {
      if (el.closest(`[${SCROLL_ROOT_ATTR}]`) !== root) return false
      const o = orientationOf(el)
      return axis === 'x' ? o === 'horizontal' : o !== 'horizontal'
    })

  /** Room (fraction of the thumb's length) behind its trailing end, inside the track. */
  const roomBehind = (body: HTMLElement, axis: Axis, dir: number): number => {
    const thumb = body.parentElement
    const track = thumb?.parentElement
    if (!thumb || !track) return Infinity
    const t = thumb.getBoundingClientRect()
    const r = track.getBoundingClientRect()
    const len = axis === 'y' ? t.height : t.width
    if (!(len > 0)) return Infinity // not laid out (nothing to clip)
    const behind = axis === 'y' ? (dir >= 0 ? t.top - r.top : r.bottom - t.bottom) : dir >= 0 ? t.left - r.left : r.right - t.right
    return Math.max(0, behind) / len
  }

  const paint = (): void => {
    let any = false
    for (const axis of AXES) {
      const a = axes[axis]
      for (const el of thumbs(axis)) {
        let s = a.s.x
        // Never past the track: the stretch is limited to the room behind the thumb.
        if (s > 0) s = Math.min(s, roomBehind(el, axis, a.dir))
        if (Math.abs(s) < 0.001) {
          el.style.transform = ''
          el.style.transformOrigin = ''
        } else {
          const t = scrollThumbTransform(axis, s, a.dir)
          el.style.transform = t.transform
          el.style.transformOrigin = t.origin
          any = true
        }
      }
    }
    painted = any
  }

  const tick: Ticker = (dt) => {
    let moving = false
    for (const axis of AXES) {
      const a = axes[axis]
      a.idle += dt
      if (a.idle > IDLE) {
        a.target = 0
        a.push = 0
      }
      stepSpring(a.s, a.target, cfg, dt)
      if (a.target !== 0 || !isSpringSettled(a.s, a.target, 0.002, 0.02)) moving = true
    }
    if (!moving) {
      for (const a of Object.values(axes)) {
        a.s.x = 0
        a.s.v = 0
      }
    }
    paint()
    return moving
  }

  const now = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000
  const sizeOf = (axis: Axis): number => (axis === 'y' ? viewport.clientHeight : viewport.clientWidth)
  const maxOf = (axis: Axis): number =>
    axis === 'y' ? viewport.scrollHeight - viewport.clientHeight : viewport.scrollWidth - viewport.clientWidth
  const posOf = (axis: Axis): number => (axis === 'y' ? viewport.scrollTop : viewport.scrollLeft)
  /** -1 at the start, +1 at the end, 0 in between (or nothing to scroll). */
  const endOf = (axis: Axis): number => {
    const max = maxOf(axis)
    if (!(max > 0.5)) return 0
    const p = posOf(axis)
    return p <= 0.5 ? -1 : p >= max - 0.5 ? 1 : 0
  }

  const onScroll = (): void => {
    const t = now()
    for (const axis of AXES) {
      const a = axes[axis]
      const pos = posOf(axis)
      const size = sizeOf(axis)
      const dp = pos - a.pos
      const dt = a.at > 0 ? t - a.at : 1 / 60
      a.pos = pos
      if (dp === 0) continue
      a.at = t
      a.idle = 0
      a.push = 0
      if (!(size > 0)) continue
      const v = dp / Math.max(1 / 240, Math.min(dt, IDLE)) / size
      a.dir = dp > 0 ? 1 : -1
      const st = stretchOn()
      const jl = jellyOn()
      const hit = endOf(axis) === a.dir
      // At an end the tail has nowhere to trail: it lets go. Ran into the end at speed: a small
      // bump against it, which the jelly settles.
      a.target = st > 0 && !hit ? scrollStretch(v, feel, st) : 0
      if (hit && jl > 0) a.s.v -= Math.min(3, Math.abs(v)) * feel.squash * 4 * Math.min(3, jl)
      if (st > 0 || jl > 0) wakeTicker(tick)
    }
  }

  /** Pushing `delta` px past an end along `axis` (wheel / touch): hold a squash against it. */
  const pushPast = (axis: Axis, delta: number): void => {
    const jl = jellyOn()
    if (!(jl > 0) || delta === 0) return
    const end = endOf(axis)
    const dir = delta > 0 ? 1 : -1
    if (end === 0 || end !== dir) return
    const a = axes[axis]
    const size = sizeOf(axis)
    if (!(size > 0)) return
    if (a.dir !== dir) a.push = 0
    a.dir = dir
    a.idle = 0
    a.push += Math.abs(delta) / size
    a.target = scrollSquash(a.push, feel, jl)
    wakeTicker(tick)
  }

  const onWheel = (e: WheelEvent): void => {
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? sizeOf('y') : 1
    let dy = e.deltaY * scale
    let dx = e.deltaX * scale
    if (e.shiftKey && dx === 0) {
      dx = dy
      dy = 0
    }
    if (dy) pushPast('y', dy)
    if (dx) pushPast('x', dx)
  }

  let touch: { x: number; y: number } | null = null
  const onTouchStart = (e: TouchEvent): void => {
    const p = e.touches[0]
    touch = p ? { x: p.clientX, y: p.clientY } : null
  }
  const onTouchMove = (e: TouchEvent): void => {
    const p = e.touches[0]
    if (!p || !touch) return
    // The finger drags the content: moving up scrolls down.
    const dy = touch.y - p.clientY
    const dx = touch.x - p.clientX
    touch = { x: p.clientX, y: p.clientY }
    if (dy) pushPast('y', dy)
    if (dx) pushPast('x', dx)
  }
  const onTouchEnd = (): void => {
    touch = null
  }

  const passive = { passive: true } as const
  viewport.addEventListener('scroll', onScroll, passive)
  viewport.addEventListener('wheel', onWheel, passive)
  viewport.addEventListener('touchstart', onTouchStart, passive)
  viewport.addEventListener('touchmove', onTouchMove, passive)
  viewport.addEventListener('touchend', onTouchEnd, passive)
  viewport.addEventListener('touchcancel', onTouchEnd, passive)

  const reset = (): void => {
    removeTicker(tick)
    for (const a of Object.values(axes)) {
      a.s.x = a.s.v = a.target = a.push = 0
    }
    if (painted) paint()
  }

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) reset()
  })

  return {
    update(next) {
      options = { ...next }
      reduced = readReduced()
      resolveFeel()
      if (stretchOn() <= 0 && jellyOn() <= 0) reset()
    },
    get stretch() {
      return { x: axes.x.s.x, y: axes.y.s.x }
    },
    get running() {
      return axes.x.target !== 0 || axes.y.target !== 0 || painted
    },
    destroy() {
      reset()
      stopWatch()
      viewport.removeEventListener('scroll', onScroll)
      viewport.removeEventListener('wheel', onWheel)
      viewport.removeEventListener('touchstart', onTouchStart)
      viewport.removeEventListener('touchmove', onTouchMove)
      viewport.removeEventListener('touchend', onTouchEnd)
      viewport.removeEventListener('touchcancel', onTouchEnd)
      root.removeAttribute(SCROLL_ROOT_ATTR)
      for (const el of Array.from(root.querySelectorAll<HTMLElement>(`[${SCROLL_THUMB_ATTR}]`))) {
        if (el.closest(`[${SCROLL_ROOT_ATTR}]`)) continue
        el.style.transform = ''
        el.style.transformOrigin = ''
      }
    },
  }
}

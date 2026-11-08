// Empty-state puddle (GoopEmptyMedia): the media (an icon tile, an avatar, an icon) sits in a
// low, wide goo puddle of the same muted tone, whose middle rises in a soft mound to meet the
// media so the two read as one body (smooth shoulders, never a knob). The puddle breathes very
// slowly, about 1px, and is static under reduced motion. Nothing drips.
//
// Cheap on purpose: one aria-hidden <svg> with one path behind the media (z-index -1 in the
// media's own stacking context). The svg box is exactly the media's box; the puddle is painted
// past it (overflow: visible), which is ink overflow, so it never grows the page's scroll size
// or shifts layout. The breathing is a CSS animation on that svg (goop.css,
// `goop-puddle-breathe`), driven by CSS vars core writes: no frame loop at all.
// No DOM access until `attachEmptyPuddle` is called (SSR-safe); `emptyPuddlePath` is pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { readPreset } from './tuning'

/** Individually toggleable empty-state effects (boolean or multiplier). `puddle`: the goo
 *  puddle under the media (a number scales its depth). `breathe`: its slow ~1px breathing. */
export const EMPTY_EFFECTS = ['puddle', 'breathe'] as const
export type EmptyEffect = (typeof EMPTY_EFFECTS)[number]

export interface EmptyFeel {
  /** Puddle width as a multiple of the media's width (plus `reach` px each side). */
  spread: number
  reach: number
  /** Puddle depth (px) at its middle, before the mound. */
  depth: number
  /** How high the middle mound climbs the media (fraction of its height). */
  mound: number
  /** Edge lumpiness (fraction of the depth): low, wide lobes. */
  lumps: number
  /** Breathing: amplitude (px) and period (s). */
  breath: number
  period: number
}

export const EMPTY_FEEL: Readonly<Record<GoopPreset, Readonly<EmptyFeel>>> = Object.freeze({
  subtle: Object.freeze({ spread: 1.6, reach: 4, depth: 8, mound: 0.4, lumps: 0.08, breath: 0.7, period: 7 }),
  playful: Object.freeze({ spread: 1.8, reach: 6, depth: 10, mound: 0.45, lumps: 0.14, breath: 1, period: 6 }),
  wild: Object.freeze({ spread: 2.1, reach: 8, depth: 13, mound: 0.5, lumps: 0.22, breath: 1.6, period: 5 }),
})

export interface EmptyPuddleOptions {
  /** The puddle. `false`: off; `true`: the preset's; a number scales its depth. */
  puddle?: boolean | number
  /** The breathing. `false`: still; a number scales its amplitude. */
  breathe?: boolean | number
  /** Animation speed multiplier (a faster breath). */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps it still; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
  /** Seed for the puddle's lobes (default: random per attach). */
  seed?: number
}

export interface EmptyPuddleHandle {
  /** Re-measure the media and redraw (core also does this on resize). */
  refresh(): void
  update(options: EmptyPuddleOptions): void
  /** The aria-hidden puddle svg. */
  readonly element: SVGSVGElement
  destroy(): void
}

export interface EmptyPuddleShape {
  /** Media box (px). The path is in its coordinates (0,0 = its top-left). */
  width: number
  height: number
  feel?: EmptyFeel
  /** Depth multiplier. */
  strength?: number
  seed?: number
}

const bump = (t: number): number => (t <= -1 || t >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t)))
const fmt = (v: number): string => (Math.round(v * 100) / 100).toString()

/** The puddle's extent around the media (px past each side / below / above its box). */
export function emptyPuddleBounds(width: number, height: number, feel: EmptyFeel = EMPTY_FEEL.playful, strength = 1) {
  const half = (width * feel.spread) / 2 + feel.reach
  const depth = feel.depth * strength
  return { left: half - width / 2, right: half - width / 2, below: depth * 0.6 * (1 + feel.lumps), above: 0, half, depth }
}

/**
 * SVG path of the puddle under a `width` x `height` media box, in the media's coordinates.
 * A flat, wide pool centred under the media's bottom edge whose middle rises in a raised
 * cosine mound to meet the media's sides (smooth shoulders), with a few low lobes along its
 * rim. Pure.
 */
export function emptyPuddlePath(shape: EmptyPuddleShape): string {
  const feel = shape.feel ?? EMPTY_FEEL.playful
  const s = shape.strength ?? 1
  if (!(s > 0) || !(shape.width > 0) || !(shape.height > 0)) return ''
  const { width: w, height: h } = shape
  const { half, depth } = emptyPuddleBounds(w, h, feel, s)
  const cx = w / 2
  // The pool's centre line sits a little above the media's bottom edge.
  const cy = h - depth * 0.15
  const moundH = h * feel.mound
  const moundW = (w / 2 + feel.reach) / half
  const seed = shape.seed ?? 1
  // Low, wide lobes: two slow harmonics with seeded phases.
  const p1 = (seed * 2.399) % (2 * Math.PI)
  const p2 = (seed * 4.11) % (2 * Math.PI)
  const lobe = (u: number): number => 1 + feel.lumps * (0.6 * Math.sin(3 * Math.PI * u + p1) + 0.4 * Math.sin(5 * Math.PI * u + p2))
  const steps = 48
  const top: string[] = []
  const bottom: string[] = []
  for (let k = 0; k <= steps; k++) {
    const u = -1 + (2 * k) / steps
    const env = Math.sqrt(Math.max(0, 1 - u * u))
    const x = cx + u * half
    const up = cy - depth * 0.4 * env * lobe(u + 0.37) - moundH * bump(u / moundW) * Math.min(1, env * 2)
    const down = cy + depth * 0.6 * env * lobe(u)
    top.push(`${fmt(x)} ${fmt(up)}`)
    bottom.push(`${fmt(x)} ${fmt(down)}`)
  }
  bottom.reverse()
  return `M${top.join('L')}L${bottom.join('L')}Z`
}

/** CSS vars of the breathing (empty when still): `--goop-puddle-sx`, `--goop-puddle-sy`
 *  (peak scales, ~`breath` px at the rim) and `--goop-puddle-period`. */
export function emptyPuddleBreath(width: number, height: number, options: EmptyPuddleOptions = {}, feel: EmptyFeel = EMPTY_FEEL.playful): Record<string, string> {
  const b = effectStrength(options.breathe)
  if (!(b > 0) || !(width > 0)) return {}
  const { half, depth } = emptyPuddleBounds(width, height, feel, effectStrength(options.puddle))
  const amp = feel.breath * b
  const speed = options.speed && options.speed > 0 ? options.speed : 1
  return {
    '--goop-puddle-sx': (Math.round((1 + amp / half) * 10000) / 10000).toString(),
    '--goop-puddle-sy': (Math.round((1 + amp / Math.max(4, depth + height * feel.mound)) * 10000) / 10000).toString(),
    '--goop-puddle-period': `${Math.round((feel.period / speed) * 100) / 100}s`,
  }
}

const SVG_NS = 'http://www.w3.org/2000/svg'
/** `data-goop` value of the puddle svg core inserts into the media. */
export const EMPTY_PUDDLE_PART = 'empty-puddle'

/** Attach the goo puddle to an empty state's media element (shadcn's EmptyMedia). */
export function attachEmptyPuddle(media: HTMLElement, initial: EmptyPuddleOptions = {}): EmptyPuddleHandle {
  const doc = media.ownerDocument
  const win = doc.defaultView
  let options: EmptyPuddleOptions = { ...initial }
  const seed = options.seed ?? Math.floor(Math.random() * 1000) + 1

  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  svg.setAttribute('data-goop', EMPTY_PUDDLE_PART)
  svg.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:-1;'
  const path = doc.createElementNS(SVG_NS, 'path')
  svg.append(path)
  media.prepend(svg)

  const prevPosition = media.style.position
  const prevIsolation = media.style.isolation
  if (win?.getComputedStyle(media).position === 'static') media.style.position = 'relative'
  media.style.isolation = 'isolate'

  const still = (): boolean => options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  const VARS = ['--goop-puddle-sx', '--goop-puddle-sy', '--goop-puddle-period']

  const draw = (): void => {
    const w = media.offsetWidth
    const h = media.offsetHeight
    const feel = EMPTY_FEEL[readPreset(media, options.preset)] ?? EMPTY_FEEL[GOOP_DEFAULT_PRESET]
    const strength = effectStrength(options.puddle)
    const d = emptyPuddlePath({ width: w, height: h, feel, strength, seed })
    path.setAttribute('d', d)
    svg.style.display = d ? '' : 'none'
    // Breathing about the pool's centre under the media.
    svg.style.transformOrigin = `50% ${fmt(h)}px`
    for (const v of VARS) svg.style.removeProperty(v)
    const vars = still() ? {} : emptyPuddleBreath(w, h, options, feel)
    for (const [k, v] of Object.entries(vars)) svg.style.setProperty(k, v)
    if (Object.keys(vars).length) svg.setAttribute('data-goop-breathe', '')
    else svg.removeAttribute('data-goop-breathe')
  }
  draw()

  const ro = win?.ResizeObserver ? new win.ResizeObserver(() => draw()) : null
  ro?.observe(media)
  const stopWatch = watchReducedMotion(doc, draw)

  return {
    refresh: draw,
    update(next) {
      options = { ...next }
      draw()
    },
    get element() {
      return svg
    },
    destroy() {
      ro?.disconnect()
      stopWatch()
      svg.remove()
      media.style.position = prevPosition
      media.style.isolation = prevIsolation
    },
  }
}

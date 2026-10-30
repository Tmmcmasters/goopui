// Goo accordion / collapsible: opening pours the content out of the trigger like thick liquid,
// closing sucks it back up.
//
// One aria-hidden goo layer on the host (an accordion item, or a collapsible root). Its body
// is a goo rectangle (a transformed copy of the host box), so an open item reads as a soft goo
// card behind the real, unfiltered trigger and content. Circles add the source blob (a goo
// blob behind the chevron / trigger) and drips. Each frame is a pure function of the seconds
// since the toggle (`accordionPose`), so reduced motion, first paint and every frame agree.
//
//   open:  the source blob swells and floods the head row (trigger) with goo; drips grow out
//          of the row's bottom edge and run down ahead of the front; the front fills to the
//          content height on an under-damped spring (jelly overshoot + wobble, soft-capped in
//          px), and the drips merge into it.
//   close: the content is sucked back up: the front rises (accelerating) while drips hang off
//          it, stretched, and get pulled up last; then the row drains back into the source
//          blob, which swells as it receives the goo and sloshes.
//   flow:  in an accordion, when one item closes as another opens (`flow: 'up' | 'down'`, the
//          way the liquid travels), the closing item drains toward the opening one (its goo
//          slides out of that edge, dropping a few drops) and the opening one fills from the
//          edge facing it, after a short handoff delay. Liquid moving between them.
//
// The real content's height animation is CSS (reka's `--reka-accordion-content-height` /
// `--reka-collapsible-content-height` keyframes in @goopui/vue's goop.css). Core publishes its
// timing on the host as `--goop-accordion-open`, `--goop-accordion-delay` and
// `--goop-accordion-close` so the content reveal follows the goo, and marks the host
// `data-goop-still` under reduced motion (no CSS animation).
//
// Host parts (found by attribute, so content can mount/unmount freely):
//   [data-goop-accordion-content]  the collapsible content (its top is where the fill starts)
//   [data-goop-accordion-source]   the chevron / trigger the goo comes out of (optional)
// Coordinates are the host's padding box. No DOM access until `attachAccordion` (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { createGooToggle, type GooToggleRunner } from './goo-toggle'
import { clamp01, decayWobble, noCircle, smooth01, type GooCircle } from './liquid'
import type { GoopBodyTransform } from './renderer'
import type { GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** Which way the liquid travels: out of / into the source blob, or between accordion items. */
export type AccordionFlow = 'source' | 'up' | 'down'

/** Most drips (lead drips on open, hanging / falling drips on close). */
export const ACCORDION_MAX_DRIPS = 5
/** Neck circles per drip. */
export const ACCORDION_DRIP_NECKS = 2
/** Every circle drawn: the source blob, then each drip (drop + necks). */
export const ACCORDION_CIRCLES = 1 + ACCORDION_MAX_DRIPS * (1 + ACCORDION_DRIP_NECKS)
/** CSS var the goo paints with (set it on the host or an ancestor). */
export const ACCORDION_COLOR_VAR = '--goop-accordion-fill'
/** Host attributes of the parts core measures. */
export const ACCORDION_CONTENT_ATTR = 'data-goop-accordion-content'
export const ACCORDION_SOURCE_ATTR = 'data-goop-accordion-source'
/** Host attribute present under reduced motion (the CSS height animation is off). */
export const ACCORDION_STILL_ATTR = 'data-goop-still'
/** CSS vars core publishes on the host for the content's height animation. */
export const ACCORDION_TIMING_VARS = Object.freeze({
  open: '--goop-accordion-open',
  delay: '--goop-accordion-delay',
  close: '--goop-accordion-close',
})

/** Individually toggleable effects (boolean or multiplier; `fill` and `source` are on/off). */
export const ACCORDION_EFFECTS = ['fill', 'drips', 'jelly', 'slosh', 'source', 'handoff'] as const
export type AccordionEffect = (typeof ACCORDION_EFFECTS)[number]
export type AccordionEffects = Record<AccordionEffect, number>
export const ACCORDION_ALL_EFFECTS: Readonly<AccordionEffects> = Object.freeze({
  fill: 1,
  drips: 1,
  jelly: 1,
  slosh: 1,
  source: 1,
  handoff: 1,
})

export interface AccordionFeel {
  /** Seconds for the source blob to flood the head row. */
  flood: number
  /** Seconds from the toggle until the content front starts to fill (drips lead meanwhile). */
  lead: number
  /** Seconds the front takes to (nearly) reach the content height. */
  fill: number
  /** Damping ratio of the fill spring at jelly 1 (< 1: overshoot and wobble). */
  damping: number
  /** Largest jelly overshoot, px (soft cap; also at most a quarter of the content). */
  overshoot: number
  /** Seconds the suck-up takes on close. */
  close: number
  /** Seconds the head row takes to drain into the source after the suck-up. */
  drain: number
  /** Close slosh strength (the source blob's wobble). */
  slosh: number
  /** Seconds the slosh takes to settle. */
  sloshSettle: number
  /** Drips at strength 1 (1..ACCORDION_MAX_DRIPS). */
  drips: number
  /** Drip radius, px. */
  dripSize: number
  /** How far drips run ahead of the front, px. */
  dripLead: number
  /** Seconds the opening item waits for the closing one's goo (accordion handoff). */
  handoff: number
  /** Goo blur, px. */
  softness: number
}

export const ACCORDION_FEEL: Readonly<Record<GoopPreset, Readonly<AccordionFeel>>> = Object.freeze({
  subtle: Object.freeze({
    flood: 0.12, lead: 0.12, fill: 0.34, damping: 0.7, overshoot: 6, close: 0.26, drain: 0.12,
    slosh: 0.6, sloshSettle: 0.35, drips: 2, dripSize: 4.5, dripLead: 14, handoff: 0.08, softness: 4,
  }),
  playful: Object.freeze({
    flood: 0.14, lead: 0.17, fill: 0.42, damping: 0.42, overshoot: 12, close: 0.32, drain: 0.14,
    slosh: 1, sloshSettle: 0.5, drips: 3, dripSize: 6, dripLead: 24, handoff: 0.12, softness: 5,
  }),
  wild: Object.freeze({
    flood: 0.16, lead: 0.22, fill: 0.5, damping: 0.3, overshoot: 20, close: 0.38, drain: 0.16,
    slosh: 1.4, sloshSettle: 0.7, drips: 5, dripSize: 7.5, dripLead: 34, handoff: 0.16, softness: 6,
  }),
})

/** Drip layout: x (fraction of the width), size, delay (s), in priority order. Varied on purpose. */
const DRIPS = [
  { x: 0.24, size: 1, delay: 0 },
  { x: 0.61, size: 0.72, delay: 0.035 },
  { x: 0.43, size: 1.18, delay: 0.06 },
  { x: 0.82, size: 0.58, delay: 0.02 },
  { x: 0.09, size: 0.86, delay: 0.05 },
] as const

export interface AccordionSource {
  /** Center and radius of the source blob, host px. */
  x: number
  y: number
  r: number
}

export interface AccordionGeometry {
  /** Host padding-box width and current height, px. */
  width: number
  height: number
  /** Where the content starts (the head row's bottom), px from the host top. */
  head: number
  /** The content's full open height, px. */
  content: number
  /** The source blob (chevron / trigger), or null to use the row's right end. */
  source: AccordionSource | null
}

export interface AccordionPose {
  /** ACCORDION_CIRCLES circles: source blob, then drop + necks per drip. */
  circles: GooCircle[]
  /** The goo card (a transformed copy of the host box), or null when empty. */
  body: GoopBodyTransform | null
  /** The card's rectangle, host px (null when empty). */
  rect: { l: number; r: number; a: number; b: number } | null
  /** Always false (the real content is never hidden by core). */
  pending: boolean
}

const ZETA_FLOOR = 0.12
/** Natural frequency so the critically damped front is ~95% there after `fill` seconds. */
const omegaOf = (fill: number): number => 4.74 / Math.max(0.05, fill)
const zetaOf = (feel: AccordionFeel, jelly: number): number =>
  jelly > 0 ? Math.max(ZETA_FLOOR, 1 - (1 - feel.damping) * Math.min(1.6, jelly)) : 1

/** Fill progress `s` seconds after the front starts (under-damped spring step response). */
export function accordionFill(s: number, fill: number, zeta: number): number {
  if (!(s > 0)) return 0
  const w = omegaOf(fill)
  if (zeta >= 1) return 1 - (1 + w * s) * Math.exp(-w * s)
  const wd = w * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w * s) * (Math.cos(wd * s) + ((zeta * w) / wd) * Math.sin(wd * s))
}

/** Seconds until the fill spring is within 1% of rest. */
const fillSettle = (fill: number, zeta: number): number =>
  zeta >= 1 ? 6.64 / omegaOf(fill) : 4.6 / (zeta * omegaOf(fill))

const dripCount = (feel: AccordionFeel, effects: AccordionEffects): number =>
  effects.drips > 0 ? Math.max(1, Math.min(ACCORDION_MAX_DRIPS, Math.round(feel.drips * Math.min(1.7, effects.drips)))) : 0

/** Delay before an opening item starts (handoff from a closing neighbour). */
export function accordionDelay(open: boolean, flow: AccordionFlow, feel: AccordionFeel, effects: AccordionEffects): number {
  return open && flow !== 'source' && effects.handoff > 0 ? feel.handoff * Math.min(2, effects.handoff) : 0
}

/** Seconds a toggle into `open` takes to settle (the end of the animation). */
export function accordionToggleEnd(
  open: boolean,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
  flow: AccordionFlow = 'source',
): number {
  if (open) {
    const z = zetaOf(feel, effects.jelly)
    return accordionDelay(true, flow, feel, effects) + feel.lead + Math.max(fillSettle(feel.fill, z), feel.fill + 0.25)
  }
  if (flow === 'down') return feel.close + feel.drain + 0.45 + (effects.slosh > 0 ? 0.2 : 0)
  return feel.close + feel.drain * 0.7 + (effects.slosh > 0 || effects.source <= 0 ? feel.sloshSettle : feel.drain * 0.3)
}

/** The source blob, or a stand-in at the head row's right end. */
const sourceOf = (g: AccordionGeometry, head: number): AccordionSource =>
  g.source ?? { x: Math.max(0, g.width - 20), y: head / 2, r: Math.min(12, head / 2) }

const bodyOf = (
  g: AccordionGeometry,
  l: number,
  r: number,
  a: number,
  b: number,
): { body: GoopBodyTransform | null; rect: AccordionPose['rect'] } => {
  const W = Math.max(1, g.width)
  const H = Math.max(1, g.height)
  if (!(r - l > 0.5) || !(b - a > 0.5)) return { body: null, rect: null }
  return {
    body: { tx: (l + r) / 2 - W / 2, ty: (a + b) / 2 - H / 2, skew: 0, sx: (r - l) / W, sy: (b - a) / H },
    rect: { l, r, a, b },
  }
}

/**
 * The item `time` seconds into a toggle from `from` to `to` (open = true). Pure. Past
 * `accordionToggleEnd` (or with from === to) it is the resting pose for `to`.
 */
export function accordionPose(
  time: number,
  from: boolean,
  to: boolean,
  g: AccordionGeometry,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
  flow: AccordionFlow = 'source',
): AccordionPose {
  const W = Math.max(1, g.width)
  const flowOn: AccordionFlow = effects.handoff > 0 ? flow : 'source'
  const end = accordionToggleEnd(to, feel, effects, flowOn)
  const t = Math.max(0, Math.min(end, Number.isFinite(time) ? time : end))
  const done = from === to || t >= end
  const head = Math.max(0, Math.min(g.head, g.height))
  const H = Math.max(0, g.content)
  const src = sourceOf(g, head)
  const fillOn = effects.fill > 0
  const sourceOn = effects.source > 0
  const n = dripCount(feel, effects)
  const dripScale = Math.sqrt(Math.max(0, Math.min(2, effects.drips)))

  let blob: GooCircle = sourceOn ? { x: src.x, y: src.y, r: src.r, sx: 1, sy: 1 } : noCircle(src.x, src.y)
  const drips: GooCircle[] = Array.from({ length: ACCORDION_MAX_DRIPS * (1 + ACCORDION_DRIP_NECKS) }, () => noCircle(src.x, head))
  const setDrip = (i: number, drop: GooCircle, anchorY: number, neckR: number): void => {
    const k = i * (1 + ACCORDION_DRIP_NECKS)
    drips[k] = drop
    for (let j = 1; j <= ACCORDION_DRIP_NECKS; j++) {
      const f = j / (ACCORDION_DRIP_NECKS + 1)
      drips[k + j] = neckR > 0.2 ? { x: drop.x, y: anchorY + (drop.y - anchorY) * f, r: neckR, sx: 1, sy: 1 } : noCircle(drop.x, anchorY)
    }
  }
  const out = (l: number, r: number, a: number, b: number): AccordionPose => {
    const { body, rect } = fillOn ? bodyOf(g, l, r, a, b) : { body: null, rect: null }
    return { circles: [blob, ...drips], body, rect, pending: false }
  }

  if (done) return to ? out(0, W, 0, head + H) : out(0, 0, 0, 0)

  if (to) {
    // ---- open ----
    const tau = t - accordionDelay(true, flowOn, feel, effects)
    if (tau <= 0) return out(0, 0, 0, 0)
    // The source swells as the goo wells up out of it.
    if (sourceOn) {
      const s = Math.sin(Math.PI * clamp01(tau / (feel.flood * 1.6)))
      blob = { ...blob, r: src.r * (1 + 0.32 * s), sx: 1 + 0.08 * s, sy: 1 - 0.06 * s }
    }
    // Head row flood.
    const u = smooth01(tau / feel.flood)
    const uv = smooth01(tau / (feel.flood * 0.7))
    let l = 0
    let r = W
    let a = 0
    let b = head
    if (flowOn === 'down') b = head * u
    else if (flowOn === 'up') a = head * (1 - u)
    else {
      const r0 = src.r * 0.7
      l = Math.max(0, src.x - r0) * (1 - u)
      r = src.x + r0 + (W - src.x - r0) * u
      a = Math.max(0, src.y - r0) * (1 - uv)
      b = src.y + r0 + (head - src.y - r0) * uv
    }
    // Content front on a spring (overshoot soft-capped in px).
    const s = tau - feel.lead
    const x = accordionFill(s, feel.fill, zetaOf(feel, effects.jelly))
    const cap = Math.max(0.5, Math.min(feel.overshoot * Math.min(2, effects.jelly), H * 0.25))
    const front = head + (x <= 1 ? H * x : H + cap * Math.tanh(((x - 1) * H) / cap))
    if (s > 0) b = Math.max(b, front)
    // Lead drips: grow out of the row's bottom edge, run ahead of the front, merge into it.
    const progress = clamp01(H > 0 ? (front - head) / H : 1)
    for (let i = 0; i < n; i++) {
      const d = DRIPS[i]!
      const rd = feel.dripSize * d.size * dripScale
      const dx = W * d.x
      const born = feel.flood * 0.45 + d.delay
      const grow = smooth01((tau - born) / Math.max(0.05, feel.lead + 0.06 - born))
      if (grow <= 0) continue
      // Only where the flood has spread to.
      const inside = smooth01(Math.min(dx - l, r - dx) / Math.max(1, rd * 2))
      const fade = 1 - smooth01((s - feel.fill * 0.85) / 0.18)
      const k = grow * inside * fade
      if (k <= 0.01) continue
      const anchor = fillOn ? Math.max(head, s > 0 ? front : head) : head
      const hang = 2.2 * rd * grow
      const lead = fillOn
        ? feel.dripLead * d.size * Math.min(1.6, effects.drips) * grow * (1 - smooth01(progress / 0.98))
        : H * progress
      const y = anchor + rd * 0.3 + Math.max(hang * (1 - progress), lead)
      setDrip(i, { x: dx, y, r: rd * (0.45 + 0.55 * k), sx: 0.9, sy: 1.18 }, anchor, rd * 0.6 * k)
    }
    return out(l, r, a, b)
  }

  // ---- close ----
  if (flowOn === 'down') {
    // Drain toward the item below: the card slides down out of the bottom edge, which itself
    // rises as the content collapses; a few drops fall on into the next item.
    const T = feel.close + feel.drain
    const e = smooth01(t / T)
    const b0 = Math.min(head + H, Math.max(head, g.height))
    const a0 = b0 * e
    for (let i = 0; i < n; i++) {
      const d = DRIPS[i]!
      const rd = feel.dripSize * d.size * dripScale
      const age = t - (T * 0.45 + d.delay)
      if (age <= 0 || age >= 0.45) continue
      const k = 1 - smooth01(age / 0.45)
      setDrip(i, { x: W * d.x, y: b0 + rd + 0.5 * 1500 * age * age, r: rd * k, sx: 0.9, sy: 1.25 }, b0, rd * 0.5 * (1 - smooth01(age / 0.1)))
    }
    if (sourceOn && effects.slosh > 0) {
      const w = 0.5 * feel.slosh * Math.min(2, effects.slosh) * decayWobble(t - T * 0.6, 3.4, 4.5, 0.5)
      blob = { ...blob, r: src.r * (1 + 0.12 * w), sx: 1 + 0.2 * w, sy: 1 - 0.2 * w }
    }
    return out(0, W, a0, b0)
  }

  // Suck-up: the front rises, accelerating; drips hang off it and get pulled up last.
  const p = clamp01(t / feel.close)
  const e = p * p * (3 - 2 * p)
  let l = 0
  let r = W
  let a = 0
  let b = head + H * (1 - e)
  if (t < feel.close) {
    for (let i = 0; i < n; i++) {
      const d = DRIPS[i]!
      const rd = feel.dripSize * d.size * dripScale
      const sag = Math.sin(Math.PI * Math.min(1, p * 1.08))
      const len = (fillOn ? feel.dripLead * 0.8 : H * (1 - e)) * d.size * sag * Math.min(1.6, effects.drips)
      const k = 1 - smooth01((p - 0.75) / 0.25)
      if (k <= 0.01 || len < 0.5) continue
      const anchor = fillOn ? b : head
      setDrip(i, { x: W * d.x, y: anchor + rd * 0.3 + len, r: rd * (0.6 + 0.4 * k), sx: 0.86, sy: 1.3 }, anchor, rd * 0.55 * k)
    }
  } else {
    // The head row drains back into the source (or out of the top edge, toward the item above).
    const q = smooth01((t - feel.close) / feel.drain)
    if (flowOn === 'up') b = head * (1 - q)
    else {
      const r0 = src.r * 0.7
      l = Math.max(0, src.x - r0) * q
      r = W - (W - src.x - r0) * q
      a = Math.max(0, src.y - r0) * q
      b = head - (head - src.y - r0) * q
      if (q >= 0.999) r = l
    }
  }
  // The source receives the goo (swells) and sloshes. Without a resting source blob the drained
  // goo still gathers there for the slosh, then shrinks away.
  if (flowOn !== 'up' || sourceOn) {
    const q = clamp01((t - feel.close) / feel.drain)
    const swell = flowOn === 'up' ? 0 : 0.3 * Math.sin(Math.PI * q)
    const age = t - feel.close - feel.drain * 0.7
    const w = effects.slosh > 0 ? feel.slosh * Math.min(2, effects.slosh) * decayWobble(age, 3.6, 4.2, feel.sloshSettle) : 0
    const base = sourceOn ? src.r : flowOn === 'up' ? 0 : src.r * 0.8 * smooth01(q / 0.6) * (1 - smooth01(age / feel.sloshSettle))
    if (base > 0.05) blob = { x: src.x, y: src.y, r: base * (1 + swell + 0.1 * w), sx: 1 + 0.24 * w, sy: 1 - 0.24 * w }
  }
  return out(l, r, a, b)
}

/** The resting pose (reduced motion, first paint, end of every toggle). */
export function accordionStaticPose(
  open: boolean,
  g: AccordionGeometry,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
): AccordionPose {
  return accordionPose(0, open, open, g, feel, effects)
}

/** Goo filter parameters. */
export function accordionGooParams(feel: AccordionFeel = ACCORDION_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

/** Room the goo needs around the host (drips below, overshoot, falling handoff drops). */
export function accordionPadding(feel: AccordionFeel = ACCORDION_FEEL.playful): { side: number; bottom: number } {
  const blur = feel.softness * 3
  return {
    side: Math.ceil(blur + feel.dripSize * 2),
    bottom: Math.ceil(blur + feel.dripLead * 1.6 + feel.dripSize * 4 + feel.overshoot * 2 + 80),
  }
}

export interface AccordionOptions {
  /** Open state. Changes animate. */
  open?: boolean
  /** Where the liquid goes on this toggle: 'source' (default: out of / back into the source
   *  blob), or 'up' / 'down' (an accordion handoff: the way it travels between items). */
  flow?: AccordionFlow
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** The open content sits on a goo card that pours out of the trigger. Default true. */
  fill?: boolean | number
  /** Drips lead the fill on open and hang off it on close. Default true. */
  drips?: boolean | number
  /** Jelly overshoot + wobble when the fill lands. Default true. */
  jelly?: boolean | number
  /** The source blob sloshes after the goo is sucked back in. Default true. */
  slosh?: boolean | number
  /** A goo blob behind the chevron / trigger that the goo pours out of. Default true. */
  source?: boolean | number
  /** Accordion: liquid moves from the closing item into the opening one. Default true. */
  handoff?: boolean | number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface AccordionHandle {
  update(opts?: AccordionOptions): void
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The pose last drawn. */
  readonly pose: AccordionPose | null
  /** The geometry last measured. */
  readonly geometry: AccordionGeometry | null
  destroy(): void
}

const effectsOf = (o: AccordionOptions): AccordionEffects => ({
  fill: gooEffectValue(o.fill) > 0 ? 1 : 0,
  drips: gooEffectValue(o.drips),
  jelly: gooEffectValue(o.jelly),
  slosh: gooEffectValue(o.slosh),
  source: gooEffectValue(o.source) > 0 ? 1 : 0,
  handoff: gooEffectValue(o.handoff),
})

const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}

/** Is `el`'s nearest goo-accordion host `host` (nested accordions keep their own parts)? */
const ownPart = (host: HTMLElement, sel: string): HTMLElement | null => {
  for (const el of host.querySelectorAll<HTMLElement>(sel)) {
    if (el.parentElement?.closest('[data-goop-accordion]') === host || !host.hasAttribute('data-goop-accordion')) return el
  }
  return null
}

/** Attach goo to an accordion item or collapsible root `host`. */
export function attachAccordion(host: HTMLElement, options: AccordionOptions = {}): AccordionHandle {
  let opts: AccordionOptions = { ...options }
  let feel = ACCORDION_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let to = !!opts.open
  let from = to
  let flow: AccordionFlow = opts.flow ?? 'source'
  let lastContent = 0
  let geom: AccordionGeometry | null = null
  let last: AccordionPose | null = null

  const measure = (): AccordionGeometry => {
    const hr = host.getBoundingClientRect()
    const ox = hr.left + host.clientLeft
    const oy = hr.top + host.clientTop
    const width = host.clientWidth || hr.width
    const height = host.clientHeight || hr.height
    const content = ownPart(host, `[${ACCORDION_CONTENT_ATTR}]`)
    let head = height
    if (content && !content.hidden) {
      const cr = content.getBoundingClientRect()
      head = cr.top - oy
      const cs = host.ownerDocument.defaultView?.getComputedStyle(content)
      const natural =
        content.scrollHeight ||
        px(cs?.getPropertyValue('--reka-accordion-content-height')) ||
        px(cs?.getPropertyValue('--reka-collapsible-content-height'))
      if (natural > 0) lastContent = natural
    }
    const src = ownPart(host, `[${ACCORDION_SOURCE_ATTR}]`)
    let source: AccordionSource | null = null
    if (src) {
      const sr = src.getBoundingClientRect()
      if (sr.width > 0 || sr.height > 0) {
        const big = Math.max(sr.width, sr.height)
        const small = Math.min(sr.width, sr.height)
        source = { x: sr.left - ox + sr.width / 2, y: sr.top - oy + sr.height / 2, r: Math.min(big / 2 + 4, small / 2 + 6) }
      }
    }
    return { width, height, head, content: lastContent, source }
  }

  const end = (): number => accordionToggleEnd(to, feel, effects, flow)

  const publishTiming = (reduced: boolean): void => {
    const k = 1 / Math.max(0.05, opts.speed ?? 1)
    const st = host.style
    st.setProperty(ACCORDION_TIMING_VARS.open, `${(feel.fill * 1.15 * k).toFixed(3)}s`)
    st.setProperty(ACCORDION_TIMING_VARS.delay, `${((accordionDelay(to, flow, feel, effects) + feel.lead) * k).toFixed(3)}s`)
    st.setProperty(ACCORDION_TIMING_VARS.close, `${(feel.close * 0.9 * k).toFixed(3)}s`)
    host.toggleAttribute(ACCORDION_STILL_ATTR, reduced)
  }

  const runner: GooToggleRunner = createGooToggle(host, {
    color: `var(${ACCORDION_COLOR_VAR}, var(--muted, currentColor))`,
    part: 'accordion',
    circles: ACCORDION_CIRCLES,
    layout() {
      return { params: accordionGooParams(feel), padding: accordionPadding(feel) }
    },
    frame(t, reduced) {
      geom = measure()
      host.toggleAttribute(ACCORDION_STILL_ATTR, reduced)
      last = reduced ? accordionStaticPose(to, geom, feel, effects) : accordionPose(t, from, to, geom, feel, effects, flow)
      return last
    },
    end,
    duration: () => 1,
    speed: () => opts.speed ?? 1,
    renderer: () => opts.renderer,
    reducedMotion: () => opts.reducedMotion,
  })
  publishTiming(runner.reduced)

  return {
    update(next = {}) {
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = ACCORDION_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      const open = !!opts.open
      if ('open' in next && open !== to) {
        from = to
        to = open
        flow = opts.flow ?? 'source'
        publishTiming(runner.reduced)
        if (rebuild) runner.rebuild()
        runner.restart()
        return
      }
      publishTiming(runner.reduced)
      if (rebuild) runner.rebuild()
      else runner.refresh()
    },
    resize: () => runner.resize(),
    get running() {
      return runner.running
    },
    get reducedMotion() {
      return runner.reduced
    },
    get pose() {
      return last
    },
    get geometry() {
      return geom
    },
    destroy() {
      runner.destroy()
      for (const v of Object.values(ACCORDION_TIMING_VARS)) host.style.removeProperty(v)
      host.removeAttribute(ACCORDION_STILL_ATTR)
    },
  }
}

/** Which way liquid travels from the closing item `from` to the opening item `to`. */
export function accordionFlowBetween(from: Element, to: Element): AccordionFlow {
  // DOCUMENT_POSITION_FOLLOWING = 4
  return from.compareDocumentPosition(to) & 4 ? 'down' : 'up'
}

// Goo accordion / collapsible: "splashy pour". Opening pours the content down fast as liquid,
// it lands with a jelly overshoot and a small splash flies off the bottom edge; closing sucks
// it back up into the trigger, which sloshes. At rest there is NO goo at all (plain shadcn
// layout and look) and no ticker runs.
//
// One aria-hidden goo layer on the host (an accordion item, or a collapsible root). Its body is
// a goo rectangle (a transformed copy of the host box): the slug of liquid in flight. Circles
// add the source blob (at the chevron / trigger, only while the goo is sucked back into it),
// the pour's leading fingers, and the splash drops. Each frame is a pure function of the
// seconds since the toggle (`accordionPose`), so reduced motion, first paint and every frame
// agree.
//
//   open:  the goo wells out of the chevron, spreads across the row and pours down: the slug's
//          front runs ahead in uneven fingers on an under-damped spring (the content's real
//          height follows the SAME curve through a CSS `linear()` easing, so the jelly overshoot
//          is real). Its tail catches up, so on landing it is a puddle along the bottom edge
//          that squashes, wobbles with the jelly, throws a splash of globs, drops and specks
//          off the bottom edge (they fall and fade, like the bloom splash) and thins away.
//   close: the content is sucked up (accelerating): a band of goo rides the collapsing bottom
//          edge, fingers trailing with its speed, gathers into the chevron as a blob that
//          swells, sloshes and shrinks away.
//   handoff: in an accordion, when one item closes as another opens, the opening one waits a
//          beat so the suck-up reads first.
//
// The content's height animation is CSS (reka's `--reka-accordion-content-height` /
// `--reka-collapsible-content-height` keyframes in @goopui/vue's goop.css). Core publishes the
// timing on the host (ACCORDION_TIMING_VARS: durations, delay and `linear()` easings) and marks
// the host `data-goop-still` under reduced motion (plain shadcn height animation, no goo).
//
// Host parts (found by attribute, so content can mount/unmount freely):
//   [data-goop-accordion-content]  the collapsible content (its top is where the pour starts)
//   [data-goop-accordion-source]   the chevron / trigger the goo comes out of (optional)
// Coordinates are the host's padding box. No DOM access until `attachAccordion` (SSR-safe).

import { GOOP_PHYSICS, type GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { createGooToggle, type GooToggleRunner } from './goo-toggle'
import { clamp01, decayWobble, noCircle, smooth01, type GooCircle } from './liquid'
import type { GoopBodyTransform } from './renderer'
import type { GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** Which way the liquid travels: out of / into the source blob, or between accordion items. */
export type AccordionFlow = 'source' | 'up' | 'down'

/** Fingers on the pour's leading edge (they also trail the suck-up). */
export const ACCORDION_FINGERS = 5
/** Most splash drops one landing throws. */
export const ACCORDION_MAX_DROPS = 24
/** Lead globs that neck out of the edge before they let go (one neck circle each). */
export const ACCORDION_NECKS = 4
/** Every circle drawn: the source blob, fingers, necks, then drops. */
export const ACCORDION_CIRCLES = 1 + ACCORDION_FINGERS + ACCORDION_NECKS + ACCORDION_MAX_DROPS
const FINGER_AT = 1
const NECK_AT = FINGER_AT + ACCORDION_FINGERS
const DROP_AT = NECK_AT + ACCORDION_NECKS
/** CSS var the goo paints with (set it on the host or an ancestor). */
export const ACCORDION_COLOR_VAR = '--goop-accordion-fill'
/** Host attributes of the parts core measures. */
export const ACCORDION_CONTENT_ATTR = 'data-goop-accordion-content'
export const ACCORDION_SOURCE_ATTR = 'data-goop-accordion-source'
/** Host attribute present under reduced motion (plain shadcn height animation). */
export const ACCORDION_STILL_ATTR = 'data-goop-still'
/** CSS vars core publishes on the host for the content's height animation. */
export const ACCORDION_TIMING_VARS = Object.freeze({
  open: '--goop-accordion-open',
  openEase: '--goop-accordion-open-ease',
  delay: '--goop-accordion-delay',
  close: '--goop-accordion-close',
  closeEase: '--goop-accordion-close-ease',
})

/** Individually toggleable effects (boolean or 0..2 strength; `pour` is on/off). */
export const ACCORDION_EFFECTS = ['pour', 'jelly', 'splash', 'slosh', 'handoff'] as const
export type AccordionEffect = (typeof ACCORDION_EFFECTS)[number]
export type AccordionEffects = Record<AccordionEffect, number>
export const ACCORDION_ALL_EFFECTS: Readonly<AccordionEffects> = Object.freeze({
  pour: 1,
  jelly: 1,
  splash: 1,
  slosh: 1,
  handoff: 1,
})

/** The splash amount knob (x the preset's drop count). */
export const ACCORDION_SPLASH_AMOUNT = Object.freeze({
  default: 1,
  min: 0,
  max: 3,
  step: 0.05,
  label: 'Splash amount',
  description: 'How many drops fly off the bottom edge on landing (x the preset).',
})
/** The splash amount: default when unset / not finite, clamped to its range. */
export const accordionSplashAmount = (v: number | undefined): number =>
  v === undefined || !Number.isFinite(v)
    ? ACCORDION_SPLASH_AMOUNT.default
    : Math.min(ACCORDION_SPLASH_AMOUNT.max, Math.max(ACCORDION_SPLASH_AMOUNT.min, v))

export interface AccordionFeel {
  /** Seconds the critically damped pour would take to (nearly) reach the content height. */
  pour: number
  /** Damping ratio of the pour spring at jelly 1 (< 1: overshoot and wobble). */
  damping: number
  /** Largest jelly overshoot, px (soft cap; also at most a quarter of the content). */
  overshoot: number
  /** How far the leading fingers run ahead of the front, px. */
  fingers: number
  /** Puddle thickness when the pour lands (and the suck-up band's half height), px. */
  puddle: number
  /** Seconds the puddle takes to thin away after landing. */
  drain: number
  /** Splash drops at strength 1, amount 1 (for a ~360px wide item). */
  splash: number
  /** Splash size unit, px (lead globs / mid drops / specks multiply it). */
  dropSize: number
  /** Splash launch speed, px/s. */
  launch: number
  /** Seconds the suck-up takes on close. */
  close: number
  /** Seconds the goo takes to gather into the source after the suck-up. */
  gather: number
  /** Close slosh strength (the source blob's wobble). */
  slosh: number
  /** Seconds the slosh takes to settle. */
  sloshSettle: number
  /** Seconds the opening item waits for the closing one (accordion handoff). */
  handoff: number
  /** Goo blur, px. */
  softness: number
}

export const ACCORDION_FEEL: Readonly<Record<GoopPreset, Readonly<AccordionFeel>>> = Object.freeze({
  subtle: Object.freeze({
    pour: 0.3, damping: 0.66, overshoot: 7, fingers: 10, puddle: 9, drain: 0.22, splash: 8, dropSize: 4.2, launch: 230,
    close: 0.22, gather: 0.1, slosh: 0.6, sloshSettle: 0.35, handoff: 0.06, softness: 4,
  }),
  playful: Object.freeze({
    pour: 0.27, damping: 0.4, overshoot: 14, fingers: 18, puddle: 13, drain: 0.26, splash: 16, dropSize: 5.2, launch: 340,
    close: 0.24, gather: 0.12, slosh: 1, sloshSettle: 0.5, handoff: 0.1, softness: 4.5,
  }),
  wild: Object.freeze({
    pour: 0.25, damping: 0.28, overshoot: 22, fingers: 26, puddle: 17, drain: 0.3, splash: 22, dropSize: 6.2, launch: 420,
    close: 0.26, gather: 0.14, slosh: 1.4, sloshSettle: 0.7, handoff: 0.14, softness: 6,
  }),
})

/** Splash flight (the bloom splash's model: drag-slowed launch, gravity, fade). */
export const ACCORDION_SPLASH = Object.freeze({
  /** Flight + fall + fade time per class: lead glob, mid drop, speck (s). */
  life: Object.freeze([0.5, 0.44, 0.34] as const),
  drag: 4.5,
  gravity: 1100,
  /** Shrink to nothing over the last fraction of the life. */
  fade: 0.55,
  /** Cone half-angle (rad) per class around straight down, plus the outward fan at the ends. */
  cone: Object.freeze([0.3, 0.6, 0.95] as const),
  fan: 1.15,
  /** Lead globs neck out of the edge this long before they let go (s). */
  swell: 0.07,
  /** Release spread (s): the splash goes off nearly at once. */
  spread: 0.05,
  /** Share of lead globs / mid drops (the rest are specks). */
  leads: 0.18,
  mids: 0.4,
  /** Smallest speck, px. Width (px) at drop-count scale 1, and the scale's bounds. */
  minPx: 4.6,
  widthRef: 360,
  widthScale: Object.freeze([0.6, 1.4] as const),
})

/** Finger layout along the edge: x (fraction of the width), size, lead, in priority order. */
const FINGERS = [
  { x: 0.14, size: 0.9, lead: 0.7 },
  { x: 0.35, size: 1.15, lead: 1 },
  { x: 0.55, size: 0.8, lead: 0.45 },
  { x: 0.73, size: 1.05, lead: 0.85 },
  { x: 0.9, size: 0.75, lead: 0.55 },
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
  /** ACCORDION_CIRCLES circles: source blob, fingers, necks, drops. */
  circles: GooCircle[]
  /** The slug of liquid (a transformed copy of the host box), or null when there is none. */
  body: GoopBodyTransform | null
  /** The slug's rectangle, host px (null when there is none). */
  rect: { l: number; r: number; a: number; b: number } | null
  /** Always false (the real content is never hidden by core). */
  pending: boolean
}

const ZETA_FLOOR = 0.12
/** Natural frequency so the critically damped front is ~95% there after `pour` seconds. */
const omegaOf = (pour: number): number => 4.74 / Math.max(0.05, pour)
const zetaOf = (feel: AccordionFeel, jelly: number): number =>
  jelly > 0 ? Math.max(ZETA_FLOOR, 1 - (1 - feel.damping) * Math.min(1.6, jelly)) : 1

/** Pour progress `s` seconds in (under-damped spring step response). */
export function accordionFill(s: number, pour: number, zeta: number): number {
  if (!(s > 0)) return 0
  const w = omegaOf(pour)
  if (zeta >= 1) return 1 - (1 + w * s) * Math.exp(-w * s)
  const wd = w * Math.sqrt(1 - zeta * zeta)
  return 1 - Math.exp(-zeta * w * s) * (Math.cos(wd * s) + ((zeta * w) / wd) * Math.sin(wd * s))
}

/** Seconds until the pour spring is within ~0.5% of rest. */
const fillSettle = (pour: number, zeta: number): number =>
  zeta >= 1 ? 7.4 / omegaOf(pour) : 5.3 / (zeta * omegaOf(pour))

const landCache = new Map<string, number>()
/** Seconds until the pour first lands (reaches ~the content height). */
export function accordionLand(feel: AccordionFeel = ACCORDION_FEEL.playful, effects: AccordionEffects = ACCORDION_ALL_EFFECTS): number {
  const z = zetaOf(feel, effects.jelly)
  const key = `${feel.pour}|${z}`
  const hit = landCache.get(key)
  if (hit !== undefined) return hit
  let s = 0
  while (s < 4 && accordionFill(s, feel.pour, z) < 0.985) s += 0.002
  landCache.set(key, s)
  return s
}

/** Delay before an opening item starts (handoff from a closing neighbour). */
export function accordionDelay(open: boolean, flow: AccordionFlow, feel: AccordionFeel, effects: AccordionEffects): number {
  return open && flow !== 'source' && effects.handoff > 0 ? feel.handoff * Math.min(2, effects.handoff) : 0
}

/** Seconds the content's CSS open animation takes (the pour spring, settled). */
export function accordionOpenDuration(feel: AccordionFeel = ACCORDION_FEEL.playful, effects: AccordionEffects = ACCORDION_ALL_EFFECTS): number {
  return fillSettle(feel.pour, zetaOf(feel, effects.jelly))
}

const SPLASH_END = ACCORDION_SPLASH.spread + ACCORDION_SPLASH.swell + Math.max(...ACCORDION_SPLASH.life) * 1.15

/** Seconds a toggle into `open` takes to settle (the end of the animation). */
export function accordionToggleEnd(
  open: boolean,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
  flow: AccordionFlow = 'source',
): number {
  if (open) {
    const land = accordionLand(feel, effects)
    return (
      accordionDelay(true, flow, feel, effects) +
      Math.max(accordionOpenDuration(feel, effects), land + feel.drain, effects.splash > 0 ? land + SPLASH_END : 0)
    )
  }
  return feel.close + feel.gather + (effects.slosh > 0 ? feel.sloshSettle : 0.12)
}

/** The source blob, or a stand-in at the head row's right end. */
const sourceOf = (g: AccordionGeometry, head: number): AccordionSource =>
  g.source ?? { x: Math.max(0, g.width - 20), y: head / 2, r: Math.max(4, Math.min(12, head / 2)) }

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

/** Deterministic 0..1 hash of (seed, a, b). */
const rand = (seed: number, a: number, b: number): number => {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}

/** Number of splash drops for an item this wide. */
export function accordionSplashCount(
  width: number,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  strength = 1,
  amount = 1,
): number {
  const S = ACCORDION_SPLASH
  if (!(strength > 0) || !(amount > 0) || !(width > 0)) return 0
  const k = Math.min(S.widthScale[1], Math.max(S.widthScale[0], width / S.widthRef))
  const n = Math.round(feel.splash * accordionSplashAmount(amount) * k * (0.6 + 0.4 * Math.min(2, strength)))
  return Math.max(1, Math.min(ACCORDION_MAX_DROPS, n))
}

/** The landing splash `sec` seconds after the pour lands, off the bottom edge at `y0`. */
function splash(
  out: GooCircle[],
  sec: number,
  W: number,
  y0: number,
  feel: AccordionFeel,
  strength: number,
  amount: number,
  seed: number,
): void {
  const S = ACCORDION_SPLASH
  const G = GOOP_PHYSICS
  const n = accordionSplashCount(W, feel, strength, amount)
  if (n === 0) return
  const sizes = [G.eruptLeadSize, G.eruptMidSize, G.eruptSpeckSize]
  const speeds = [G.eruptLeadSpeed / G.eruptMidSpeed, 1, G.eruptSpeckSpeed / G.eruptMidSpeed]
  const leads = Math.max(1, Math.min(ACCORDION_NECKS, Math.round(n * S.leads)))
  const mids = Math.round(n * S.mids)
  const order = Array.from({ length: n }, (_, i) => i).sort((p, q) => rand(seed, p, 7) - rand(seed, q, 7))
  const fling = 0.6 + 0.4 * Math.min(2, strength)
  for (let i = 0; i < n; i++) {
    const kind = i < leads ? 0 : i < leads + mids ? 1 : 2
    const rv = (k: number): number => rand(seed, i, k) * 2 - 1
    const f = Math.min(0.97, Math.max(0.03, (order[i]! + 0.5 + rv(3) * 0.4) / n))
    const r = Math.max(S.minPx, feel.dropSize * sizes[kind]! * (1 + rv(1) * 0.2))
    const release = Math.abs(rv(2)) * S.spread + (kind === 0 ? S.swell : 0)
    const tau = sec - release
    const lifeT = S.life[kind]! * (1 + rv(6) * 0.15)
    if (tau >= lifeT) continue
    const x0 = W * f
    // Straight down, fanned outward toward the ends, plus a per-class cone.
    const a = Math.PI / 2 - (f - 0.5) * 2 * S.fan + rv(5) * S.cone[kind]!
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    if (tau < 0) {
      // Lead globs swell out of the edge on a neck first.
      if (kind !== 0) continue
      const q = smooth01(1 + tau / S.swell)
      if (q <= 0) continue
      const head = r * (-0.5 + 1.3 * q)
      out[DROP_AT + i] = { x: x0 + ca * head, y: y0 + sa * head, r: r * (0.5 + 0.5 * q), sx: 1, sy: 1 }
      out[NECK_AT + i] = { x: x0 + ca * head * 0.45, y: y0 + sa * head * 0.45, r: r * 0.7, sx: 1, sy: 1 }
      continue
    }
    const speed = feel.launch * fling * speeds[kind]! * (1 + rv(4) * 0.3)
    const dist = (kind === 0 ? r * 0.8 : r * 0.2) + speed * ((1 - Math.exp(-S.drag * tau)) / S.drag)
    const life = tau / lifeT
    const grow = kind === 0 ? 1 : 0.4 + 0.6 * smooth01(tau / 0.04)
    const rr = r * grow * (1 - 0.12 * smooth01(life / 0.3)) * (1 - smooth01((life - (1 - S.fade)) / S.fade))
    // Stretch along the flight while it is fast.
    const st = 1 + 0.25 * (1 - smooth01(tau / 0.15))
    out[DROP_AT + i] = {
      x: x0 + ca * dist,
      y: y0 + sa * dist + 0.5 * S.gravity * tau * tau,
      r: life >= 0.995 ? 0 : rr,
      sx: 1 / st,
      sy: st,
    }
    if (kind === 0 && tau < 0.06) {
      const k = smooth01(tau / 0.06)
      out[NECK_AT + i] = { x: x0 + ca * r * 0.3, y: y0 + sa * r * 0.3, r: r * 0.45 * (1 - k), sx: 1, sy: 1 }
    }
  }
}

/**
 * The item `time` seconds into a toggle from `from` to `to` (open = true). Pure. Past
 * `accordionToggleEnd` (or with from === to) it is the resting pose: no goo at all.
 */
export function accordionPose(
  time: number,
  from: boolean,
  to: boolean,
  g: AccordionGeometry,
  feel: AccordionFeel = ACCORDION_FEEL.playful,
  effects: AccordionEffects = ACCORDION_ALL_EFFECTS,
  flow: AccordionFlow = 'source',
  splashAmount = 1,
  seed = 0,
): AccordionPose {
  const W = Math.max(1, g.width)
  const end = accordionToggleEnd(to, feel, effects, flow)
  const t = Math.max(0, Math.min(end, Number.isFinite(time) ? time : end))
  const done = from === to || t >= end
  const head = Math.max(0, Math.min(g.head, g.height))
  const H = Math.max(0, g.content)
  const src = sourceOf(g, head)
  const pourOn = effects.pour > 0
  const circles: GooCircle[] = Array.from({ length: ACCORDION_CIRCLES }, () => noCircle(src.x, src.y))
  const out = (l: number, r: number, a: number, b: number): AccordionPose => {
    const { body, rect } = pourOn ? bodyOf(g, l, r, a, b) : { body: null, rect: null }
    return { circles, body, rect, pending: false }
  }

  if (done) return out(0, 0, 0, 0)

  if (to) {
    // ---- open: pour, land, splash ----
    const tau = t - accordionDelay(true, flow, feel, effects)
    if (tau <= 0) return out(0, 0, 0, 0)
    const land = accordionLand(feel, effects)
    const jelly = Math.min(2, effects.jelly)
    const x = accordionFill(tau, feel.pour, zetaOf(feel, effects.jelly))
    const cap = Math.max(0.5, Math.min(feel.overshoot * Math.max(0.5, jelly), H * 0.25))
    const front = head + (x <= 1 ? H * x : H + cap * Math.tanh(((x - 1) * H) / cap))
    if (effects.splash > 0 && tau >= land - ACCORDION_SPLASH.swell) {
      splash(circles, tau - land, W, head + H, feel, effects.splash, splashAmount, seed)
    }
    if (!pourOn) return out(0, 0, 0, 0)
    // Wells out of the chevron and spreads across the row as it starts to fall.
    const u = smooth01(tau / 0.08)
    const l0 = Math.max(0, src.x - src.r) * (1 - u)
    const r0 = src.x + src.r + (W - src.x - src.r) * u
    const top = src.y + (head - src.y) * smooth01(tau / 0.12)
    const b = Math.max(front, src.y + src.r + (head - src.y - src.r) * u)
    // The tail catches up with the front; after landing only a puddle is left, which thins.
    const trail = head + (front - head) * smooth01((tau - land * 0.35) / Math.max(0.05, land))
    const puddle = feel.puddle * (tau < land ? 1 : 1 - smooth01((tau - land) / feel.drain))
    const a = Math.max(top, Math.min(trail, b - puddle))
    // The landing squashes the puddle sideways.
    const sq = tau > land ? 6 * Math.min(1, jelly + 0.3) * Math.sin(Math.PI * clamp01((tau - land) / 0.2)) : 0
    // Leading fingers: uneven, wavering, merging into the front as it lands.
    if (tau < land) {
      const merge = 1 - smooth01((x - 0.55) / 0.4)
      const rf = Math.min(14, Math.max(5, W * 0.04))
      for (let i = 0; i < ACCORDION_FINGERS; i++) {
        const fd = FINGERS[i]!
        const fx = l0 + (r0 - l0) * fd.x
        const rr = rf * fd.size * u * (0.5 + 0.5 * merge)
        if (rr < 0.5 || merge <= 0) continue
        const wav = 0.7 + 0.3 * Math.sin(tau * 24 + i * 1.9)
        const lead = feel.fingers * fd.lead * merge * wav * u
        circles[FINGER_AT + i] = { x: fx, y: b - rr * 0.7 + lead, r: rr, sx: 0.9, sy: 1.15 }
      }
    }
    return out(l0 - sq, r0 + sq, a, b)
  }

  // ---- close: suck up, gather into the source, slosh ----
  const p = clamp01(t / feel.close)
  const e = p * p
  let l = 0
  let r = W
  let a = 0
  let b = 0
  if (pourOn) {
    const band = feel.puddle * 2 * smooth01(t / 0.05)
    if (t < feel.close) {
      b = head + H * (1 - e)
      a = Math.max(src.y, b - band)
      // Fingers trail the band's bottom edge with its speed, then snap up.
      const v = (H * 2 * p) / Math.max(0.05, feel.close)
      const rf = Math.min(12, Math.max(4, W * 0.035))
      const k = 1 - smooth01((p - 0.8) / 0.2)
      for (let i = 0; i < ACCORDION_FINGERS; i++) {
        const fd = FINGERS[i]!
        const lag = Math.min(feel.fingers, v * 0.02 * fd.lead) * k
        if (lag < 0.5) continue
        circles[FINGER_AT + i] = { x: W * fd.x, y: b - rf * 0.7 + lag, r: rf * fd.size * (0.6 + 0.4 * k), sx: 0.9, sy: 1.2 }
      }
    } else {
      const q = smooth01((t - feel.close) / feel.gather)
      const a0 = Math.max(src.y, head - band)
      l = (src.x - src.r) * q
      r = W - (W - src.x - src.r) * q
      a = a0 + (src.y - src.r - a0) * q
      b = head + (src.y + src.r - head) * q
      if (q >= 0.999) r = l
    }
  }
  // The source receives the goo: swells, sloshes, then shrinks away.
  const arrive = smooth01((t - feel.close - feel.gather * 0.3) / (feel.gather * 0.7))
  const age = t - feel.close - feel.gather
  const sloshOn = effects.slosh > 0
  const settle = sloshOn ? feel.sloshSettle : 0.12
  const fade = 1 - smooth01((age - settle * 0.45) / (settle * 0.55))
  const base = src.r * arrive * fade
  if (base > 0.05) {
    const swell = 0.35 * Math.sin(Math.PI * clamp01((t - feel.close) / (feel.gather * 1.8)))
    const w = sloshOn ? feel.slosh * Math.min(2, effects.slosh) * decayWobble(age, 3.6, 4.2, settle) : 0
    circles[0] = { x: src.x, y: src.y, r: base * (1 + swell + 0.1 * w), sx: 1 + 0.24 * w, sy: 1 - 0.24 * w }
  }
  return out(l, r, a, b)
}

/** The resting pose (reduced motion, first paint, end of every toggle): no goo. */
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

/** Room the goo needs around the host (fingers, overshoot and the falling splash below). */
export function accordionPadding(feel: AccordionFeel = ACCORDION_FEEL.playful): { side: number; bottom: number } {
  const S = ACCORDION_SPLASH
  const blur = feel.softness * 3
  const life = Math.max(...S.life)
  const fall = (feel.launch * 1.6 * 1.3) / S.drag + 0.5 * S.gravity * life * life
  return {
    side: Math.ceil(blur + 16 + feel.launch * 0.5 / S.drag),
    bottom: Math.ceil(blur + Math.max(feel.fingers + feel.overshoot * 2, fall * 0.8) + 20),
  }
}

/** A CSS `linear()` easing sampled from `f` over 0..1 (f(0) = 0, f(1) = 1). */
export function accordionEasing(f: (p: number) => number, samples = 40): string {
  const n = Math.max(2, Math.round(samples))
  const v: string[] = []
  for (let i = 0; i <= n; i++) {
    const y = i === 0 ? 0 : i === n ? 1 : f(i / n)
    v.push(String(Math.round(y * 10000) / 10000))
  }
  return `linear(${v.join(', ')})`
}

export interface AccordionOptions {
  /** Open state. Changes animate. */
  open?: boolean
  /** Where the liquid goes on this toggle: 'source' (default), or 'up' / 'down' (an accordion
   *  handoff: another item is closing on that side, so this one waits a beat). */
  flow?: AccordionFlow
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** The content pours down as liquid on open and is sucked back up on close. Default true. */
  pour?: boolean | number
  /** Jelly overshoot + wobble when the pour lands (the content's height too). Default true. */
  jelly?: boolean | number
  /** A splash of drops flies off the bottom edge when the pour lands. Default true. */
  splash?: boolean | number
  /** Splash drop count, x the preset (0..3). Default 1. */
  splashAmount?: number
  /** The goo sloshes in the trigger after it is sucked back in. Default true. */
  slosh?: boolean | number
  /** Accordion: the opening item waits for the closing one. Default true. */
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
  pour: gooEffectValue(o.pour) > 0 ? 1 : 0,
  jelly: gooEffectValue(o.jelly),
  splash: gooEffectValue(o.splash),
  slosh: gooEffectValue(o.slosh),
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
  let seed = 0
  let lastContent = 0
  let geom: AccordionGeometry | null = null
  let last: AccordionPose | null = null

  const contentHeight = (): number => {
    const content = ownPart(host, `[${ACCORDION_CONTENT_ATTR}]`)
    if (content && !content.hidden) {
      const cs = host.ownerDocument.defaultView?.getComputedStyle(content)
      const natural =
        content.scrollHeight ||
        px(cs?.getPropertyValue('--reka-accordion-content-height')) ||
        px(cs?.getPropertyValue('--reka-collapsible-content-height'))
      if (natural > 0) lastContent = natural
    }
    return lastContent
  }

  const measure = (): AccordionGeometry => {
    const hr = host.getBoundingClientRect()
    const ox = hr.left + host.clientLeft
    const oy = hr.top + host.clientTop
    const width = host.clientWidth || hr.width
    const height = host.clientHeight || hr.height
    const content = ownPart(host, `[${ACCORDION_CONTENT_ATTR}]`)
    let head = height
    if (content && !content.hidden) head = content.getBoundingClientRect().top - oy
    contentHeight()
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
    const D = accordionOpenDuration(feel, effects)
    const z = zetaOf(feel, effects.jelly)
    const H = contentHeight()
    const cap = Math.max(0.5, Math.min(feel.overshoot * Math.max(0.5, Math.min(2, effects.jelly)), H * 0.25))
    // The content's height follows the pour spring exactly (the same soft-capped overshoot).
    const openEase = accordionEasing((q) => {
      const x = accordionFill(q * D, feel.pour, z)
      return x <= 1 || !(H > 0) ? x : 1 + (cap * Math.tanh(((x - 1) * H) / cap)) / H
    }, 48)
    st.setProperty(ACCORDION_TIMING_VARS.open, `${(D * k).toFixed(3)}s`)
    st.setProperty(ACCORDION_TIMING_VARS.openEase, openEase)
    st.setProperty(ACCORDION_TIMING_VARS.delay, `${(accordionDelay(to, flow, feel, effects) * k).toFixed(3)}s`)
    st.setProperty(ACCORDION_TIMING_VARS.close, `${(feel.close * k).toFixed(3)}s`)
    st.setProperty(ACCORDION_TIMING_VARS.closeEase, accordionEasing((q) => q * q, 12))
    host.toggleAttribute(ACCORDION_STILL_ATTR, reduced)
  }

  const runner: GooToggleRunner = createGooToggle(host, {
    color: `var(${ACCORDION_COLOR_VAR}, color-mix(in oklab, var(--primary, currentColor) 30%, var(--background, transparent)))`,
    part: 'accordion',
    circles: ACCORDION_CIRCLES,
    layout() {
      return { params: accordionGooParams(feel), padding: accordionPadding(feel) }
    },
    frame(t, reduced) {
      host.toggleAttribute(ACCORDION_STILL_ATTR, reduced)
      // At rest there is nothing to draw: skip the layout reads.
      if (reduced || from === to || t >= end()) {
        last = accordionStaticPose(to, geom ?? { width: 0, height: 0, head: 0, content: 0, source: null }, feel, effects)
        return last
      }
      geom = measure()
      last = accordionPose(t, from, to, geom, feel, effects, flow, opts.splashAmount, seed)
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
        seed++
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

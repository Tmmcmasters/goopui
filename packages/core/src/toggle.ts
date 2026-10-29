// Goo toggle and toggle group: pressing a toggle floods it with goo from the press point.
//
// One aria-hidden goo layer on the host (a single toggle button, or a toggle group root) draws
// every pressed item's fill as a grid of goo circles that melts into one rounded body.
//   flood (press on): a liquid front spreads out of the press point (the item's center for
//     keyboard presses). Circles swell as the front passes them (a crest that sloshes against
//     the walls), then the whole fill does a small jelly wobble. A few droplets splash off the
//     top edge as the front reaches it.
//   drain (press off): the front recedes back into the press point and the last of it shrinks
//     away.
//   flow (a group where one item turns off as another turns on, i.e. a single-select group):
//     the old item drains toward the new one, its goo gathers into a blob that stretches out
//     on a neck (the shared `gooBridge`), pinches off, travels over the items in between and
//     floods the new item from the side it arrived on.
//   merge: neighbouring pressed items join through goo bridge circles across their seam, so
//     a run of pressed items reads as one goo body. Un-pressing one drains it and the bridges
//     neck (outer rows first) and tear.
// Every frame is a pure function of the engine clock (`togglePose`), so reduced motion (static
// fills, bridges kept), first paint and every animation frame agree. Coordinates are the host's
// padding box. No DOM access until `attachToggle` / `attachToggleGroup` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { decayWobble, noCircle, smooth01, type GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { GOO_BRIDGE_NECKS, GOO_SPLASH_MAX, gooBridge, gooEffectValue, splashDrops } from './splat'
import { readPreset } from './tuning'

/** CSS var the goo paints with (shadcn's pressed toggle background, `--accent`, by default). */
export const TOGGLE_COLOR_VAR = '--goop-toggle-fill'

export interface ToggleFeel {
  /** Seconds for the flood front to cross a whole item. */
  flood: number
  /** Seconds for a full item to drain. */
  drain: number
  /** How much the circles swell as the flood front passes them (the crest). */
  crest: number
  /** Jelly wobble of the whole fill once it is full. */
  jelly: number
  /** Seconds from full until the jelly and droplets settle. */
  settle: number
  /** Splash droplet strength. */
  droplets: number
  /** Droplets per flood at strength 1 (2..4). */
  dropCount: number
  /** Seconds a flowing blob takes per 100px of travel between items. */
  flight: number
  /** Stretch of the flowing blob along its travel. */
  stretch: number
  /** How long the neck out of the old item holds before it pinches off. */
  bridge: number
  /** Goo blur as a fraction of the item's short side. */
  softness: number
}

export const TOGGLE_FEEL: Readonly<Record<GoopPreset, Readonly<ToggleFeel>>> = Object.freeze({
  subtle: Object.freeze({ flood: 0.3, drain: 0.24, crest: 0.18, jelly: 0.5, settle: 0.4, droplets: 0.6, dropCount: 2, flight: 0.16, stretch: 0.6, bridge: 0.6, softness: 0.08 }),
  playful: Object.freeze({ flood: 0.4, drain: 0.3, crest: 0.32, jelly: 1, settle: 0.5, droplets: 1, dropCount: 3, flight: 0.2, stretch: 1, bridge: 1, softness: 0.09 }),
  wild: Object.freeze({ flood: 0.52, drain: 0.38, crest: 0.48, jelly: 1.5, settle: 0.65, droplets: 1.3, dropCount: 4, flight: 0.26, stretch: 1.4, bridge: 1.3, softness: 0.1 }),
})

/** Individually toggleable effects of a single toggle (boolean or multiplier). */
export const TOGGLE_EFFECTS = ['flood', 'wobble', 'droplets'] as const
/** A toggle group adds the flow between items and the merge of neighbours. */
export const TOGGLE_GROUP_EFFECTS = [...TOGGLE_EFFECTS, 'flow', 'merge'] as const
export type ToggleEffect = (typeof TOGGLE_EFFECTS)[number]
export type ToggleGroupEffect = (typeof TOGGLE_GROUP_EFFECTS)[number]
export type ToggleEffects = Record<ToggleGroupEffect, number>
export const TOGGLE_ALL_EFFECTS: Readonly<ToggleEffects> = Object.freeze({ flood: 1, wobble: 1, droplets: 1, flow: 1, merge: 1 })

/** A point in the host's padding box. */
export interface TogglePoint {
  x: number
  y: number
}
/** An item's box in the host's padding box. */
export interface ToggleRect {
  x: number
  y: number
  w: number
  h: number
}

/** One flood or drain of an item, on the engine clock (seconds). */
export interface ToggleAnim {
  /** true = flooding toward full, false = draining toward empty. */
  on: boolean
  /** Where the front starts (flood) or drains into. */
  origin: TogglePoint
  /** Clock time the front starts moving (may be in the future: a flow lands later). */
  start: number
  /** Fill level (0..1) when it started. */
  from: number
  /** Splash droplets when it fills (floods only). */
  splash: boolean
}

/** A blob of goo flowing from one item to another. */
export interface ToggleFlight {
  from: TogglePoint
  to: TogglePoint
  start: number
  /** Seconds the head spends gathering out of the old item before it travels (0 = retarget). */
  gather: number
  /** Seconds of travel. */
  travel: number
  /** Head radius, px. */
  r: number
  /** The neck can hold on to `from` (false when retargeted mid-flight). */
  bridged: boolean
}

export interface ToggleItemPose {
  rect: ToggleRect
  anim: ToggleAnim
  /** Sides pulled in (px) so un-merged neighbours stay apart. */
  inset?: { l: number; r: number; t: number; b: number }
}

/** Grid circle radius for an item: a quarter of its short side (rounded-md-ish corners). */
export const toggleCircleR = (rect: ToggleRect): number => Math.max(1, Math.min(rect.w, rect.h) / 4)

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
const clampIn = (p: TogglePoint, rect: ToggleRect, m: number): TogglePoint => ({
  x: rect.w > 2 * m ? clamp(p.x, rect.x + m, rect.x + rect.w - m) : rect.x + rect.w / 2,
  y: rect.h > 2 * m ? clamp(p.y, rect.y + m, rect.y + rect.h - m) : rect.y + rect.h / 2,
})

/** Circle centers covering `rect` (inset by r so the circles stay inside it). */
export function toggleGrid(rect: ToggleRect, r: number): TogglePoint[] {
  const axis = (from: number, len: number): number[] => {
    if (len <= 2 * r) return [from + len / 2]
    const n = Math.max(2, Math.ceil((len - 2 * r) / (r * 0.95)) + 1)
    return Array.from({ length: n }, (_, i) => from + r + ((len - 2 * r) * i) / (n - 1))
  }
  const out: TogglePoint[] = []
  for (const y of axis(rect.y, rect.h)) for (const x of axis(rect.x, rect.w)) out.push({ x, y })
  return out
}

const farthest = (o: TogglePoint, rect: ToggleRect): number =>
  Math.max(Math.hypot(o.x - rect.x, o.y - rect.y), Math.hypot(o.x - rect.x - rect.w, o.y - rect.y),
    Math.hypot(o.x - rect.x, o.y - rect.y - rect.h), Math.hypot(o.x - rect.x - rect.w, o.y - rect.y - rect.h))

/** Seconds an anim's front moves for (0 when the flood is off: it snaps). */
export function toggleAnimDuration(anim: ToggleAnim, feel: ToggleFeel, effects: ToggleEffects = TOGGLE_ALL_EFFECTS): number {
  if (!(effects.flood > 0)) return 0
  return anim.on ? feel.flood * Math.max(0.2, 1 - anim.from) : feel.drain * Math.max(0.2, anim.from)
}

/** Clock time at which an anim has fully settled (front, jelly and droplets). */
export function toggleAnimEnd(anim: ToggleAnim, feel: ToggleFeel, effects: ToggleEffects = TOGGLE_ALL_EFFECTS): number {
  const d = toggleAnimDuration(anim, feel, effects)
  const tail = anim.on && (effects.wobble > 0 || (anim.splash && effects.droplets > 0)) ? feel.settle : 0
  return anim.start + d + tail
}

/** Fill level (0..1) of an anim at clock `now`, and seconds since it became full (-1 if not). */
export function toggleLevel(anim: ToggleAnim, now: number, feel: ToggleFeel, effects: ToggleEffects = TOGGLE_ALL_EFFECTS): { p: number; full: number } {
  const a = now - anim.start
  if (a < 0) return { p: anim.from, full: -1 }
  const d = toggleAnimDuration(anim, feel, effects)
  const u = d > 0 ? clamp(a / d, 0, 1) : 1
  if (anim.on) {
    // Fast out of the press, slowing as it reaches the far walls.
    const p = anim.from + (1 - anim.from) * (1 - (1 - u) * (1 - u))
    return { p, full: u >= 1 ? a - d : -1 }
  }
  // Slow to let go, then sucked away.
  return { p: anim.from * (1 - u * u), full: -1 }
}

/**
 * The goo circles of one item at clock `now`: its grid, each circle grown once the front has
 * passed it, swelling at the front (crest) and wobbling once full (jelly). `inset` pulls sides
 * in. Plus a seed circle at the origin and GOO_SPLASH_MAX droplet circles. Pure.
 */
export function toggleFillCircles(
  item: ToggleItemPose,
  now: number,
  feel: ToggleFeel = TOGGLE_FEEL.playful,
  effects: ToggleEffects = TOGGLE_ALL_EFFECTS,
): GooCircle[] {
  const ins = item.inset ?? { l: 0, r: 0, t: 0, b: 0 }
  const rect: ToggleRect = {
    x: item.rect.x + ins.l,
    y: item.rect.y + ins.t,
    w: Math.max(1, item.rect.w - ins.l - ins.r),
    h: Math.max(1, item.rect.h - ins.t - ins.b),
  }
  const r = toggleCircleR(rect)
  const grid = toggleGrid(rect, r)
  const { anim } = item
  const o = clampIn(anim.origin, rect, r)
  const band = r * 1.4
  const D = farthest(o, rect) + band
  const { p, full } = toggleLevel(anim, now, feel, effects)
  const front = p * D
  const wobble = Math.max(0, effects.wobble)
  const moving = anim.on && p < 1 && now >= anim.start && effects.flood > 0
  const crest = moving ? feel.crest * wobble * Math.min(1, (1 - p) * 3) : 0
  const jelly = full >= 0 && wobble > 0 ? 0.14 * feel.jelly * wobble * decayWobble(full, 3.6, 5, feel.settle) : 0
  const out: GooCircle[] = []
  for (const c of grid) {
    const d = Math.hypot(c.x - o.x, c.y - o.y)
    const g = p >= 1 ? 1 : smooth01((front - d) / band)
    const bump = crest > 0 ? crest * Math.exp(-(((front - d - band * 0.5) / band) ** 2)) : 0
    const rr = g > 0.001 ? r * (g + bump * g) * (1 + jelly) : 0
    out.push(rr > 0 ? { x: c.x, y: c.y, r: rr, sx: 1, sy: 1 } : noCircle(c.x, c.y))
  }
  // Seed: the goo first wells up (or last disappears) right at the origin.
  const seed = p > 0 && p < 1 ? r * 1.1 * smooth01(front / band) : 0
  out.push(seed > 0 ? { x: o.x, y: o.y, r: seed, sx: 1, sy: 1 } : noCircle(o.x, o.y))
  // Droplets off the top edge as the front reaches it.
  const amount = Math.max(0, effects.droplets)
  if (anim.on && anim.splash && amount > 0 && effects.flood > 0) {
    const d = toggleAnimDuration(anim, feel, effects)
    const age = now - anim.start - d * 0.45
    const fr = r * 1.25
    const frame = {
      x: o.x,
      y: rect.y + fr * 0.4,
      r: fr,
      tx: fr * 0.7,
      ty: 0,
      out: (side: -1 | 1) => [side * 0.5, -0.87] as const,
    }
    out.push(...splashDrops(age, age >= feel.settle, frame, 1, feel, amount))
  } else for (let i = 0; i < GOO_SPLASH_MAX; i++) out.push(noCircle(o.x, o.y))
  return out
}

/** Circles in one item's fill besides its grid: the seed plus the droplets. */
export const TOGGLE_ITEM_EXTRA = 1 + GOO_SPLASH_MAX

/** How two neighbouring rects meet: the axis they sit along and the gap between them, or null
 *  when they are not neighbours (too far apart, or barely overlapping across). */
export function toggleSeam(a: ToggleRect, b: ToggleRect, maxGap: number): { axis: 'x' | 'y'; gap: number; flip: boolean } | null {
  const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (oy >= 0.5 * Math.min(a.h, b.h)) {
    const flip = b.x < a.x
    const gap = flip ? a.x - (b.x + b.w) : b.x - (a.x + a.w)
    return gap <= maxGap && gap > -0.5 * Math.min(a.w, b.w) ? { axis: 'x', gap, flip } : null
  }
  if (ox >= 0.5 * Math.min(a.w, b.w)) {
    const flip = b.y < a.y
    const gap = flip ? a.y - (b.y + b.h) : b.y - (a.y + a.h)
    return gap <= maxGap && gap > -0.5 * Math.min(a.h, b.h) ? { axis: 'y', gap, flip } : null
  }
  return null
}

/** How fully an item's fill covers the edge it shares with a neighbour (0..1). */
function edgeCover(item: ToggleItemPose, edge: 'l' | 'r' | 't' | 'b', now: number, feel: ToggleFeel, effects: ToggleEffects): number {
  const { rect, anim } = item
  const r = toggleCircleR(rect)
  const { p } = toggleLevel(anim, now, feel, effects)
  if (p >= 1) return 1
  if (!(p > 0)) return 0
  const o = clampIn(anim.origin, rect, r)
  const band = r * 1.4
  const front = p * (farthest(o, rect) + band)
  const ends: TogglePoint[] =
    edge === 'l' ? [{ x: rect.x + r, y: rect.y + r }, { x: rect.x + r, y: rect.y + rect.h - r }]
    : edge === 'r' ? [{ x: rect.x + rect.w - r, y: rect.y + r }, { x: rect.x + rect.w - r, y: rect.y + rect.h - r }]
    : edge === 't' ? [{ x: rect.x + r, y: rect.y + r }, { x: rect.x + rect.w - r, y: rect.y + r }]
    : [{ x: rect.x + r, y: rect.y + rect.h - r }, { x: rect.x + rect.w - r, y: rect.y + rect.h - r }]
  const far = Math.max(...ends.map((e) => Math.hypot(e.x - o.x, e.y - o.y)))
  return smooth01((front - far) / band)
}

/** Bridge circles a seam holds at most: rows x columns across the gap. */
export const TOGGLE_BRIDGE_MAX = 12

/**
 * Goo bridge across the seam between two neighbouring items, `m` (0..1) strong: columns of
 * circles across the gap, the middle rows thickest so a weakening bridge necks before it tears.
 * Always TOGGLE_BRIDGE_MAX circles (r = 0 unused). Pure.
 */
export function toggleBridgeCircles(a: ToggleRect, b: ToggleRect, m: number, maxGap = Infinity): GooCircle[] {
  const out: GooCircle[] = []
  const seam = toggleSeam(a, b, maxGap)
  const r = Math.min(toggleCircleR(a), toggleCircleR(b))
  if (seam && m > 0.001) {
    const [p, q] = seam.flip ? [b, a] : [a, b]
    const along = seam.axis === 'x'
    // Span across the seam: from the near edge column of p to that of q.
    const s0 = along ? p.x + p.w - r : p.y + p.h - r
    const s1 = along ? q.x + r : q.y + r
    const cols = Math.max(1, Math.min(4, Math.ceil((s1 - s0) / r) - 1))
    // Rows along the shared stretch of edge.
    const lo = along ? Math.max(p.y, q.y) : Math.max(p.x, q.x)
    const hi = along ? Math.min(p.y + p.h, q.y + q.h) : Math.min(p.x + p.w, q.x + q.w)
    const span = Math.max(0, hi - lo - 2 * r)
    const rows = Math.max(1, Math.min(Math.floor(TOGGLE_BRIDGE_MAX / cols), Math.ceil(span / (r * 0.95)) + 1))
    for (let j = 0; j < rows; j++) {
      const f = rows === 1 ? 0.5 : j / (rows - 1)
      const across = lo + r + span * f
      // 1 in the middle row, ~0 at the outer rows: the outer rows give way first.
      const mid = 1 - Math.abs(2 * f - 1)
      const k = smooth01((m - 0.55 * (1 - mid)) / (1 - 0.55 * (1 - mid)))
      for (let i = 0; i < cols; i++) {
        const s = s0 + ((s1 - s0) * (i + 1)) / (cols + 1)
        const rr = r * k
        out.push(rr > 0.01 ? (along ? { x: s, y: across, r: rr, sx: 1, sy: 1 } : { x: across, y: s, r: rr, sx: 1, sy: 1 }) : noCircle(s, across))
      }
    }
  }
  while (out.length < TOGGLE_BRIDGE_MAX) out.push(noCircle(a.x, a.y))
  return out.slice(0, TOGGLE_BRIDGE_MAX)
}

/** Circles in a flight: head, 2 tail, bridge anchor + necks. */
export const TOGGLE_FLIGHT_CIRCLES = 3 + 1 + GOO_BRIDGE_NECKS

const travelEase = (u: number): number => u * u * (3 - 2 * u)
const travelSpeed = (u: number): number => clamp(6 * u * (1 - u) / 1.5, 0, 1)

/** Seconds after a flight's start at which it lands (the new item starts flooding). */
export const toggleFlightLand = (f: ToggleFlight): number => f.gather + f.travel
/** Seconds the landed head takes to soak into the new item. */
export const TOGGLE_FLIGHT_ABSORB = 0.14

/**
 * A flowing blob at clock `now`: it gathers out of the old item, stretches away on a neck that
 * pinches off, travels (stretched along its flight, a teardrop tail) and soaks into the new
 * item. Returns TOGGLE_FLIGHT_CIRCLES circles and where the head is (null once absorbed). Pure.
 */
export function toggleFlightPose(
  f: ToggleFlight,
  now: number,
  feel: ToggleFeel = TOGGLE_FEEL.playful,
  effects: ToggleEffects = TOGGLE_ALL_EFFECTS,
): { circles: GooCircle[]; at: TogglePoint | null } {
  const a = now - f.start
  const land = toggleFlightLand(f)
  const hidden = { circles: Array.from({ length: TOGGLE_FLIGHT_CIRCLES }, () => noCircle(f.to.x, f.to.y)), at: null }
  if (a < 0 || a >= land + TOGGLE_FLIGHT_ABSORB) return hidden
  const dx = f.to.x - f.from.x
  const dy = f.to.y - f.from.y
  const len = Math.hypot(dx, dy)
  const nx = len > 0.01 ? dx / len : 1
  const ny = len > 0.01 ? dy / len : 0
  const grow = f.gather > 0 ? smooth01(a / (f.gather * 0.8)) : 1
  const u = f.travel > 0 ? clamp((a - f.gather) / f.travel, 0, 1) : 1
  const soak = a > land ? smooth01((a - land) / TOGGLE_FLIGHT_ABSORB) : 0
  const pp = travelEase(u)
  const k = clamp(feel.stretch * Math.max(0, effects.flow) * travelSpeed(u) * Math.min(1, len / (3 * f.r)), 0, 1.4)
  const along = 1 + 0.35 * k
  const across = 1 - 0.18 * k
  const sx = along * nx * nx + across * ny * ny
  const sy = along * ny * ny + across * nx * nx
  const hx = f.from.x + dx * pp + nx * f.r * 0.5 * soak
  const hy = f.from.y + dy * pp + ny * f.r * 0.5 * soak
  const hr = f.r * grow * (1 - soak)
  const circles: GooCircle[] = [hr > 0.01 ? { x: hx, y: hy, r: hr, sx, sy } : noCircle(hx, hy)]
  const tail = f.r * 0.45 * k
  for (let i = 0; i < 2; i++) {
    const tr = hr * (i === 0 ? 0.62 : 0.4)
    circles.push(k > 0.02 && tr > 0.01 ? { x: hx - nx * tail * (i + 1), y: hy - ny * tail * (i + 1), r: tr, sx: 1, sy: 1 } : noCircle(hx, hy))
  }
  const bridge = Math.max(0, effects.flow) * feel.bridge
  if (f.bridged && bridge > 0 && a >= f.gather && u < 1) {
    const back = { x: hx - nx * f.r * along * 0.6, y: hy - ny * f.r * along * 0.6 }
    const b = gooBridge(u, f.from, back, { x: nx, y: ny }, f.r, bridge, 1.3)
    circles.push(b.anchor, ...b.necks)
  } else for (let i = 0; i <= GOO_BRIDGE_NECKS; i++) circles.push(noCircle(f.from.x, f.from.y))
  return { circles, at: hr > 0.01 ? { x: hx, y: hy } : null }
}

/** Whole-host pose: every item's fill, the bridges between pressed neighbours, the flights. */
export interface TogglePose {
  circles: GooCircle[]
  /** Fill level per item (0..1). */
  levels: number[]
  /** Bridge strength per neighbouring pair (i, i + 1), 0..1. */
  bridges: number[]
}

/**
 * The goo at clock `now`. `items` in DOM order; consecutive items that sit next to each other
 * (gap <= `maxGap`) are neighbours: with merge on their pressed fills join through a bridge,
 * with merge off their facing sides are pulled in by `sep` px so they stay apart. Pure.
 */
export function togglePose(
  items: readonly ToggleItemPose[],
  flights: readonly ToggleFlight[],
  now: number,
  feel: ToggleFeel = TOGGLE_FEEL.playful,
  effects: ToggleEffects = TOGGLE_ALL_EFFECTS,
  opts: { maxGap?: number; sep?: number } = {},
): TogglePose {
  const maxGap = opts.maxGap ?? 16
  const sep = opts.sep ?? 3
  const merge = Math.max(0, effects.merge)
  const seams = items.map((it, i) => (i + 1 < items.length ? toggleSeam(it.rect, items[i + 1]!.rect, maxGap) : null))
  const posed = items.map((it) => ({ ...it, inset: { l: 0, r: 0, t: 0, b: 0 } }))
  if (!(merge > 0)) {
    // Un-merged neighbours: pull the facing sides in so the goo can't melt them together.
    seams.forEach((s, i) => {
      if (!s) return
      const pull = Math.max(0, sep - s.gap / 2)
      const [p, q] = s.flip ? [posed[i + 1]!, posed[i]!] : [posed[i]!, posed[i + 1]!]
      if (s.axis === 'x') {
        p.inset.r += pull
        q.inset.l += pull
      } else {
        p.inset.b += pull
        q.inset.t += pull
      }
    })
  }
  const circles: GooCircle[] = []
  const levels: number[] = []
  for (const it of posed) {
    circles.push(...toggleFillCircles(it, now, feel, effects))
    levels.push(toggleLevel(it.anim, now, feel, effects).p)
  }
  const bridges: number[] = []
  seams.forEach((s, i) => {
    if (i + 1 >= items.length) return
    let m = 0
    if (s && merge > 0) {
      const [ea, eb] = s.axis === 'x' ? (s.flip ? (['l', 'r'] as const) : (['r', 'l'] as const)) : s.flip ? (['t', 'b'] as const) : (['b', 't'] as const)
      m = Math.min(1, merge) * Math.min(edgeCover(items[i]!, ea, now, feel, effects), edgeCover(items[i + 1]!, eb, now, feel, effects))
    }
    bridges.push(m)
    if (s) circles.push(...toggleBridgeCircles(items[i]!.rect, items[i + 1]!.rect, m, maxGap))
  })
  for (const f of flights) circles.push(...toggleFlightPose(f, now, feel, effects).circles)
  return { circles, levels, bridges }
}

/** Goo filter parameters for items `size` px on their short side. */
export function toggleGooParams(size: number, feel: ToggleFeel = TOGGLE_FEEL.playful): GooFilterParams {
  return { blur: Math.max(0.75, Math.round(size * feel.softness * 4) / 4), contrast: 20, threshold: 0.45 }
}

// ---- attach ---------------------------------------------------------------------------------

export interface ToggleOptions {
  /** Pressed state. Any change re-reads the item states from the DOM. */
  pressed?: unknown
  speed?: number
  preset?: GoopPreset
  renderer?: GoopRendererOption
  /** Flood from the press point / drain back into it. Off: the fill snaps. Default true. */
  flood?: boolean | number
  /** Crest of the flood front and a jelly wobble once full. Default true. */
  wobble?: boolean | number
  /** A few droplets splash off the top edge as it floods. Default true. */
  droplets?: boolean | number
  reducedMotion?: boolean | 'auto'
}

export interface ToggleGroupOptions extends Omit<ToggleOptions, 'pressed'> {
  /** The group's value. Any change re-reads the item states from the DOM. */
  value?: unknown
  /** Selector for the items inside the root. Default `[aria-pressed]`. */
  item?: string
  /** When one item turns off as another turns on (single select), the goo flows from the old
   *  item to the new one. Default true. */
  flow?: boolean | number
  /** Neighbouring pressed items merge into one goo body (and tear apart). Default true. */
  merge?: boolean | number
}

export interface ToggleHandle {
  update(opts?: ToggleGroupOptions): void
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  readonly pose: TogglePose | null
  destroy(): void
}

const isOn = (el: Element): boolean =>
  el.getAttribute('data-state') === 'on' || el.getAttribute('aria-pressed') === 'true'

const effectsOf = (o: ToggleGroupOptions): ToggleEffects => ({
  flood: gooEffectValue(o.flood),
  wobble: gooEffectValue(o.wobble),
  droplets: gooEffectValue(o.droplets),
  flow: gooEffectValue(o.flow),
  merge: gooEffectValue(o.merge),
})

/** Press points older than this (ms) are ignored (the change came from somewhere else). */
const PRESS_MS = 1200

function attachEngine(host: HTMLElement, getItems: () => HTMLElement[], options: ToggleGroupOptions, part: string): ToggleHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: ToggleGroupOptions = { ...options }
  let feel = TOGGLE_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let els: HTMLElement[] = []
  let rects: ToggleRect[] = []
  let anims = new Map<HTMLElement, ToggleAnim>()
  let flights: ToggleFlight[] = []
  let now = 0
  let last: TogglePose | null = null
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let params: GooFilterParams | null = null
  let destroyed = false
  let press: { el: HTMLElement; x: number; y: number; at: number } | null = null

  const readReduced = (): boolean => {
    const o = opts.reducedMotion
    return o === true || (o !== false && isReducedMotion(doc))
  }
  let reduced = readReduced()

  const local = (cx: number, cy: number): TogglePoint => {
    const hr = host.getBoundingClientRect()
    return { x: cx - hr.left - host.clientLeft, y: cy - hr.top - host.clientTop }
  }
  const rectOf = (el: HTMLElement): ToggleRect => {
    if (el === host) return { x: -host.clientLeft, y: -host.clientTop, w: host.offsetWidth || host.getBoundingClientRect().width, h: host.offsetHeight || host.getBoundingClientRect().height }
    const er = el.getBoundingClientRect()
    const p = local(er.left, er.top)
    return { x: p.x, y: p.y, w: er.width, h: er.height }
  }
  const center = (r: ToggleRect): TogglePoint => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
  const measure = (): void => {
    els = getItems()
    rects = els.map(rectOf)
  }
  const short = (): number => {
    const sizes = rects.map((r) => Math.min(r.w, r.h)).filter((s) => s > 0)
    return sizes.length ? Math.min(...sizes) : 36
  }
  const animOf = (el: HTMLElement, i: number): ToggleAnim => {
    let a = anims.get(el)
    if (!a) {
      a = { on: isOn(el), origin: center(rects[i]!), start: -1e6, from: isOn(el) ? 1 : 0, splash: false }
      anims.set(el, a)
    }
    return a
  }
  const levelOf = (a: ToggleAnim): number => toggleLevel(a, now, feel, effects).p

  const busyUntil = (): number => {
    let end = -Infinity
    for (const a of anims.values()) end = Math.max(end, toggleAnimEnd(a, feel, effects))
    for (const f of flights) end = Math.max(end, f.start + toggleFlightLand(f) + TOGGLE_FLIGHT_ABSORB)
    return end
  }

  const draw = (): void => {
    if (!layer) return
    const items = els.map((el, i) => ({ rect: rects[i]!, anim: animOf(el, i) }))
    if (reduced) {
      // Static: pressed items full, merges kept, nothing in flight.
      const still = items.map((it) => ({ ...it, anim: { ...it.anim, from: it.anim.on ? 1 : 0, start: -1e6, splash: false } }))
      last = togglePose(still, [], 0, feel, effects, { sep: (params?.blur ?? 3) * 1.2 })
    } else {
      last = togglePose(items, flights, now, feel, effects, { sep: (params?.blur ?? 3) * 1.2 })
    }
    const cs = last.circles
    while (blobs.length < cs.length) blobs.push(layer.createBlob())
    for (let i = 0; i < blobs.length; i++) {
      const c = cs[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
      else blobs[i]!.set(0, 0, 0)
    }
    layer.flush()
  }

  const layout = (): { params: GooFilterParams; pad: number } => {
    measure()
    const p = toggleGooParams(short(), feel)
    const r = short() / 4
    return { params: p, pad: Math.ceil(p.blur * 3 + r * 4.5) }
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }
  const build = (): void => {
    teardown()
    const l = layout()
    params = l.params
    layer = resolveRenderer(opts.renderer)(host, l.params)
    layer.layer.style.setProperty('--goop-color', `var(${TOGGLE_COLOR_VAR}, var(--accent, currentColor))`)
    layer.layer.setAttribute('data-goop-part', part)
    layer.setBodyScale(0, 0)
    layer.setPadding({ side: l.pad, bottom: l.pad })
    draw()
  }
  const resize = (): void => {
    if (destroyed || !layer) return
    const l = layout()
    if (!params || l.params.blur !== params.blur) {
      params = l.params
      layer.setParams(l.params)
    }
    layer.setPadding({ side: l.pad, bottom: l.pad })
    draw()
  }

  const shouldRun = (): boolean => !destroyed && !reduced && now < busyUntil()
  const tick: Ticker = (dt) => {
    if (!shouldRun()) return false
    now += dt * Math.max(0.05, opts.speed ?? 1)
    flights = flights.filter((f) => now < f.start + toggleFlightLand(f) + TOGGLE_FLIGHT_ABSORB)
    draw()
    return shouldRun()
  }
  const run = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  /** Re-read the pressed states and start floods, drains and flows for the ones that changed. */
  const sync = (): void => {
    if (destroyed) return
    measure()
    const turnedOn: number[] = []
    const turnedOff: number[] = []
    els.forEach((el, i) => {
      const a = animOf(el, i)
      if (isOn(el) !== a.on) (a.on ? turnedOff : turnedOn).push(i)
    })
    // Drop anims of removed items.
    for (const el of anims.keys()) if (!els.includes(el)) anims.delete(el)
    if (!turnedOn.length && !turnedOff.length) return
    reduced = readReduced()
    const pressAt = (i: number): TogglePoint => {
      const ok = press && press.el === els[i] && performance.now() - press.at < PRESS_MS
      return ok ? { x: press!.x, y: press!.y } : center(rects[i]!)
    }
    const restart = (i: number, on: boolean, origin: TogglePoint, delay = 0): void => {
      const el = els[i]!
      const prev = animOf(el, i)
      const from = levelOf(prev)
      // Mid-flight the front keeps its origin, so the goo never jumps.
      const keep = from > 0.02 && from < 0.98 && now >= prev.start
      // Reduced motion: the change is already over (nothing replays if motion comes back).
      anims.set(el, { on, origin: keep ? prev.origin : origin, start: reduced ? now - 1e3 : now + delay, from, splash: on })
    }
    const flow = Math.max(0, effects.flow)
    if (!reduced && flow > 0 && turnedOn.length === 1 && turnedOff.length === 1) {
      const ia = turnedOff[0]!
      const ib = turnedOn[0]!
      const A = rects[ia]!
      const B = rects[ib]!
      const rA = toggleCircleR(A)
      const rB = toggleCircleR(B)
      const exit = clampIn(center(B), A, rA)
      const entry = clampIn(center(A), B, rB)
      // A flight already heading somewhere retargets from where its head is.
      const live = flights.map((f) => toggleFlightPose(f, now, feel, effects).at).find((p) => p)
      const fromPt = live ?? exit
      const dist = Math.hypot(entry.x - fromPt.x, entry.y - fromPt.y)
      const travel = feel.flight * clamp(dist / 100, 0.35, 2.5)
      const gather = live ? 0 : feel.drain * 0.5
      const fl: ToggleFlight = { from: fromPt, to: entry, start: now, gather, travel, r: Math.min(rA, rB) * 1.25, bridged: !live }
      flights = [fl]
      restart(ia, false, exit)
      restart(ib, true, entry, toggleFlightLand(fl))
    } else {
      flights = []
      for (const i of turnedOff) restart(i, false, pressAt(i))
      for (const i of turnedOn) restart(i, true, pressAt(i))
    }
    press = null
    draw()
    run()
  }

  const onPointerDown = (e: PointerEvent): void => {
    const t = e.target as Node | null
    const el = els.find((x) => t && x.contains(t)) ?? (t && getItems().find((x) => x.contains(t)))
    if (!el) return
    const p = local(e.clientX, e.clientY)
    press = { el, x: p.x, y: p.y, at: performance.now() }
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  measure()
  build()
  host.addEventListener('pointerdown', onPointerDown, true)
  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const MO = win?.MutationObserver
  const mo = MO ? new MO(() => sync()) : undefined
  mo?.observe(host, { attributes: true, attributeFilter: ['data-state', 'aria-pressed'], subtree: true, childList: true })
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    draw()
    run()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = TOGGLE_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      reduced = readReduced()
      if (rebuild) build()
      else resize()
      sync()
      run()
    },
    resize,
    get running() {
      return shouldRun()
    },
    get reducedMotion() {
      return reduced
    },
    get pose() {
      return last
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      ro?.disconnect()
      mo?.disconnect()
      unwatch()
      host.removeEventListener('pointerdown', onPointerDown, true)
      teardown()
      anims = new Map()
      flights = []
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

/**
 * Attach the goo fill to a single toggle button `host` (its own `data-state="on"` /
 * `aria-pressed`). Pressing floods it from the press point, un-pressing drains it.
 */
export function attachToggle(host: HTMLElement, options: ToggleOptions = {}): ToggleHandle {
  const { pressed: _p, ...rest } = options
  return attachEngine(host, () => [host], { ...rest, flow: false, merge: false }, 'toggle')
}

/**
 * Attach the goo fills to a toggle group root `host` (items: `[aria-pressed]` by default).
 * Items flood and drain like a single toggle; in a single-select group the goo flows from the
 * old item to the new one; neighbouring pressed items merge into one body.
 */
export function attachToggleGroup(host: HTMLElement, options: ToggleGroupOptions = {}): ToggleHandle {
  let selector = options.item ?? '[aria-pressed]'
  const items = (): HTMLElement[] => Array.from(host.querySelectorAll<HTMLElement>(selector))
  const h = attachEngine(host, items, options, 'toggle-group')
  return {
    ...h,
    update(next = {}) {
      if (next.item) selector = next.item
      h.update(next)
    },
    get running() {
      return h.running
    },
    get reducedMotion() {
      return h.reducedMotion
    },
    get pose() {
      return h.pose
    },
  }
}

// Goo switch: the thumb is a goo blob that throws itself across the track.
//
// Built from existing pieces only: two GoopRenderers on the host (bodies hidden, blobs only)
// and a ticker on the shared rAF loop. The fill layer (primary color) sits under the thumb
// layer (thumb color). Each frame is a pure function of the toggle's progress (`switchPose`),
// so the reduced-motion pose, the resting pose and every animation frame agree.
//
// One toggle, t = 0..1 over `duration`:
//   travel (t < TRAVEL): the thumb leaves slowly (the goo sticks), accelerates, and hits the
//     far wall still moving. It leans and stretches along its travel (sx/sy) and drags a
//     teardrop tail behind it. A residual blob stays stuck at the start, joined by a neck that
//     thins and snaps, then recoils into the wall (the bridge).
//   landing (t >= TRAVEL): the stretch turns into a jelly squash against the wall, a rebound,
//     and a damped wobble that settles to exactly round at t = 1.
//   splat (on by default) replaces that landing: the thumb keeps its momentum and flattens
//     against the end wall like a water balloon (short along the travel, bulging taller, the
//     wall side squared off), rebounds a little off the wall and wobbles, settling over
//     `feel.settle` seconds. The landing then outlasts t = 1: the toggle ends at
//     `switchToggleEnd(feel, effects)`. `squish` scales the wobble after the first flatten, so the
//     two compose into one deformation instead of doubling up.
//   droplets: on impact 2-4 fat drops neck off the thumb's wall side, fly up/out past the wall,
//     arc over under screen-down gravity and fall back (merging into the goo, or shrinking away).
//     They are drawn in the fill layer (primary color) so they read on any page background.
//   The primary fill runs from the left end of the track to the thumb, so checking floods the
//   track with goo behind the thumb and unchecking drains it back.
//
// Coordinates are host px (border-box, 0,0 = top-left). Nothing here touches
// `document`/`window` until `attachSwitch` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'
import { decayWobble } from './liquid'

/** Fraction of a toggle spent travelling; the rest is the landing wobble. */
export const SWITCH_TRAVEL = 0.56
/** Circles in the thumb layer: head, 2 tail, anchor, 3 neck, 2 wall corners (splat). */
export const SWITCH_THUMB_CIRCLES = 9
/** Circles in the fill layer (not counting the splash droplets drawn after them). */
export const SWITCH_FILL_CIRCLES = 6
/** Splash droplet circles (drawn in the fill layer; r = 0 when idle). */
export const SWITCH_DROP_CIRCLES = 4
/** CSS vars the two goo layers paint with (set them on the host or an ancestor). */
export const SWITCH_THUMB_COLOR_VAR = '--goop-switch-thumb'
export const SWITCH_FILL_COLOR_VAR = '--goop-switch-fill'

/** Per-preset feel. */
export interface SwitchFeel {
  /** Seconds per toggle at speed 1 (travel + landing). */
  duration: number
  /** Lean / teardrop strength. */
  stretch: number
  /** How long the bridge holds before it snaps (0 = no bridge). */
  bridge: number
  /** Landing squash / wobble strength. */
  squish: number
  /** Goo blur as a fraction of the track height. */
  softness: number
  /** Wall splat strength: how far the thumb flattens on arrival (0 = none). */
  splat: number
  /** Seconds from impact until the splat and droplets have settled. */
  settle: number
  /** Splash droplet strength (size and flight height). */
  droplets: number
  /** Droplets per impact at strength 1 (2..4). */
  dropCount: number
}

export const SWITCH_FEEL: Readonly<Record<GoopPreset, Readonly<SwitchFeel>>> = Object.freeze({
  subtle: Object.freeze({
    duration: 0.4,
    stretch: 0.6,
    bridge: 0.6,
    squish: 0.55,
    softness: 0.075,
    splat: 0.6,
    settle: 0.5,
    droplets: 0.7,
    dropCount: 2,
  }),
  playful: Object.freeze({
    duration: 0.52,
    stretch: 1,
    bridge: 1,
    squish: 1,
    softness: 0.08,
    splat: 1,
    settle: 0.6,
    droplets: 1,
    dropCount: 3,
  }),
  wild: Object.freeze({
    duration: 0.66,
    stretch: 1.4,
    bridge: 1.3,
    squish: 1.5,
    softness: 0.085,
    splat: 1.4,
    settle: 0.7,
    droplets: 1.25,
    dropCount: 4,
  }),
})

/** Wall splat / splash shape constants (feel-independent). Distances are in thumb radii. */
export const SWITCH_SPLAT = Object.freeze({
  /** Wobble frequency, Hz (about 2.5 wobbles over a 0.6s settle). */
  freq: 4.4,
  /** Wobble damping per second. */
  damping: 5.5,
  /** Along-travel squash per unit of splat (sx = 1 - flatten * q). */
  flatten: 0.45,
  /** Perpendicular bulge per unit of splat (sy = 1 + bulge * q). */
  bulge: 0.3,
  /** Rebound: how far the thumb springs back off the wall at the first rebound. */
  rebound: 0.5,
  /** Wall-corner circle radius (squares off the side touching the wall). */
  corner: 0.42,
  /** Impacts weaker than this throw no droplets (0..1, short interrupted toggles). */
  dropMinImpact: 0.3,
  /** Per droplet, in priority order: wall-side top/bottom, size (r), apex height (r), outward
   *  reach past the launch point (r), extra fall below the launch (r), flight (s, at settle
   *  0.6), delay (s), and whether it lands back in the goo (merge) or shrinks away. */
  drops: Object.freeze([
    Object.freeze({ top: true, size: 0.36, height: 1.7, reach: 0.55, fall: 0, flight: 0.42, delay: 0, merge: true }),
    Object.freeze({ top: false, size: 0.27, height: 0.45, reach: 0.9, fall: 1.1, flight: 0.34, delay: 0.012, merge: false }),
    Object.freeze({ top: true, size: 0.24, height: 2.2, reach: 1.35, fall: 0.3, flight: 0.5, delay: 0.022, merge: false }),
    Object.freeze({ top: true, size: 0.2, height: 1.15, reach: -0.2, fall: 0, flight: 0.33, delay: 0.035, merge: true }),
  ]),
})

/** The switch's individually toggleable effects. Each takes a boolean or a multiplier
 *  (1 = the preset's strength, 0 = off). `fill` is on/off only. */
export const SWITCH_EFFECTS = ['stretch', 'bridge', 'squish', 'fill', 'splat', 'droplets'] as const
export type SwitchEffect = (typeof SWITCH_EFFECTS)[number]
export type SwitchEffects = Record<SwitchEffect, number>
/** Every effect on at preset strength (the default). */
export const SWITCH_ALL_EFFECTS: Readonly<SwitchEffects> = Object.freeze({
  stretch: 1,
  bridge: 1,
  squish: 1,
  fill: 1,
  splat: 1,
  droplets: 1,
})

/** One circle, host px. sx/sy stretch it (1 = round). */
export interface SwitchCircle {
  x: number
  y: number
  r: number
  sx: number
  sy: number
}

export interface SwitchGeometry {
  /** Host border-box size, px. */
  width: number
  height: number
}

export interface SwitchPose {
  /** SWITCH_THUMB_CIRCLES circles: head, tail x2, anchor, neck x3, wall corner x2. */
  thumb: SwitchCircle[]
  /** SWITCH_FILL_CIRCLES circles (all r = 0 when unchecked or fill is off). */
  fill: SwitchCircle[]
  /** SWITCH_DROP_CIRCLES splash droplets (fill layer; all r = 0 unless splashing). */
  drops: SwitchCircle[]
  /** Thumb position along the track, 0 (unchecked) .. 1 (checked). */
  position: number
}

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))
const smooth = (x: number): number => {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}
const none = (x: number, y: number): SwitchCircle => ({ x, y, r: 0, sx: 1, sy: 1 })

/** Track metrics shared by the pose and the adapter. */
export function switchMetrics(g: SwitchGeometry): { cy: number; r: number; x0: number; x1: number; fillR: number } {
  const h = Math.max(1, g.height)
  const R = h / 2
  const inset = Math.max(1, h * 0.065)
  return { cy: R, r: Math.max(0.5, R - inset), x0: R, x1: Math.max(R, g.width - R), fillR: R + 0.35 }
}

/** Eased travel 0..1: slow off the mark, still moving when it hits the wall. */
const travel = (u: number): number => u * u * (2 - u)
/** Normalised travel speed 0..1 (d travel / du is 4u - 3u², peak 4/3). */
const travelSpeed = (u: number): number => clamp((4 * u - 3 * u * u) * 0.75, 0, 1)
/** Landing wobble: 0 at impact, squash peak ~0.12, damped, exactly 0 at w = 1. */
const wobble = (w: number): number => (Math.sin(2 * Math.PI * 1.75 * w) * Math.exp(-4 * w) * (1 - w)) / 0.55

/** Toggle progress at which everything has settled: 1, or later when the splat / droplets
 *  run past the plain landing (they last `feel.settle` seconds from impact). */
export function switchToggleEnd(
  feel: SwitchFeel = SWITCH_FEEL.playful,
  effects: SwitchEffects = SWITCH_ALL_EFFECTS,
): number {
  if (!(effects.splat > 0 && feel.splat > 0) && !(effects.droplets > 0 && feel.droplets > 0)) return 1
  return Math.max(1, SWITCH_TRAVEL + feel.settle / Math.max(0.01, feel.duration))
}

/** Splat deformation `a` seconds after impact: > 0 flattened against the wall, < 0 rebounding
 *  (stretched off it). Starts at 0, exactly 0 from `settle` on. `jelly` scales the wobble
 *  after the first flatten. */
function splatCurve(a: number, settle: number, jelly: number): number {
  return decayWobble(a, SWITCH_SPLAT.freq, SWITCH_SPLAT.damping, settle, jelly)
}

/** Thumb position (0..1) at progress `t` of a toggle from `from` to `to`. */
export function switchPosition(t: number, from: number, to: number): number {
  const u = clamp(t / SWITCH_TRAVEL, 0, 1)
  return from + (to - from) * travel(u)
}

/**
 * The switch at progress `t` (0..1) of a toggle from position `from` to `to` (0 = unchecked,
 * 1 = checked; `from` may be mid-track when a toggle interrupts another). Pure.
 * At t = 1 the pose is the resting pose for `to`: a round thumb, no bridge, fill full or empty.
 */
export function switchPose(
  t: number,
  from: number,
  to: number,
  geometry: SwitchGeometry,
  feel: SwitchFeel = SWITCH_FEEL.playful,
  effects: SwitchEffects = SWITCH_ALL_EFFECTS,
): SwitchPose {
  const { cy, r, x0, x1, fillR } = switchMetrics(geometry)
  const span = x1 - x0
  const end = switchToggleEnd(feel, effects)
  const tt = clamp(Number.isFinite(t) ? t : end, 0, end)
  const done = tt >= end
  const dist = Math.abs(to - from)
  const dir = to > from ? 1 : to < from ? -1 : to >= 0.5 ? 1 : -1
  const u = clamp(tt / SWITCH_TRAVEL, 0, 1)
  const position = switchPosition(tt, from, to)
  const xTrack = x0 + span * position
  const stretch = Math.max(0, effects.stretch) * feel.stretch
  const squish = Math.max(0, effects.squish) * feel.squish
  const bridge = Math.max(0, effects.bridge) * feel.bridge
  const splat = Math.max(0, effects.splat) * feel.splat
  // How hard it hits: interrupted, short toggles arrive slower.
  const impact = Math.min(1, dist * 1.5)
  // Seconds since the thumb reached the wall (< 0 while travelling).
  const age = (tt - SWITCH_TRAVEL) * feel.duration

  // k: deformation along the travel axis. > 0 stretched (leaning into the move), < 0 squashed.
  const s = travelSpeed(u) * Math.min(1, dist * 1.5)
  const kTravel = stretch * s
  let k: number
  // q: the wall splat (> 0 flattened against the wall, < 0 rebounding off it).
  let q = 0
  if (tt < SWITCH_TRAVEL) k = kTravel
  else if (splat > 0) {
    // Splat replaces the plain squish; squish scales its wobble (one deformation, no double-up).
    k = stretch * travelSpeed(1) * impact * (1 - smooth(age / 0.035))
    q = splat * impact * splatCurve(age, feel.settle, clamp(0.3 + 0.7 * squish, 0, 1.6))
  } else {
    const w = (tt - SWITCH_TRAVEL) / (1 - SWITCH_TRAVEL)
    const kImpact = stretch * travelSpeed(1) * impact
    k = kImpact * (1 - smooth(w / 0.12)) - squish * impact * 0.8 * wobble(w)
    if (tt >= 1) k = 0
  }
  if (done) {
    k = 0
    q = 0
  }
  k = clamp(k, -1.2, 1.6)
  q = clamp(q, -0.6, 1.6)
  const sx = Math.max(0.45, 1 + 0.2 * k - SWITCH_SPLAT.flatten * q)
  const sy = 1 - 0.14 * k + SWITCH_SPLAT.bulge * q
  // A squashed thumb flattens against the far wall: its leading edge stays on the wall. While
  // the splat rebounds it springs back off the wall a little.
  const wallX = xTrack + dir * r
  const headX = xTrack + dir * r * Math.max(0, 1 - sx) + dir * r * SWITCH_SPLAT.rebound * Math.min(0, q)
  const ks = Math.max(0, k)
  const head: SwitchCircle = { x: headX, y: cy, r: r * (1 - 0.08 * ks), sx, sy }

  // Wall corners: two circles tucked into the wall-side corners square off the flattened side.
  const flat = clamp(q / 0.9, 0, 1)
  const rc = r * SWITCH_SPLAT.corner * flat
  const corners: SwitchCircle[] = [-1, 1].map((side) =>
    rc > 0.01
      ? { x: wallX - dir * rc * 1.05, y: cy + side * Math.max(0, r * sy - rc * 1.1), r: rc, sx: 1, sy: 1 }
      : none(wallX, cy),
  )

  // Bridge: the back of the thumb stays stuck at the start while the head leaves, joined by
  // a neck that thins, then snaps; the stub recoils into the start wall and shrinks away.
  // (On a small switch the stub sits under the thumb, so this reads as the back edge holding
  // and then whipping after the head; on wider tracks the neck shows as a real strand.)
  const xs = x0 + span * from
  let anchor = none(xs, cy)
  const necks: SwitchCircle[] = [none(xs, cy), none(xs, cy), none(xs, cy)]
  let bridged = false
  if (bridge > 0 && dist > 0.05 && tt < 1) {
    const snapU = clamp(0.45 + 0.22 * Math.min(bridge, 1.5), 0.3, 0.85)
    const ra = r * (0.8 - 0.3 * u) * Math.min(1, 0.6 + 0.4 * bridge)
    if (u < snapU) {
      bridged = true
      anchor = { x: xs, y: cy, r: ra, sx: 1, sy: 1 }
      const q = u / snapU
      const back = headX - dir * r * sx * 0.6
      const nr = r * 0.42 * (1 - 0.45 * q)
      for (let i = 0; i < 3; i++) {
        const f = (i + 1) / 4
        // Thinnest in the middle, like a real neck.
        necks[i] = { x: xs + (back - xs) * f, y: cy, r: nr * (1 - 0.3 * (1 - Math.abs(2 * f - 1))), sx: 1, sy: 1 }
      }
    } else {
      const v = smooth((u - snapU) / 0.3)
      anchor = { x: xs - dir * r * 0.3 * v, y: cy, r: ra * (1 - v), sx: 1, sy: 1 }
    }
  }

  // Teardrop tail behind the head, in proportion to the stretch (never behind a held bridge).
  const tails: SwitchCircle[] = []
  const d = r * 0.45 * ks
  for (let i = 1; i <= 2; i++) {
    let x = headX - dir * d * i
    if (bridged) x = dir > 0 ? Math.max(x, xs) : Math.min(x, xs)
    tails.push(ks < 0.02 ? none(headX, cy) : { x, y: cy, r: r * (i === 1 ? 0.62 : 0.4), sx: 1, sy: 1 })
  }

  // Fill: from the left end of the track to the thumb, swelling in over the first stretch.
  const fill: SwitchCircle[] = []
  const fr = effects.fill > 0 ? fillR * smooth(position / 0.4) : 0
  const xEnd = x0 + span * position
  for (let i = 0; i < SWITCH_FILL_CIRCLES; i++) {
    const x = x0 + ((xEnd - x0) * i) / (SWITCH_FILL_CIRCLES - 1)
    fill.push(fr > 0.01 ? { x, y: cy, r: fr, sx: 1, sy: 1 } : none(x, cy))
  }

  const drops = splashDrops(age, done, dir, wallX, cy, r, sy, impact, feel, Math.max(0, effects.droplets))

  return { thumb: [head, ...tails, anchor, ...necks, ...corners], fill, drops, position }
}

/** Splash droplets `age` seconds after impact. Each necks off the wall side of the thumb,
 *  flies a parabola (constant outward speed, screen-down gravity) and either lands back in the
 *  goo or shrinks away. All r = 0 outside their flight. */
function splashDrops(
  age: number,
  done: boolean,
  dir: number,
  wallX: number,
  cy: number,
  r: number,
  sy: number,
  impact: number,
  feel: SwitchFeel,
  amount: number,
): SwitchCircle[] {
  const strength = amount * feel.droplets
  const count =
    strength > 0 && impact >= SWITCH_SPLAT.dropMinImpact && !done
      ? Math.min(SWITCH_DROP_CIRCLES, Math.max(2, Math.round(feel.dropCount * Math.min(amount, 1.4))))
      : 0
  // Flight distances grow with the hit, sizes a little; capped so the layer padding holds them.
  const reach = Math.min(1.35, Math.sqrt(strength) * (0.55 + 0.45 * impact))
  const grow = Math.min(1.25, 0.8 + 0.2 * strength)
  const time = feel.settle / 0.6
  const out: SwitchCircle[] = []
  for (let i = 0; i < SWITCH_DROP_CIRCLES; i++) {
    const d = SWITCH_SPLAT.drops[i]!
    const flight = d.flight * time
    const s = (age - d.delay * time) / flight
    if (i >= count || s <= 0 || s >= 1) {
      out.push(none(wallX, cy))
      continue
    }
    const side = d.top ? -1 : 1
    const x0 = wallX - dir * r * 0.4
    const y0 = cy + side * r * sy * 0.62
    const x = x0 + dir * r * d.reach * reach * s
    const y = y0 - 4 * r * d.height * reach * s * (1 - s) + r * d.fall * reach * s * s
    // Neck off (grow out of the thumb), then sink back into the goo or shrink away.
    const fade = d.merge ? 1 - smooth((s - 0.72) / 0.28) : 1 - smooth((s - 0.5) / 0.5)
    const rr = r * d.size * grow * smooth(s / 0.2) * fade
    // Fat and globby: a touch squashed along the flight at launch, round in the air.
    const st = 1 + 0.18 * (1 - smooth(s / 0.35))
    out.push(rr > 0.01 ? { x, y, r: rr, sx: 1 / st, sy: st } : none(wallX, cy))
  }
  return out
}

/** The resting pose (reduced motion, first paint, end of every toggle). */
export function switchStaticPose(
  checked: boolean,
  geometry: SwitchGeometry,
  feel: SwitchFeel = SWITCH_FEEL.playful,
  effects: SwitchEffects = SWITCH_ALL_EFFECTS,
): SwitchPose {
  const p = checked ? 1 : 0
  return switchPose(switchToggleEnd(feel, effects), p, p, geometry, feel, effects)
}

/** Goo filter parameters for a track `height` px tall. */
export function switchGooParams(height: number, feel: SwitchFeel = SWITCH_FEEL.playful): GooFilterParams {
  // Quarter-px steps so switches of similar size share one filter.
  const blur = Math.max(0.5, Math.round(height * feel.softness * 4) / 4)
  return { blur, contrast: 20, threshold: 0.4 }
}

/** Resolve one effect option: true = 1, false = 0, a number = that multiplier. */
export function switchEffectValue(v: boolean | number | undefined): number {
  if (v === undefined || v === true) return 1
  if (v === false) return 0
  return Number.isFinite(v) ? Math.max(0, v) : 1
}

export interface SwitchOptions {
  /** Checked state. Changing it animates the thumb across. */
  checked?: boolean
  /** Toggle speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** Lean and teardrop stretch while travelling. Default true. */
  stretch?: boolean | number
  /** The goo bridge from the start position that snaps behind the thumb. Default true. */
  bridge?: boolean | number
  /** Jelly squash and wobble on landing. Default true. */
  squish?: boolean | number
  /** The checked track fills with goo (primary color). Default true. On/off only: any
   *  number > 0 counts as on. */
  fill?: boolean | number
  /** The thumb keeps its momentum and splats against the end wall, rebounds and wobbles.
   *  Replaces the plain landing squish (`squish` then scales its wobble). Default true. */
  splat?: boolean | number
  /** Fat goo drops splash off the wall on impact and fall back. Default true. */
  droplets?: boolean | number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
}

export interface SwitchHandle {
  /** Patch options in place (`checked` changes animate; renderer changes rebuild). */
  update(opts?: SwitchOptions): void
  /** Re-measure the host (call after its size changes, if ResizeObserver is unavailable). */
  resize(): void
  /** True while a toggle is animating on the shared loop. */
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The pose last drawn. */
  readonly pose: SwitchPose | null
  destroy(): void
}

const effectsOf = (o: SwitchOptions): SwitchEffects => ({
  stretch: switchEffectValue(o.stretch),
  bridge: switchEffectValue(o.bridge),
  squish: switchEffectValue(o.squish),
  fill: switchEffectValue(o.fill) > 0 ? 1 : 0,
  splat: switchEffectValue(o.splat),
  droplets: switchEffectValue(o.droplets),
})

/** Attach a goo thumb and fill to a switch track `host` (the element with role="switch"; it
 *  is made the stacking context for the two aria-hidden goo layers). */
export function attachSwitch(host: HTMLElement, options: SwitchOptions = {}): SwitchHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: SwitchOptions = { ...options }
  let feel = SWITCH_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let geom: SwitchGeometry = { width: 32, height: 18 }
  let params: GooFilterParams = switchGooParams(18, feel)
  let fillLayer: GoopRenderer | null = null
  let thumbLayer: GoopRenderer | null = null
  let fillBlobs: GoopBlob[] = []
  let thumbBlobs: GoopBlob[] = []
  let to = opts.checked ? 1 : 0
  let from = to
  let t = switchToggleEnd(feel, effects)
  let last: SwitchPose | null = null
  let destroyed = false

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const measure = (): SwitchGeometry => {
    const w = host.offsetWidth || host.clientWidth
    const h = host.offsetHeight || host.clientHeight
    return w > 0 && h > 0 ? { width: w, height: h } : { width: 32, height: 18 }
  }
  const padding = () => {
    // Droplets fly up to ~2.5 thumb radii above / beside the track (wild at 2x).
    const room = effects.droplets > 0 ? 2.6 : 0.3
    const p = Math.ceil(params.blur * 3 + switchMetrics(geom).r * room)
    return { side: p, bottom: p }
  }

  const drawSet = (blobs: GoopBlob[], circles: SwitchCircle[]): void => {
    for (let i = 0; i < blobs.length; i++) {
      const c = circles[i]
      if (c) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
    }
  }
  const draw = (): void => {
    if (!fillLayer || !thumbLayer) return
    last = reduced ? switchStaticPose(to === 1, geom, feel, effects) : switchPose(t, from, to, geom, feel, effects)
    drawSet(fillBlobs, [...last.fill, ...last.drops])
    drawSet(thumbBlobs, last.thumb)
    fillLayer.flush()
    thumbLayer.flush()
  }

  const teardown = (): void => {
    for (const b of [...fillBlobs, ...thumbBlobs]) b.remove()
    fillBlobs = []
    thumbBlobs = []
    fillLayer?.destroy()
    thumbLayer?.destroy()
    fillLayer = null
    thumbLayer = null
  }

  const build = (): void => {
    teardown()
    geom = measure()
    params = switchGooParams(geom.height, feel)
    const make = resolveRenderer(opts.renderer)
    // Fill first so the thumb layer stacks above it (both z-index -1, tree order decides).
    fillLayer = make(host, params)
    thumbLayer = make(host, params)
    fillLayer.layer.style.setProperty('--goop-color', `var(${SWITCH_FILL_COLOR_VAR}, var(--primary, currentColor))`)
    thumbLayer.layer.style.setProperty('--goop-color', `var(${SWITCH_THUMB_COLOR_VAR}, var(--background, #fff))`)
    fillLayer.layer.setAttribute('data-goop-switch', 'fill')
    thumbLayer.layer.setAttribute('data-goop-switch', 'thumb')
    for (const r of [fillLayer, thumbLayer]) {
      r.setBodyScale(0, 0)
      r.setPadding(padding())
    }
    fillBlobs = Array.from({ length: SWITCH_FILL_CIRCLES + SWITCH_DROP_CIRCLES }, () => fillLayer!.createBlob())
    thumbBlobs = Array.from({ length: SWITCH_THUMB_CIRCLES }, () => thumbLayer!.createBlob())
    draw()
  }

  const resize = (): void => {
    if (destroyed || !fillLayer || !thumbLayer) return
    const next = measure()
    if (next.width === geom.width && next.height === geom.height) return
    geom = next
    const p = switchGooParams(geom.height, feel)
    if (p.blur !== params.blur) {
      params = p
      fillLayer.setParams(p)
      thumbLayer.setParams(p)
    }
    fillLayer.setPadding(padding())
    thumbLayer.setPadding(padding())
    draw()
  }

  const end = (): number => switchToggleEnd(feel, effects)
  const shouldRun = (): boolean => !destroyed && !reduced && t < end()
  const tick: Ticker = (dt) => {
    if (!shouldRun()) return false
    t = Math.min(end(), t + (dt * Math.max(0.05, opts.speed ?? 1)) / feel.duration)
    draw()
    return t < end()
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const setChecked = (checked: boolean): void => {
    const next = checked ? 1 : 0
    if (next === to) return
    // Interrupting a toggle starts the new one from wherever the thumb is now.
    from = reduced ? next : (last?.position ?? to)
    to = next
    t = reduced ? end() : 0
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  build()

  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      from = to
      t = end()
    }
    draw()
    sync()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = SWITCH_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      // Turning splat/droplets off can shorten the toggle under a running t.
      t = Math.min(t, end())
      reduced = readReduced()
      if (reduced) {
        from = to
        t = end()
      }
      if ('checked' in next) setChecked(!!next.checked)
      if (rebuild) build()
      else {
        fillLayer?.setPadding(padding())
        thumbLayer?.setPadding(padding())
        draw()
      }
      sync()
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
      unwatch()
      teardown()
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

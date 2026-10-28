// Goo radio group: the selected dot is a goo blob that jumps to the newly selected item.
//
// One goo layer on the group root (primary color) holds the blob. Selecting another item:
//   travel (t < RADIO_TRAVEL): the blob stretches out of the old item toward the new one on a
//     fat goo bridge (shared `gooBridge`) that snaps; it flies (a small hop on sideways jumps),
//     stretched along its flight with a teardrop tail.
//   landing: it splats onto the new item (flat along the flight, bulging across; shared
//     `splatCurve`), rebounds and wobbles, and throws a few droplets (shared `splashDrops`).
//   The real indicator dot (unfiltered, as shadcn renders it) is hidden via the root's
//   `data-goop-pending` until the splat has mostly settled.
// Works in any direction (vertical, horizontal, grid), so keyboard selection animates too.
// Each frame is a pure function of progress (`radioPose`). Coordinates are the root's padding
// box. No DOM access until `attachRadioGroup` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { createGooToggle, type GooToggleRunner } from './goo-toggle'
import type { GoopRendererOption } from './renderers/resolve'
import {
  GOO_BRIDGE_NECKS,
  GOO_SPLAT,
  GOO_SPLASH_MAX,
  gooBridge,
  gooEffectValue,
  noCircle,
  smooth01,
  splashDrops,
  splatAxes,
  splatCurve,
  splatToggleEnd,
  type GooCircle,
} from './splat'
import { readPreset } from './tuning'

/** Fraction of a jump spent travelling; the rest is the landing. */
export const RADIO_TRAVEL = 0.55
/** Circles drawn: head, 2 tail, bridge anchor + necks, splash droplets. */
export const RADIO_CIRCLES = 3 + 1 + GOO_BRIDGE_NECKS + GOO_SPLASH_MAX
/** CSS var the goo paints with. */
export const RADIO_COLOR_VAR = '--goop-radio-fill'

export interface RadioFeel {
  /** Seconds per jump at speed 1 (travel + landing). */
  duration: number
  /** Stretch along the flight. */
  stretch: number
  /** How long the bridge holds before it snaps. */
  bridge: number
  /** Splat strength on landing. */
  splat: number
  /** Seconds from impact until the splat and droplets settle. */
  settle: number
  /** Splash droplet strength. */
  droplets: number
  /** Droplets per landing at strength 1 (2..4). */
  dropCount: number
  /** Sideways hop height, in flight lengths. */
  hop: number
  /** Goo blur as a fraction of the item size. */
  softness: number
}

export const RADIO_FEEL: Readonly<Record<GoopPreset, Readonly<RadioFeel>>> = Object.freeze({
  subtle: Object.freeze({ duration: 0.42, stretch: 0.6, bridge: 0.6, splat: 0.6, settle: 0.45, droplets: 0.7, dropCount: 2, hop: 0.08, softness: 0.08 }),
  playful: Object.freeze({ duration: 0.52, stretch: 1, bridge: 1, splat: 1, settle: 0.55, droplets: 1, dropCount: 3, hop: 0.14, softness: 0.085 }),
  wild: Object.freeze({ duration: 0.66, stretch: 1.4, bridge: 1.3, splat: 1.4, settle: 0.65, droplets: 1.25, dropCount: 4, hop: 0.22, softness: 0.09 }),
})

/** Individually toggleable effects (boolean or multiplier). */
export const RADIO_EFFECTS = ['bridge', 'splat', 'droplets'] as const
export type RadioEffect = (typeof RADIO_EFFECTS)[number]
export type RadioEffects = Record<RadioEffect, number>
export const RADIO_ALL_EFFECTS: Readonly<RadioEffects> = Object.freeze({ bridge: 1, splat: 1, droplets: 1 })

/** A point in the root's padding box. */
export interface RadioPoint {
  x: number
  y: number
}

export interface RadioPose {
  /** RADIO_CIRCLES circles: head, tail x2, anchor, necks, droplets. */
  circles: GooCircle[]
  /** Where the blob is now (its center), or null when nothing is selected. */
  at: RadioPoint | null
  /** True while the real indicator dot should stay hidden. */
  pending: boolean
}

const travel = (u: number): number => u * u * (2 - u)
const travelSpeed = (u: number): number => Math.max(0, Math.min(1, (4 * u - 3 * u * u) * 0.75))

/** Progress at which a jump has settled. */
export function radioToggleEnd(feel: RadioFeel = RADIO_FEEL.playful, effects: RadioEffects = RADIO_ALL_EFFECTS): number {
  const splats = (effects.splat > 0 && feel.splat > 0) || (effects.droplets > 0 && feel.droplets > 0)
  return splatToggleEnd(RADIO_TRAVEL, feel.settle, feel.duration, splats)
}

/**
 * The blob at progress `t` of a jump from `from` to `to` (item centers; null = no selection).
 * `r` is the item radius. `bridged`: the jump starts from a resting item (not mid-flight), so
 * the bridge can hold on to it. Pure; at the end it is the resting pose on `to`.
 */
export function radioPose(
  t: number,
  from: RadioPoint | null,
  to: RadioPoint | null,
  r: number,
  feel: RadioFeel = RADIO_FEEL.playful,
  effects: RadioEffects = RADIO_ALL_EFFECTS,
  bridged = true,
): RadioPose {
  const end = radioToggleEnd(feel, effects)
  const tt = Math.max(0, Math.min(end, Number.isFinite(t) ? t : end))
  const done = tt >= end
  const park = to ?? from ?? { x: 0, y: 0 }
  const tails = [noCircle(park.x, park.y), noCircle(park.x, park.y)]
  let anchor = noCircle(park.x, park.y)
  let necks: GooCircle[] = Array.from({ length: GOO_BRIDGE_NECKS }, () => noCircle(park.x, park.y))
  let drops: GooCircle[] = Array.from({ length: GOO_SPLASH_MAX }, () => noCircle(park.x, park.y))
  const splat = Math.max(0, effects.splat) * feel.splat
  const amount = Math.max(0, effects.droplets)
  const pack = (head: GooCircle, at: RadioPoint | null, pending: boolean): RadioPose => ({
    circles: [head, ...tails, anchor, ...necks, ...drops],
    at,
    pending,
  })

  if (!to) {
    // Deselected: the blob shrinks away.
    if (!from || done) return pack(noCircle(park.x, park.y), null, false)
    const k = 1 - smooth01(tt / 0.3)
    return pack({ x: from.x, y: from.y, r: r * k, sx: 1, sy: 1 }, k > 0 ? from : null, false)
  }
  if (done) return pack({ x: to.x, y: to.y, r, sx: 1, sy: 1 }, to, false)

  const dx = from ? to.x - from.x : 0
  const dy = from ? to.y - from.y : 0
  const len = Math.hypot(dx, dy)
  if (!from || len < 0.5) {
    // First selection (or the same spot): the blob plops in and splats.
    const age = tt * feel.duration
    const q = splat * splatCurve(age, feel.settle, 1)
    const ax = splatAxes(q)
    const grow = smooth01(age / 0.09)
    const head = { x: to.x, y: to.y + r * (1 - ax.along) * 0.5, r: r * grow, sx: ax.across, sy: ax.along }
    return pack(head, to, age < feel.settle * 0.5)
  }

  const nx = dx / len
  const ny = dy / len
  const impact = Math.min(1, len / (3 * r))
  const u = Math.min(1, tt / RADIO_TRAVEL)
  const age = (tt - RADIO_TRAVEL) * feel.duration
  let k: number
  let q = 0
  if (tt < RADIO_TRAVEL) k = feel.stretch * travelSpeed(u) * impact
  else {
    k = feel.stretch * travelSpeed(1) * impact * (1 - smooth01(age / 0.035))
    q = splat * impact * splatCurve(age, feel.settle, 1)
  }
  k = Math.max(-1.2, Math.min(1.6, k))
  q = Math.max(-0.6, Math.min(1.6, q))
  // Stretch along the flight / splat flat along it; axis-aligned blend of the two directions.
  const ax = splatAxes(q)
  const along = Math.max(0.45, ax.along + 0.25 * k)
  const across = ax.across - 0.14 * k
  const sx = along * nx * nx + across * ny * ny
  const sy = along * ny * ny + across * nx * nx

  const p = travel(u)
  // A small hop on sideways jumps.
  const hop = Math.sin(Math.PI * u) * len * feel.hop * Math.abs(nx)
  const ks = Math.max(0, k)
  const lead = r * Math.max(0, 1 - along) + r * GOO_SPLAT.rebound * Math.min(0, q)
  const hx = from!.x + dx * p + nx * lead
  const hy = from!.y + dy * p - hop + ny * lead
  const head: GooCircle = { x: hx, y: hy, r: r * (1 - 0.08 * ks), sx, sy }

  let held = false
  const bridge = Math.max(0, effects.bridge) * feel.bridge
  if (bridged && bridge > 0 && tt < 1) {
    const back = { x: hx - nx * r * along * 0.6, y: hy - ny * r * along * 0.6 }
    const b = gooBridge(u, from!, back, { x: nx, y: ny }, r, bridge, 1.35)
    anchor = b.anchor
    necks = b.necks
    held = b.held
  }
  const d = r * 0.45 * ks
  if (ks >= 0.02) {
    for (let i = 0; i < 2; i++) {
      let tx = hx - nx * d * (i + 1)
      let ty = hy - ny * d * (i + 1)
      // Never behind a held bridge's anchor.
      if (held && (tx - from!.x) * nx + (ty - from!.y) * ny < 0) {
        tx = from!.x
        ty = from!.y
      }
      tails[i] = { x: tx, y: ty, r: r * (i === 0 ? 0.62 : 0.4), sx: 1, sy: 1 }
    }
  }
  if (age >= 0) {
    const perp = { x: -ny, y: nx }
    const frame = {
      x: to.x + nx * r * 0.6,
      y: to.y + ny * r * 0.6,
      r,
      tx: perp.x * r * 0.62,
      ty: perp.y * r * 0.62,
      out: () => [nx, ny] as const,
    }
    drops = splashDrops(age, done, frame, impact, feel, amount)
  }
  return pack(head, { x: hx, y: hy }, tt < RADIO_TRAVEL || age < feel.settle * 0.5)
}

/** Goo filter parameters for items `size` px across. */
export function radioGooParams(size: number, feel: RadioFeel = RADIO_FEEL.playful): GooFilterParams {
  return { blur: Math.max(0.5, Math.round(size * feel.softness * 4) / 4), contrast: 20, threshold: 0.4 }
}

export interface RadioGroupOptions {
  /** The selected value. Any change re-reads the checked item from the DOM and jumps there. */
  value?: unknown
  /** Selector for the items inside the root. Default `[role="radio"]`. */
  item?: string
  /** Animation speed multiplier. Default 1. */
  speed?: number
  preset?: GoopPreset
  renderer?: GoopRendererOption
  /** The fat goo bridge out of the old item that snaps. Default true. */
  bridge?: boolean | number
  /** Splat and wobble on landing. Default true. */
  splat?: boolean | number
  /** A few droplets splash out on landing. Default true. */
  droplets?: boolean | number
  reducedMotion?: boolean | 'auto'
}

export interface RadioGroupHandle {
  update(opts?: RadioGroupOptions): void
  /** Re-measure the items (call after layout changes if ResizeObserver can't see them). */
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  readonly pose: RadioPose | null
  destroy(): void
}

const effectsOf = (o: RadioGroupOptions): RadioEffects => ({
  bridge: gooEffectValue(o.bridge),
  splat: gooEffectValue(o.splat),
  droplets: gooEffectValue(o.droplets),
})

const isChecked = (el: Element): boolean =>
  el.getAttribute('aria-checked') === 'true' || el.getAttribute('data-state') === 'checked'

/** Attach the jumping goo blob to a radio group root `host`. */
export function attachRadioGroup(host: HTMLElement, options: RadioGroupOptions = {}): RadioGroupHandle {
  let opts: RadioGroupOptions = { ...options }
  let feel = RADIO_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let r = 8
  let toEl: Element | null = null
  let to: RadioPoint | null = null
  let from: RadioPoint | null = null
  let bridged = true
  let last: RadioPose | null = null
  let runner: GooToggleRunner | null = null

  const items = (): Element[] => Array.from(host.querySelectorAll(opts.item ?? '[role="radio"]'))
  const centerOf = (el: Element): RadioPoint => {
    const hr = host.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    return {
      x: er.left - hr.left - host.clientLeft + er.width / 2,
      y: er.top - hr.top - host.clientTop + er.height / 2,
    }
  }
  const measureR = (): void => {
    const el = toEl ?? items()[0]
    const er = el?.getBoundingClientRect()
    if (er && er.width > 0) r = Math.min(er.width, er.height) / 2
  }
  toEl = items().find(isChecked) ?? null
  to = toEl ? centerOf(toEl) : null
  from = to

  const end = (): number => radioToggleEnd(feel, effects)
  const rt = createGooToggle(host, {
    color: `var(${RADIO_COLOR_VAR}, var(--primary, currentColor))`,
    part: 'radio',
    circles: RADIO_CIRCLES,
    layout() {
      measureR()
      if (toEl) to = centerOf(toEl)
      if (!runner || runner.t >= end()) from = to
      const params = radioGooParams(r * 2, feel)
      const p = Math.ceil(params.blur * 3 + r * 3.2)
      return { params, padding: { side: p, bottom: p } }
    },
    frame(t, reduced) {
      last = reduced
        ? radioPose(end(), to, to, r, feel, effects)
        : radioPose(t, from, to, r, feel, effects, bridged)
      return { circles: last.circles, body: null, pending: last.pending }
    },
    end,
    duration: () => feel.duration,
    speed: () => opts.speed ?? 1,
    renderer: () => opts.renderer,
    reducedMotion: () => opts.reducedMotion,
  })
  runner = rt

  const select = (): void => {
    const next = items().find(isChecked) ?? null
    if (next === toEl) return
    // Interrupting a jump starts the next one from wherever the blob is now (no bridge).
    const moving = rt.t < end()
    from = moving ? (last?.at ?? to) : to
    bridged = !moving
    toEl = next
    measureR()
    to = next ? centerOf(next) : null
    rt.restart()
  }

  return {
    update(next = {}) {
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = RADIO_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      if (rebuild) rt.rebuild()
      else rt.refresh()
      select()
    },
    resize: () => rt.resize(),
    get running() {
      return rt.running
    },
    get reducedMotion() {
      return rt.reduced
    },
    get pose() {
      return last
    },
    destroy: () => rt.destroy(),
  }
}

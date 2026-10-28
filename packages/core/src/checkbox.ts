// Goo checkbox: checking drops goo into the box.
//
// One goo layer on the box (primary color): its body is a goo copy of the box itself (the
// fill), plus circles for the falling drop, its tail, the suck-up neck, the indeterminate bar
// and the splash droplets. Each frame is a pure function of the toggle progress
// (`checkboxPose`), so reduced motion, first paint and every frame agree.
//
//   off -> on: a drop falls from above (accelerating, stretched along the fall, a short tail)
//     and lands in the box. On impact the fill swells out of it and splats against the floor
//     (flat and wide, rebound, damped wobble; shared `splatCurve`), a few droplets splash out
//     sideways (shared `splashDrops`). The real check mark (an unfiltered icon) is hidden via
//     the host's `data-goop-pending` until the splat has mostly settled.
//   on -> off: the fill sucks up into a drop above the box on a neck (shared `gooBridge`)
//     that snaps; the drop swells and pops into specks.
//   -> indeterminate: a goo bar stretches out across the middle and wobbles (from checked the
//     fill drains into it). The bar replaces the mark.
//
// Coordinates are the host's padding box (the goo layer's origin). No DOM access until
// `attachCheckbox` is called (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { createGooToggle, type GooToggleRunner } from './goo-toggle'
import type { GoopBodyTransform } from './renderer'
import type { GoopRendererOption } from './renderers/resolve'
import {
  GOO_BRIDGE_NECKS,
  GOO_SPLASH_MAX,
  gooBridge,
  gooEffectValue,
  splashDrops,
  splatAxes,
  splatCurve,
  splatToggleEnd,
} from './splat'
import { noCircle, smooth01, type GooCircle } from './liquid'
import { readPreset } from './tuning'

/** Checkbox state: checked, unchecked or indeterminate (reka's `'indeterminate'`). */
export type CheckboxState = boolean | 'indeterminate'
type Mode = 'off' | 'on' | 'mixed'

/** Toggle progress at which the falling drop hits the box. */
export const CHECKBOX_FALL = 0.38
/** Toggle progress the uncheck suck-up takes (the pop follows). */
export const CHECKBOX_SUCK = 0.5
/** Circles in the bar. */
export const CHECKBOX_BAR_CIRCLES = 5
/** Every circle drawn: drop, 2 tail, bridge anchor + necks, bar, splash droplets. */
export const CHECKBOX_CIRCLES = 3 + 1 + GOO_BRIDGE_NECKS + CHECKBOX_BAR_CIRCLES + GOO_SPLASH_MAX
/** CSS var the goo paints with (set it on the host or an ancestor). */
export const CHECKBOX_COLOR_VAR = '--goop-checkbox-fill'

export interface CheckboxFeel {
  /** Seconds per unit of toggle progress (fall + landing). */
  duration: number
  /** Drop start height above the box center, in box sizes. */
  fall: number
  /** Drop radius as a fraction of the box size. */
  drop: number
  /** Teardrop stretch while falling. */
  stretch: number
  /** Splat strength on landing (0 = none). */
  splat: number
  /** Seconds from impact until the splat and droplets have settled. */
  settle: number
  /** Splash droplet strength. */
  droplets: number
  /** Droplets per impact at strength 1 (2..4). */
  dropCount: number
  /** Goo blur as a fraction of the box size. */
  softness: number
}

export const CHECKBOX_FEEL: Readonly<Record<GoopPreset, Readonly<CheckboxFeel>>> = Object.freeze({
  subtle: Object.freeze({ duration: 0.42, fall: 1.1, drop: 0.36, stretch: 0.6, splat: 0.6, settle: 0.45, droplets: 0.7, dropCount: 2, softness: 0.08 }),
  playful: Object.freeze({ duration: 0.5, fall: 1.6, drop: 0.4, stretch: 1, splat: 1, settle: 0.55, droplets: 1, dropCount: 3, softness: 0.085 }),
  wild: Object.freeze({ duration: 0.6, fall: 2.2, drop: 0.44, stretch: 1.4, splat: 1.4, settle: 0.65, droplets: 1.25, dropCount: 4, softness: 0.09 }),
})

/** Individually toggleable effects (boolean or multiplier; `fill` is on/off). */
export const CHECKBOX_EFFECTS = ['fill', 'splat', 'droplets'] as const
export type CheckboxEffect = (typeof CHECKBOX_EFFECTS)[number]
export type CheckboxEffects = Record<CheckboxEffect, number>
export const CHECKBOX_ALL_EFFECTS: Readonly<CheckboxEffects> = Object.freeze({ fill: 1, splat: 1, droplets: 1 })

export interface CheckboxGeometry {
  /** Box padding-box size, px. */
  width: number
  height: number
}

export interface CheckboxPose {
  /** CHECKBOX_CIRCLES circles: drop, tail x2, anchor, necks, bar, droplets. */
  circles: GooCircle[]
  /** The fill (a goo copy of the box), or null when empty. */
  body: GoopBodyTransform | null
  /** True while the real check mark should stay hidden. */
  pending: boolean
  /** How full the box is, 0..1 (a body scale; > 0 during the splat overshoot). */
  fill: number
}

const modeOf = (s: CheckboxState | undefined): Mode => (s === 'indeterminate' ? 'mixed' : s ? 'on' : 'off')

/** Progress at which a toggle into `to` has settled. */
export function checkboxToggleEnd(
  to: CheckboxState,
  feel: CheckboxFeel = CHECKBOX_FEEL.playful,
  effects: CheckboxEffects = CHECKBOX_ALL_EFFECTS,
): number {
  const splats = (effects.splat > 0 && feel.splat > 0) || (effects.droplets > 0 && feel.droplets > 0)
  const m = modeOf(to)
  if (m === 'off') return 1
  return splatToggleEnd(m === 'on' ? CHECKBOX_FALL : 0.28, feel.settle, feel.duration, splats)
}

/** The checkbox at progress `t` of a toggle from state `from` to `to`. Pure. At the end of the
 *  toggle it is the resting pose for `to`. */
export function checkboxPose(
  t: number,
  from: CheckboxState,
  to: CheckboxState,
  geometry: CheckboxGeometry,
  feel: CheckboxFeel = CHECKBOX_FEEL.playful,
  effects: CheckboxEffects = CHECKBOX_ALL_EFFECTS,
): CheckboxPose {
  const w = Math.max(1, geometry.width)
  const h = Math.max(1, geometry.height)
  const s = Math.min(w, h)
  const cx = w / 2
  const cy = h / 2
  const end = checkboxToggleEnd(to, feel, effects)
  const tt = Math.max(0, Math.min(end, Number.isFinite(t) ? t : end))
  const done = tt >= end
  const a = modeOf(from)
  const b = modeOf(to)
  const fillOn = effects.fill > 0
  const splat = Math.max(0, effects.splat) * feel.splat
  const amount = Math.max(0, effects.droplets)
  const rd = s * feel.drop

  let drop = noCircle(cx, cy)
  const tails = [noCircle(cx, cy), noCircle(cx, cy)]
  let anchor = noCircle(cx, cy)
  let necks: GooCircle[] = Array.from({ length: GOO_BRIDGE_NECKS }, () => noCircle(cx, cy))
  let bar: GooCircle[] = Array.from({ length: CHECKBOX_BAR_CIRCLES }, () => noCircle(cx, cy))
  let drops: GooCircle[] = Array.from({ length: GOO_SPLASH_MAX }, () => noCircle(cx, cy))
  let fill = 0
  let fsx = 1
  let fsy = 1
  let fty = 0
  let pending = false

  const barAt = (len: number, thick: number): GooCircle[] =>
    Array.from({ length: CHECKBOX_BAR_CIRCLES }, (_, i) => {
      const f = i / (CHECKBOX_BAR_CIRCLES - 1) - 0.5
      const r = s * 0.15 * thick
      return r > 0.01 && len > 0.001 ? { x: cx + f * 2 * s * 0.27 * len, y: cy, r, sx: 1, sy: 1 } : noCircle(cx, cy)
    })

  if (b === 'on' && (a === 'on' || done)) {
    fill = 1
  } else if (b === 'on') {
    // The bar (from indeterminate) drains away while the drop falls.
    if (a === 'mixed') {
      const k = 1 - smooth01(tt / 0.25)
      bar = barAt(k, k)
    }
    if (tt < CHECKBOX_FALL) {
      // Falling: accelerating, grown in at the top, stretched along the fall with a tail.
      const u = tt / CHECKBOX_FALL
      const y = cy - s * feel.fall * (1 - u * u)
      const grow = smooth01(u / 0.18)
      const st = 1 + 0.32 * feel.stretch * u
      drop = { x: cx, y, r: rd * grow, sx: 1 / Math.sqrt(st), sy: st }
      const ks = feel.stretch * u
      if (ks > 0.05) {
        for (let i = 0; i < 2; i++) {
          tails[i] = { x: cx, y: y - rd * st * (0.55 + 0.5 * i) * Math.min(1, ks), r: rd * grow * (i === 0 ? 0.6 : 0.36), sx: 1, sy: 1 }
        }
      }
    } else {
      const age = (tt - CHECKBOX_FALL) * feel.duration
      const q = done ? 0 : splat * splatCurve(age, feel.settle, 1)
      const ax = splatAxes(q)
      if (fillOn) {
        // The fill swells out of the landed drop, squashed onto the floor of the box.
        const g0 = Math.min(1, (2 * rd) / s)
        fill = g0 + (1 - g0) * smooth01(age / 0.1)
        fsx = fill * ax.across
        fsy = fill * ax.along
        fty = (h / 2) * (1 - fsy)
        // The drop sinks into it.
        const k = 1 - smooth01(age / 0.08)
        drop = { x: cx, y: cy + (h / 2 - rd) * (1 - k) * 0.5, r: rd * k, sx: ax.across, sy: ax.along }
      } else if (!done) {
        // No fill: the drop splats on the (primary) box and melts into it.
        const k = 1 - smooth01((age - feel.settle * 0.4) / (feel.settle * 0.5))
        drop = { x: cx, y: cy + rd * (1 - ax.along), r: rd * k, sx: ax.across, sy: ax.along }
      }
      const frame = { x: cx, y: cy - h * 0.3, r: rd, tx: s * 0.28, ty: 0, out: (side: -1 | 1) => [side, 0] as const }
      drops = splashDrops(age, done, frame, 1, feel, amount)
      pending = !done && age < feel.settle * 0.55
    }
    if (tt < CHECKBOX_FALL) pending = true
  } else if (b === 'off' && a !== 'off' && !done) {
    if (a === 'on') {
      // Suck up: the fill drains up into a drop on a neck that snaps, then the drop pops.
      const u = Math.min(1, tt / CHECKBOX_SUCK)
      const e = smooth01(u)
      fill = fillOn ? 1 - e : 0
      fsx = fill
      fsy = fill
      fty = -h * 0.18 * e
      const dy = cy - s * 0.95 * smooth01(u / 0.8)
      if (tt < CHECKBOX_SUCK) {
        const st = 1 + 0.25 * Math.sin(Math.PI * u)
        drop = { x: cx, y: dy, r: rd * smooth01(u / 0.5), sx: 1 / st, sy: st }
        const br = gooBridge(u, { x: cx, y: cy }, { x: cx, y: dy + rd * 0.6 }, { x: 0, y: -1 }, rd, 1, 1.1)
        anchor = br.anchor
        necks = br.necks
      } else {
        const p = (tt - CHECKBOX_SUCK) / (1 - CHECKBOX_SUCK)
        const swell = p < 0.3 ? 1 + 0.3 * smooth01(p / 0.3) : 1.3 * (1 - smooth01((p - 0.3) / 0.3))
        drop = { x: cx, y: dy, r: rd * swell, sx: 1, sy: 1 }
        const frame = { x: cx, y: dy, r: rd, tx: rd * 0.5, ty: 0, out: (side: -1 | 1) => [side * 0.8, -0.6] as const }
        drops = splashDrops((p - 0.25) * (1 - CHECKBOX_SUCK) * feel.duration * 2, false, frame, 0.8, feel, amount * 0.7)
      }
    } else {
      // Indeterminate -> off: the bar pulls into the middle and pops.
      const u = Math.min(1, tt / 0.45)
      const k = 1 - smooth01(u)
      const swell = u < 0.5 ? 1 + 0.4 * smooth01(u / 0.5) : 1.4 * (1 - smooth01((u - 0.5) / 0.5))
      bar = barAt(k, swell)
    }
  } else if (b === 'mixed') {
    // A goo bar stretches out across the middle and wobbles; a full box drains into it.
    if (a === 'on' && !done) {
      fill = fillOn ? 1 - smooth01(tt / 0.35) : 0
      fsx = fill
      fsy = fill
    }
    const grow = a === 'mixed' || done ? 1 : smooth01(tt / 0.28)
    const age = (tt - 0.28) * feel.duration
    const q = a === 'mixed' || done ? 0 : splat * splatCurve(age, feel.settle, 1)
    bar = barAt(grow * (1 + 0.35 * q), 1 - 0.25 * q)
    pending = true
  }

  const body: GoopBodyTransform | null =
    fillOn && fill > 0.005 ? { tx: 0, ty: fty, skew: 0, sx: fsx, sy: fsy } : null
  return { circles: [drop, ...tails, anchor, ...necks, ...bar, ...drops], body, pending, fill: fillOn ? fill : 0 }
}

/** The resting pose (reduced motion, first paint, end of every toggle). */
export function checkboxStaticPose(
  state: CheckboxState,
  geometry: CheckboxGeometry,
  feel: CheckboxFeel = CHECKBOX_FEEL.playful,
  effects: CheckboxEffects = CHECKBOX_ALL_EFFECTS,
): CheckboxPose {
  return checkboxPose(checkboxToggleEnd(state, feel, effects), state, state, geometry, feel, effects)
}

/** Goo filter parameters for a box `size` px across. */
export function checkboxGooParams(size: number, feel: CheckboxFeel = CHECKBOX_FEEL.playful): GooFilterParams {
  return { blur: Math.max(0.5, Math.round(size * feel.softness * 4) / 4), contrast: 20, threshold: 0.4 }
}

export interface CheckboxOptions {
  /** Checked state (`'indeterminate'` draws the goo bar). Changes animate. */
  checked?: CheckboxState
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** The landed drop fills the box with goo. Default true. On/off only. */
  fill?: boolean | number
  /** The drop splats on landing (flatten, rebound, wobble). Default true. */
  splat?: boolean | number
  /** A few tiny drops splash out on landing. Default true. */
  droplets?: boolean | number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface CheckboxHandle {
  update(opts?: CheckboxOptions): void
  resize(): void
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The pose last drawn. */
  readonly pose: CheckboxPose | null
  destroy(): void
}

const effectsOf = (o: CheckboxOptions): CheckboxEffects => ({
  fill: gooEffectValue(o.fill) > 0 ? 1 : 0,
  splat: gooEffectValue(o.splat),
  droplets: gooEffectValue(o.droplets),
})

/** Attach goo to a checkbox box `host` (the element with role="checkbox"). */
export function attachCheckbox(host: HTMLElement, options: CheckboxOptions = {}): CheckboxHandle {
  let opts: CheckboxOptions = { ...options }
  let feel = CHECKBOX_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  let to: CheckboxState = opts.checked ?? false
  let from: CheckboxState = to
  let geom: CheckboxGeometry = { width: 14, height: 14 }
  let last: CheckboxPose | null = null

  const measure = (): CheckboxGeometry => {
    const w = host.clientWidth || host.offsetWidth
    const h = host.clientHeight || host.offsetHeight
    return w > 0 && h > 0 ? { width: w, height: h } : { width: 14, height: 14 }
  }
  const end = (): number => checkboxToggleEnd(to, feel, effects)

  const runner: GooToggleRunner = createGooToggle(host, {
    color: `var(${CHECKBOX_COLOR_VAR}, var(--primary, currentColor))`,
    part: 'checkbox',
    circles: CHECKBOX_CIRCLES,
    layout() {
      geom = measure()
      const s = Math.min(geom.width, geom.height)
      const params = checkboxGooParams(s, feel)
      // Room for the drop falling in from above and the splash.
      const p = Math.ceil(params.blur * 3 + s * (feel.fall + feel.drop * 1.6))
      return { params, padding: { side: p, bottom: Math.ceil(params.blur * 3 + s) } }
    },
    frame(t, reduced) {
      last = reduced ? checkboxStaticPose(to, geom, feel, effects) : checkboxPose(t, from, to, geom, feel, effects)
      return last
    },
    end,
    duration: () => feel.duration,
    speed: () => opts.speed ?? 1,
    renderer: () => opts.renderer,
    reducedMotion: () => opts.reducedMotion,
  })

  return {
    update(next = {}) {
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = CHECKBOX_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      const state = opts.checked ?? false
      if ('checked' in next && state !== to) {
        // Interrupted past the halfway mark: start from where it was heading.
        from = runner.t >= end() / 2 ? to : from
        to = state
        if (rebuild) runner.rebuild()
        runner.restart()
        return
      }
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
    destroy: () => runner.destroy(),
  }
}

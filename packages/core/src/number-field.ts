// Goo for number fields (GoopNumberField): the Input's goo focus ring, plus goo +/- steppers.
//
// Two aria-hidden goo layers on a HOST that wraps the field and its +/- buttons:
//   ring: core's `attachInput` focus ring around the field (flow, close, ripple, wobble, drain,
//     invalid drip). A press on a +/- button focuses the field, and the ring flows in from
//     that button's side.
//   steppers: a soft goo dollop under each +/- button.
//     squish: pressing a button swells the dollop out of the icon, flattened wide (low and
//       wide, never a knob), and letting go springs it back with a small jelly wobble as it
//       shrinks away.
//     nudge: every value change (button, hold-repeat, arrow keys) shoves the dollop outward,
//       toward the side that was pressed, stretching it into a short drop that settles back,
//       and sends a ripple along the ring from that side.
//
// The stepper pose is a pure function of `StepperState` (`stepperPose`), so reduced motion
// (a static dollop while pressed, no squish or nudge) and every frame agree. No DOM access
// until `attachNumberField` (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { attachInput, INPUT_EFFECTS, type InputHandle, type InputOptions } from './input'
import { decayWobble, noCircle, smooth01, type GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** The stepper's own effects (the ring's come from INPUT_EFFECTS). */
export const STEPPER_EFFECTS = ['squish', 'nudge'] as const
export type StepperEffect = (typeof STEPPER_EFFECTS)[number]
/** Every toggle of a number field: the ring's, then the steppers'. */
export const NUMBER_FIELD_EFFECTS = [...INPUT_EFFECTS, ...STEPPER_EFFECTS] as const
export type NumberFieldEffect = (typeof NUMBER_FIELD_EFFECTS)[number]
export type StepperEffects = Record<StepperEffect, number>
export const STEPPER_DEFAULT_EFFECTS: Readonly<StepperEffects> = Object.freeze({ squish: 1, nudge: 1 })

/** CSS vars the stepper dollops paint with (default: shadcn's `--accent`, fully opaque). */
export const STEPPER_COLOR_VAR = '--goop-number-field-press'
export const STEPPER_OPACITY_VAR = '--goop-number-field-press-opacity'
/** The +/- buttons inside the host (shadcn-vue's NumberField data-slots). */
export const NUMBER_FIELD_INCREMENT = '[data-slot="increment"]'
export const NUMBER_FIELD_DECREMENT = '[data-slot="decrement"]'

export interface StepperFeel {
  /** Seconds for a press to swell the dollop to full. */
  attack: number
  /** Seconds for a release to shrink it away. */
  release: number
  /** Dollop radius as a fraction of the button's half short side. */
  size: number
  /** How flat and wide a held press squishes it (0 = round). */
  squish: number
  /** Release jelly wobble strength. */
  wobble: number
  /** How far a step shoves the dollop toward its side, as a fraction of its radius. */
  nudge: number
  /** Seconds a nudge takes to settle. */
  nudgeLife: number
  /** Ring ripple strength of a step (times the ring's ripple feel). */
  ripple: number
  /** Goo blur, px. */
  softness: number
}

export const STEPPER_FEEL: Readonly<Record<GoopPreset, Readonly<StepperFeel>>> = Object.freeze({
  subtle: Object.freeze({ attack: 0.07, release: 0.2, size: 0.62, squish: 0.18, wobble: 0.6, nudge: 0.22, nudgeLife: 0.3, ripple: 0.6, softness: 1.4 }),
  playful: Object.freeze({ attack: 0.08, release: 0.26, size: 0.68, squish: 0.28, wobble: 1, nudge: 0.34, nudgeLife: 0.36, ripple: 0.9, softness: 1.6 }),
  wild: Object.freeze({ attack: 0.09, release: 0.34, size: 0.74, squish: 0.4, wobble: 1.4, nudge: 0.48, nudgeLife: 0.44, ripple: 1.2, softness: 1.8 }),
})

/** A +/- button's box in host coordinates; `out` is the side it pushes toward (+1 right). */
export interface StepperButton {
  x: number
  y: number
  w: number
  h: number
  out: 1 | -1
}

/** One button's goo state. */
export interface StepperButtonState {
  /** Held down. */
  down: boolean
  /** Press amount 0..1. */
  p: number
  /** Seconds since release (Infinity = no wobble). */
  rel: number
  /** Seconds since the last step on this side (Infinity = none). */
  kick: number
}

/** Everything a stepper frame depends on: [decrement, increment]. */
export interface StepperState {
  buttons: [StepperButtonState, StepperButtonState]
}

const button = (): StepperButtonState => ({ down: false, p: 0, rel: Infinity, kick: Infinity })
export const createStepperState = (): StepperState => ({ buttons: [button(), button()] })

/** Seconds the release wobble lasts. */
const RELEASE_SETTLE = 0.6
/** Circles per button: the dollop and the short tail a nudge stretches out of it. */
export const STEPPER_CIRCLES = 2

const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step)

/** Advance by `dt` seconds. Returns true while anything is still moving. */
export function stepStepper(
  st: StepperState,
  dt: number,
  feel: StepperFeel = STEPPER_FEEL.playful,
  effects: StepperEffects = STEPPER_DEFAULT_EFFECTS,
): boolean {
  let moving = false
  for (const b of st.buttons) {
    b.p = approach(b.p, b.down ? 1 : 0, dt / (b.down ? feel.attack : feel.release))
    if (b.rel !== Infinity) b.rel = b.rel + dt < RELEASE_SETTLE ? b.rel + dt : Infinity
    if (b.kick !== Infinity) b.kick = b.kick + dt < feel.nudgeLife ? b.kick + dt : Infinity
    const wob = b.rel !== Infinity && effects.squish > 0
    moving ||= (b.down ? b.p < 1 : b.p > 0) || wob || (b.kick !== Infinity && effects.nudge > 0)
  }
  return moving
}

/** Snap to where it's heading (reduced motion). */
export function settleStepper(st: StepperState): void {
  for (const b of st.buttons) {
    b.p = b.down ? 1 : 0
    b.rel = Infinity
    b.kick = Infinity
  }
}

/** Nudge envelope at age `k` of `life`: out fast, settle back (0 at both ends). */
export function nudgeEnvelope(k: number, life: number): number {
  if (!(k >= 0) || k >= life || !(life > 0)) return 0
  const u = k / life
  return Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u) ** 1.2 + 0.25 * Math.sin(Math.PI * 2 * u) * (1 - u) * (u > 0.62 ? 1 : 0)
}

/**
 * The stepper dollops: STEPPER_CIRCLES per button, decrement first. `buttons[i]` null = no
 * such button (its circles are empty). Pure.
 */
export function stepperPose(
  st: StepperState,
  buttons: readonly (StepperButton | null)[],
  feel: StepperFeel = STEPPER_FEEL.playful,
  effects: StepperEffects = STEPPER_DEFAULT_EFFECTS,
  reduced = false,
): GooCircle[] {
  const out: GooCircle[] = []
  for (let i = 0; i < 2; i++) {
    const b = st.buttons[i]!
    const box = buttons[i]
    if (!box) {
      out.push(noCircle(0, 0), noCircle(0, 0))
      continue
    }
    const cx = box.x + box.w / 2
    const cy = box.y + box.h / 2
    const r0 = (Math.min(box.w, box.h) / 2) * feel.size
    const sq = reduced ? 0 : Math.max(0, effects.squish)
    const nf = reduced ? 0 : Math.max(0, effects.nudge)
    const env = nf > 0 && b.kick !== Infinity ? nudgeEnvelope(b.kick, feel.nudgeLife) : 0
    // A step with the button up (arrow keys) still shows a small dollop riding the nudge.
    const a = Math.max(reduced ? (b.down ? 1 : 0) : smooth01(b.p), Math.abs(env) * 0.75 * Math.min(1, nf))
    if (!(a > 0.001)) {
      out.push(noCircle(cx, cy), noCircle(cx, cy))
      continue
    }
    const press = sq * feel.squish * smooth01(b.p)
    const wob = sq > 0 && b.rel !== Infinity ? sq * feel.wobble * decayWobble(b.rel, 3.2, 4.5, RELEASE_SETTLE) : 0
    // Pressed: flattened and wide. Released: springs past round and back.
    let sx = 1 + press - 0.14 * wob
    let sy = 1 - press * 0.8 + 0.14 * wob
    const shove = env * nf * feel.nudge * r0
    // A nudge stretches it along its travel.
    sx += Math.abs(env) * nf * 0.12
    sy -= Math.abs(env) * nf * 0.06
    const r = r0 * a
    out.push({ x: cx + box.out * shove, y: cy, r, sx: Math.max(0.3, sx), sy: Math.max(0.3, sy) })
    // Tail: stays near the button while the dollop is shoved, so the two melt into a drop.
    const tr = shove !== 0 ? r * 0.62 : 0
    out.push(tr > 0.01 ? { x: cx - box.out * shove * 0.15, y: cy, r: tr, sx: 1, sy: 1 } : noCircle(cx, cy))
  }
  return out
}

/** Goo filter parameters of the stepper layer. */
export function stepperGooParams(feel: StepperFeel = STEPPER_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.45 }
}

// ---- attach --------------------------------------------------------------------------------

export interface NumberFieldOptions extends InputOptions {
  /** Pressing a +/- button squishes a goo dollop out of it; letting go springs it back. */
  squish?: boolean | number
  /** A value change shoves the dollop toward the pressed side and ripples the ring from it. */
  nudge?: boolean | number
}

export interface NumberFieldHandle {
  update(opts?: NumberFieldOptions): void
  resize(): void
  /** A step happened: `dir` +1 (increment side) or -1. Ignored right after typing (a typed
   *  value committing is not a step). */
  nudge(dir: number): void
  /** The focus ring (core `attachInput`). */
  readonly input: InputHandle
  readonly state: Readonly<StepperState>
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The stepper circles last drawn. */
  readonly pose: GooCircle[] | null
  destroy(): void
}

const stepperEffectsOf = (o: NumberFieldOptions): StepperEffects => ({
  squish: gooEffectValue(o.squish),
  nudge: gooEffectValue(o.nudge),
})
const inputOptionsOf = (o: NumberFieldOptions): InputOptions => {
  const { squish: _s, nudge: _n, ...rest } = o
  return rest
}

/** Keys that step the value (reka's NumberField). */
const STEP_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'])

/**
 * Attach the goo to a number field. `host` wraps `field` and its +/- buttons
 * (`[data-slot=increment]` / `[data-slot=decrement]`); it gets both goo layers and must be
 * the field's positioned ancestor (core makes it `position: relative` if static).
 */
export function attachNumberField(
  host: HTMLElement,
  field: HTMLInputElement,
  options: NumberFieldOptions = {},
): NumberFieldHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: NumberFieldOptions = { ...options }
  let feel = STEPPER_FEEL[readPreset(host, opts.preset)]
  let effects = stepperEffectsOf(opts)
  const input = attachInput(host, field, inputOptionsOf(opts))
  const st = createStepperState()
  let boxes: (StepperButton | null)[] = [null, null]
  let els: (HTMLElement | null)[] = [null, null]
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let last: GooCircle[] | null = null
  let destroyed = false
  /** The last thing that happened was typing (so the next value change is a typed commit). */
  let typed = false

  const readReduced = (): boolean => {
    const o = opts.reducedMotion
    return o === true || (o !== false && isReducedMotion(doc))
  }
  let reduced = readReduced()

  const measure = (): void => {
    const hr = host.getBoundingClientRect()
    const fr = field.getBoundingClientRect()
    const mid = fr.left + fr.width / 2
    els = [host.querySelector<HTMLElement>(NUMBER_FIELD_DECREMENT), host.querySelector<HTMLElement>(NUMBER_FIELD_INCREMENT)]
    boxes = els.map((el, i) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const c = r.left + r.width / 2
      const out: 1 | -1 = r.width > 0 ? (c >= mid ? 1 : -1) : i === 1 ? 1 : -1
      return { x: r.left - hr.left - host.clientLeft, y: r.top - hr.top - host.clientTop, w: r.width, h: r.height, out }
    })
  }

  const draw = (): void => {
    if (!layer) return
    last = stepperPose(st, boxes, feel, effects, reduced)
    for (let i = 0; i < blobs.length; i++) {
      const c = last[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
      else blobs[i]!.set(0, 0, 0)
    }
    layer.flush()
  }

  const padding = () => {
    const side = Math.ceil(feel.softness * 3 + 24)
    return { side, bottom: side }
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }
  const build = (): void => {
    teardown()
    measure()
    layer = resolveRenderer(opts.renderer)(host, stepperGooParams(feel))
    layer.layer.setAttribute('data-goop-part', 'number-field-stepper')
    layer.layer.style.setProperty('--goop-color', `var(${STEPPER_COLOR_VAR}, var(--accent, currentColor))`)
    layer.layer.style.setProperty('opacity', `var(${STEPPER_OPACITY_VAR}, 1)`)
    layer.setBodyScale(0, 0)
    layer.setPadding(padding())
    for (let i = 0; i < 2 * STEPPER_CIRCLES; i++) blobs.push(layer.createBlob())
    draw()
  }
  const relayout = (): void => {
    if (destroyed || !layer) return
    measure()
    layer.setPadding(padding())
    draw()
  }

  const tick: Ticker = (dt) => {
    if (destroyed || reduced) return false
    const moving = stepStepper(st, dt * Math.max(0.05, opts.speed ?? 1), feel, effects)
    draw()
    return moving
  }
  const kick = (): void => {
    if (destroyed) return
    if (reduced) {
      settleStepper(st)
      removeTicker(tick)
      draw()
    } else {
      draw()
      wakeTicker(tick)
    }
  }

  const isDisabled = (el: HTMLElement): boolean =>
    el.hasAttribute('disabled') || el.hasAttribute('data-disabled') || el.getAttribute('aria-disabled') === 'true'

  const release = (): void => {
    let any = false
    for (const b of st.buttons) {
      if (!b.down) continue
      b.down = false
      b.rel = 0
      any = true
    }
    if (any) kick()
  }
  const onPointerDown = (ev: Event): void => {
    const e = ev as PointerEvent
    if (e.button !== undefined && e.button !== 0) return
    const t = e.target as Node | null
    const i = els.findIndex((el) => el && t && el.contains(t))
    if (i < 0) return
    typed = false
    const el = els[i]!
    if (isDisabled(el)) return
    measure()
    const b = st.buttons[i]!
    b.down = true
    b.rel = Infinity
    kick()
  }
  const onKeyDown = (ev: Event): void => {
    if (STEP_KEYS.has((ev as KeyboardEvent).key)) typed = false
  }
  const onInput = (): void => {
    typed = true
  }
  const onWheel = (): void => {
    typed = false
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  host.addEventListener('pointerdown', onPointerDown, true)
  field.addEventListener('keydown', onKeyDown)
  field.addEventListener('input', onInput)
  field.addEventListener('wheel', onWheel, { passive: true })
  win?.addEventListener('pointerup', release)
  win?.addEventListener('pointercancel', release)
  win?.addEventListener('blur', release)

  build()
  kick()

  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => relayout()) : undefined
  ro?.observe(host)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    kick()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = STEPPER_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = stepperEffectsOf(opts)
      reduced = readReduced()
      input.update(inputOptionsOf(opts))
      if (rebuild) build()
      else relayout()
      kick()
    },
    resize() {
      input.resize()
      relayout()
    },
    nudge(dir) {
      if (destroyed || !(dir !== 0) || !Number.isFinite(dir)) return
      if (typed) {
        typed = false
        return
      }
      if (reduced || !(effects.nudge > 0)) return
      measure()
      const i = dir > 0 ? 1 : 0
      const box = boxes[i]
      st.buttons[i]!.kick = 0
      // Ripple the ring from the pressed side (the button, else that end of the field).
      const hr = host.getBoundingClientRect()
      const fr = field.getBoundingClientRect()
      const y = fr.top - hr.top + fr.height / 2
      const x = box ? box.x + box.w / 2 + box.out * box.w : dir > 0 ? fr.right - hr.left : fr.left - hr.left
      input.rippleAt(x, y, 1, effects.nudge * feel.ripple)
      kick()
    },
    get input() {
      return input
    },
    get state() {
      return st
    },
    get running() {
      return (
        !destroyed &&
        !reduced &&
        layer !== null &&
        stepStepper({ buttons: st.buttons.map((b) => ({ ...b })) as StepperState['buttons'] }, 0, feel, effects)
      )
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
      host.removeEventListener('pointerdown', onPointerDown, true)
      field.removeEventListener('keydown', onKeyDown)
      field.removeEventListener('input', onInput)
      field.removeEventListener('wheel', onWheel)
      win?.removeEventListener('pointerup', release)
      win?.removeEventListener('pointercancel', release)
      win?.removeEventListener('blur', release)
      teardown()
      input.destroy()
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

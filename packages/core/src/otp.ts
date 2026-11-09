// Goo for one-time-code inputs (GoopInputOTP): the focused cell is a pool of goo, and the goo
// follows focus from cell to cell.
//
// One aria-hidden goo layer on the OTP root (the host) draws the focused cell's fill with the
// toggle group's engine pieces (`togglePose`, `toggleFlightPose`):
//   flood: focusing a cell from outside floods it from the press point (its center for Tab).
//   flow: when focus moves to another cell (typing advances it, Backspace steps back), the old
//     cell's goo gathers into a blob, necks out, pinches off, travels and floods the new cell
//     from the side it arrived on, like GoopToggleGroup's fill moving between items.
//   wobble: the flood front's crest and a small jelly wobble once the cell is full.
//   pulse: a digit landing in a cell plops a small goo dollop into it that swells and settles
//     (low and wide), as the fill flows on to the next cell.
//   blur (focus leaves every cell): the fill drains away.
// Every frame is a pure function of the engine clock (`otpPose`), so reduced motion (a static
// fill in the focused cell, no flights or pulses), first paint and every frame agree. No DOM
// access until `attachInputOTP` (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { decayWobble, noCircle, smooth01, type GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import {
  TOGGLE_FEEL,
  TOGGLE_FLIGHT_ABSORB,
  toggleAnimEnd,
  toggleCircleR,
  toggleFlightLand,
  toggleFlightPose,
  toggleGooParams,
  toggleLevel,
  togglePose,
  type ToggleAnim,
  type ToggleEffects,
  type ToggleFeel,
  type ToggleFlight,
  type TogglePoint,
  type ToggleRect,
} from './toggle'
import { readPreset } from './tuning'

/** Individually toggleable effects (boolean or multiplier). */
export const OTP_EFFECTS = ['flood', 'flow', 'wobble', 'pulse'] as const
export type OtpEffect = (typeof OTP_EFFECTS)[number]
export type OtpEffects = Record<OtpEffect, number>
export const OTP_DEFAULT_EFFECTS: Readonly<OtpEffects> = Object.freeze({ flood: 1, flow: 1, wobble: 1, pulse: 1 })

/** CSS vars the goo paints with (default: shadcn's `--ring` at 30%, the focus color). */
export const OTP_COLOR_VAR = '--goop-otp-color'
export const OTP_OPACITY_VAR = '--goop-otp-opacity'
/** The cells inside the host (shadcn-vue's InputOTPSlot data-slot). */
export const OTP_SLOT = '[data-slot="input-otp-slot"]'

/** How far the fill sits inside each cell's border box, px per side. */
export const OTP_INSET = 3
/** Circles a pulse draws (the dollop and two low side lobes). */
export const OTP_PULSE_CIRCLES = 3
/** Pulses alive at once. */
export const OTP_MAX_PULSES = 3

/** Pulse feel per preset: seconds, size (fraction of the cell's half short side). */
export const OTP_PULSE_FEEL: Readonly<Record<GoopPreset, Readonly<{ life: number; size: number }>>> = Object.freeze({
  subtle: Object.freeze({ life: 0.42, size: 0.5 }),
  playful: Object.freeze({ life: 0.5, size: 0.62 }),
  wild: Object.freeze({ life: 0.6, size: 0.74 }),
})

/** A digit landing in cell `index` at clock `start`. */
export interface OtpPulse {
  index: number
  start: number
}

const toggleEffects = (e: OtpEffects): ToggleEffects => ({ flood: e.flood, wobble: e.wobble, droplets: 0, flow: e.flow, merge: 0 })

/** A cell's fill rect: its border box pulled in by OTP_INSET. */
export const otpFillRect = (r: ToggleRect): ToggleRect => {
  const i = Math.min(OTP_INSET, r.w / 4, r.h / 4)
  return { x: r.x + i, y: r.y + i, w: Math.max(1, r.w - 2 * i), h: Math.max(1, r.h - 2 * i) }
}

/** The pulse circles of one pulse at clock `now`. Pure. */
export function otpPulseCircles(
  pulse: OtpPulse,
  rect: ToggleRect,
  now: number,
  feel: { life: number; size: number } = OTP_PULSE_FEEL.playful,
  amount = 1,
): GooCircle[] {
  const cx = rect.x + rect.w / 2
  const cy = rect.y + rect.h / 2
  const a = now - pulse.start
  if (!(amount > 0) || a < 0 || a >= feel.life) return Array.from({ length: OTP_PULSE_CIRCLES }, () => noCircle(cx, cy))
  const u = a / feel.life
  const R = (Math.min(rect.w, rect.h) / 2) * feel.size * Math.min(1.5, amount)
  // Swells in fast, a small jelly settle, gone by the end.
  const env = smooth01(u / 0.22) * (1 - smooth01((u - 0.55) / 0.45))
  const jelly = decayWobble(a, 3.4, 4.5, feel.life)
  const r = R * env * (1 + 0.12 * jelly)
  // Low and wide: the dollop is flattened and two lobes spread it sideways.
  const sx = 1.18 + 0.1 * jelly
  const sy = 0.86 - 0.08 * jelly
  const spread = R * 0.55 * smooth01(u / 0.4)
  const lobe = r * 0.62
  return [
    r > 0.01 ? { x: cx, y: cy + R * 0.08, r, sx, sy } : noCircle(cx, cy),
    lobe > 0.01 ? { x: cx - spread, y: cy + R * 0.18, r: lobe, sx: 1, sy: 1 } : noCircle(cx, cy),
    lobe > 0.01 ? { x: cx + spread, y: cy + R * 0.18, r: lobe, sx: 1, sy: 1 } : noCircle(cx, cy),
  ]
}

export interface OtpPose {
  circles: GooCircle[]
  /** Fill level per cell (0..1). */
  levels: number[]
}

/**
 * The goo at clock `now`: the cells' fills (cells in DOM order, `anims[i]` each), flights
 * between cells, then OTP_MAX_PULSES pulse slots. Pure.
 */
export function otpPose(
  rects: readonly ToggleRect[],
  anims: readonly ToggleAnim[],
  flights: readonly ToggleFlight[],
  pulses: readonly OtpPulse[],
  now: number,
  feel: ToggleFeel = TOGGLE_FEEL.playful,
  effects: OtpEffects = OTP_DEFAULT_EFFECTS,
  pulseFeel: { life: number; size: number } = OTP_PULSE_FEEL.playful,
): OtpPose {
  const fx = toggleEffects(effects)
  const items = rects.map((r, i) => ({ rect: otpFillRect(r), anim: anims[i]! }))
  const base = togglePose(items, flights, now, feel, fx, { maxGap: 0, sep: 0 })
  const circles = [...base.circles]
  for (let k = 0; k < OTP_MAX_PULSES; k++) {
    const p = pulses[k]
    const rect = p ? rects[p.index] : undefined
    if (p && rect) circles.push(...otpPulseCircles(p, otpFillRect(rect), now, pulseFeel, effects.pulse))
    else for (let j = 0; j < OTP_PULSE_CIRCLES; j++) circles.push(noCircle(0, 0))
  }
  return { circles, levels: base.levels }
}

// ---- attach --------------------------------------------------------------------------------

export interface InputOTPOptions {
  speed?: number
  preset?: GoopPreset
  renderer?: GoopRendererOption
  /** Focusing a cell floods it from the press point; leaving drains it. Off: it snaps. */
  flood?: boolean | number
  /** Focus moving between cells carries the goo from the old cell to the new one. */
  flow?: boolean | number
  /** The flood front's crest and a jelly wobble once full. */
  wobble?: boolean | number
  /** A digit landing in a cell plops a small goo dollop into it. */
  pulse?: boolean | number
  reducedMotion?: boolean | 'auto'
}

export interface InputOTPHandle {
  update(opts?: InputOTPOptions): void
  resize(): void
  /** Plop a pulse into cell `index` (what typing a digit does). */
  pulse(index: number): void
  /** Put the goo in cell `index` (-1: none), as focusing that cell would: it floods, flows
   *  from the previous cell, or drains. For inputs whose cells are not focusable themselves
   *  (React's input-otp: one hidden input over render-only slots, which marks the active slot
   *  instead); call it whenever the active cell changes. Real focus moves still work too. */
  setActive(index: number): void
  /** Index of the cell the goo is in (focused), or -1. */
  readonly active: number
  readonly running: boolean
  readonly reducedMotion: boolean
  readonly pose: OtpPose | null
  destroy(): void
}

const effectsOf = (o: InputOTPOptions): OtpEffects => ({
  flood: gooEffectValue(o.flood),
  flow: gooEffectValue(o.flow),
  wobble: gooEffectValue(o.wobble),
  pulse: gooEffectValue(o.pulse),
})

const PRESS_MS = 1200
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x))

/** Attach the focus goo to an OTP root `host` (cells: `[data-slot=input-otp-slot]`). */
export function attachInputOTP(host: HTMLElement, options: InputOTPOptions = {}): InputOTPHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: InputOTPOptions = { ...options }
  let preset = readPreset(host, opts.preset)
  let feel = TOGGLE_FEEL[preset]
  let effects = effectsOf(opts)
  let els: HTMLElement[] = []
  let rects: ToggleRect[] = []
  let anims = new Map<HTMLElement, ToggleAnim>()
  let flights: ToggleFlight[] = []
  let pulses: OtpPulse[] = []
  let now = 0
  let last: OtpPose | null = null
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let params: GooFilterParams | null = null
  let destroyed = false
  let press: { el: HTMLElement; x: number; y: number; at: number } | null = null
  let focusedEl: HTMLElement | null = null

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
    const er = el.getBoundingClientRect()
    const p = local(er.left, er.top)
    return { x: p.x, y: p.y, w: er.width, h: er.height }
  }
  const center = (r: ToggleRect): TogglePoint => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 })
  const measure = (): void => {
    els = Array.from(host.querySelectorAll<HTMLElement>(OTP_SLOT))
    rects = els.map(rectOf)
  }
  const isOn = (el: HTMLElement): boolean => el === focusedEl
  const animOf = (el: HTMLElement, i: number): ToggleAnim => {
    let a = anims.get(el)
    if (!a) {
      const on = isOn(el)
      a = { on, origin: center(rects[i]!), start: -1e6, from: on ? 1 : 0, splash: false }
      anims.set(el, a)
    }
    return a
  }
  const tfx = (): ToggleEffects => toggleEffects(effects)
  const levelOf = (a: ToggleAnim): number => toggleLevel(a, now, feel, tfx()).p

  const busyUntil = (): number => {
    let end = -Infinity
    const fx = tfx()
    for (const a of anims.values()) end = Math.max(end, toggleAnimEnd(a, feel, fx))
    for (const f of flights) end = Math.max(end, f.start + toggleFlightLand(f) + TOGGLE_FLIGHT_ABSORB)
    for (const p of pulses) end = Math.max(end, p.start + OTP_PULSE_FEEL[preset].life)
    return end
  }

  const draw = (): void => {
    if (!layer) return
    const list = els.map((el, i) => animOf(el, i))
    if (reduced) {
      const still = list.map((a) => ({ ...a, from: a.on ? 1 : 0, start: -1e6, splash: false }))
      last = otpPose(rects, still, [], [], 0, feel, effects, OTP_PULSE_FEEL[preset])
    } else {
      last = otpPose(rects, list, flights, pulses, now, feel, effects, OTP_PULSE_FEEL[preset])
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

  const short = (): number => {
    const sizes = rects.map((r) => Math.min(r.w, r.h) - 2 * OTP_INSET).filter((s) => s > 0)
    return sizes.length ? Math.min(...sizes) : 28
  }
  const layout = (): { params: GooFilterParams; pad: number } => {
    measure()
    const p = toggleGooParams(short(), feel)
    return { params: p, pad: Math.ceil(p.blur * 3 + short() * 1.2) }
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
    layer.layer.style.setProperty('--goop-color', `var(${OTP_COLOR_VAR}, var(--ring, currentColor))`)
    layer.layer.style.setProperty('opacity', `var(${OTP_OPACITY_VAR}, 0.3)`)
    layer.layer.setAttribute('data-goop-part', 'input-otp')
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
    pulses = pulses.filter((p) => now < p.start + OTP_PULSE_FEEL[preset].life)
    draw()
    return shouldRun()
  }
  const run = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  /** Re-read which cell is focused; flood, drain or flow for what changed. */
  const sync = (): void => {
    if (destroyed) return
    measure()
    const turnedOn: number[] = []
    const turnedOff: number[] = []
    els.forEach((el, i) => {
      const a = animOf(el, i)
      if (isOn(el) !== a.on) (a.on ? turnedOff : turnedOn).push(i)
    })
    for (const el of anims.keys()) if (!els.includes(el)) anims.delete(el)
    if (!turnedOn.length && !turnedOff.length) return
    reduced = readReduced()
    const fx = tfx()
    const pressAt = (i: number): TogglePoint => {
      const ok = press && press.el === els[i] && performance.now() - press.at < PRESS_MS
      return ok ? { x: press!.x, y: press!.y } : center(rects[i]!)
    }
    const restart = (i: number, on: boolean, origin: TogglePoint, delay = 0): void => {
      const el = els[i]!
      const prev = animOf(el, i)
      const from = levelOf(prev)
      const keep = from > 0.02 && from < 0.98 && now >= prev.start
      anims.set(el, { on, origin: keep ? prev.origin : origin, start: reduced ? now - 1e3 : now + delay, from, splash: false })
    }
    if (!reduced && effects.flow > 0 && turnedOn.length === 1 && turnedOff.length === 1) {
      const ia = turnedOff[0]!
      const ib = turnedOn[0]!
      const A = otpFillRect(rects[ia]!)
      const B = otpFillRect(rects[ib]!)
      const rA = toggleCircleR(A)
      const rB = toggleCircleR(B)
      const into = (p: TogglePoint, r: ToggleRect, m: number): TogglePoint => ({
        x: clamp(p.x, r.x + m, r.x + r.w - m),
        y: clamp(p.y, r.y + m, r.y + r.h - m),
      })
      const exit = into(center(B), A, rA)
      const entry = into(center(A), B, rB)
      const live = flights.map((f) => toggleFlightPose(f, now, feel, fx).at).find((p) => p)
      const fromPt = live ?? exit
      const dist = Math.hypot(entry.x - fromPt.x, entry.y - fromPt.y)
      // Cells are close: a quick hop (typing fast must not leave the goo behind).
      const travel = feel.flight * clamp(dist / 100, 0.3, 1.6) * 0.8
      const gather = live ? 0 : feel.drain * 0.3
      const fl: ToggleFlight = { from: fromPt, to: entry, start: now, gather, travel, r: Math.min(rA, rB) * 1.2, bridged: !live }
      flights = [fl]
      restart(ia, false, exit)
      restart(ib, true, entry, toggleFlightLand(fl))
    } else {
      for (const i of turnedOff) restart(i, false, pressAt(i))
      for (const i of turnedOn) restart(i, true, pressAt(i))
    }
    press = null
    draw()
    run()
  }

  const cellOf = (t: EventTarget | null): HTMLElement | null => {
    const n = t as Node | null
    return (n && els.find((x) => x === n || x.contains(n))) ?? null
  }
  /** Set by `setActive`: the active cell comes from the adapter, so focus on something that is
   *  not a cell (input-otp's hidden input) leaves it alone. */
  let driven = false
  /** The cell under a viewport point (a press on an input laid over the cells). */
  const cellAt = (cx: number, cy: number): HTMLElement | null => {
    const p = local(cx, cy)
    const i = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h)
    return i >= 0 ? els[i]! : null
  }
  const onPointerDown = (e: PointerEvent): void => {
    measure()
    const el = cellOf(e.target) ?? (driven ? cellAt(e.clientX, e.clientY) : null)
    if (!el) return
    const p = local(e.clientX, e.clientY)
    press = { el, x: p.x, y: p.y, at: performance.now() }
  }
  const onFocusIn = (e: FocusEvent): void => {
    measure()
    const cell = cellOf(e.target)
    if (!cell && driven) return
    focusedEl = cell
    sync()
  }
  const onFocusOut = (e: FocusEvent): void => {
    measure()
    if (driven && !cellOf(e.target)) return
    // Focus moving to another cell: focusin handles it (so the flow sees both changes at once).
    if (cellOf(e.relatedTarget)) return
    focusedEl = null
    sync()
  }
  const addPulse = (index: number): void => {
    if (destroyed || reduced || !(effects.pulse > 0) || index < 0 || index >= els.length) return
    pulses = [...pulses, { index, start: now }].slice(-OTP_MAX_PULSES)
    draw()
    run()
  }
  const onInput = (e: Event): void => {
    measure()
    const el = cellOf(e.target)
    if (!el) return
    const type = (e as InputEvent).inputType ?? ''
    const v = (el as HTMLInputElement).value ?? ''
    if (type.startsWith('delete') || !v) return
    addPulse(els.indexOf(el))
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  measure()
  const act = doc.activeElement
  focusedEl = act ? cellOf(act) : null
  build()
  host.addEventListener('pointerdown', onPointerDown, true)
  host.addEventListener('focusin', onFocusIn)
  host.addEventListener('focusout', onFocusOut)
  host.addEventListener('input', onInput)
  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const MO = win?.MutationObserver
  const mo = MO ? new MO(() => sync()) : undefined
  mo?.observe(host, { childList: true, subtree: true })
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
      preset = readPreset(host, opts.preset)
      const nextFeel = TOGGLE_FEEL[preset]
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
    pulse: addPulse,
    setActive(index) {
      if (destroyed) return
      driven = true
      measure()
      focusedEl = index >= 0 ? (els[index] ?? null) : null
      sync()
    },
    get active() {
      return focusedEl ? els.indexOf(focusedEl) : -1
    },
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
      host.removeEventListener('focusin', onFocusIn)
      host.removeEventListener('focusout', onFocusOut)
      host.removeEventListener('input', onInput)
      teardown()
      anims = new Map()
      flights = []
      pulses = []
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

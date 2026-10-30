// Goo focus ring for text fields (input, textarea).
//
// One aria-hidden goo layer on a HOST element that wraps the field (an <input> can't hold
// children). The ring is a chain of goo circles along a rounded rect just outside the field's
// border box; the goo filter melts them into one wobbly band. The real field stays unfiltered
// on top.
//
//   focus: goo flows around the border from the point you clicked (or the left edge on
//     keyboard focus): a dollop at the origin, two bulbous fronts racing both ways, and a
//     wobble where they meet and close the ring.
//   typing: each edit sends a small ripple along the ring from the point nearest the caret.
//   while focused: the closed ring wobbles gently.
//   blur: the ring drains away top first.
//   invalid (aria-invalid): the ring shows even unfocused, in the destructive color, with a
//     small drip hanging off the bottom edge.
//   resting drips (off by default): small drips hang under the ring while it's shown.
//
// The pose is a pure function of `InputGooState` (`inputRingPose`), so reduced motion (a
// static closed ring) and every frame agree. No DOM access until `attachInput` (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { decayWobble, hangingDrip, noCircle, smooth01, type GooCircle } from './liquid'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { gooEffectValue } from './splat'
import { readPreset } from './tuning'

/** Individually toggleable effects (boolean or multiplier). `drips` is off by default. */
export const INPUT_EFFECTS = ['flow', 'close', 'ripple', 'wobble', 'drain', 'drip', 'drips'] as const
export type InputEffect = (typeof INPUT_EFFECTS)[number]
export type InputEffects = Record<InputEffect, number>
export const INPUT_DEFAULT_EFFECTS: Readonly<InputEffects> = Object.freeze({
  flow: 1,
  close: 1,
  ripple: 1,
  wobble: 1,
  drain: 1,
  drip: 1,
  drips: 0,
})

/** Neck circles per drip. */
const DRIP_NECKS = 3
/** Resting drips: x as a fraction of the width, size and hang multipliers, breathing phase. */
const RESTING = [
  { x: 0.16, size: 0.8, hang: 0.5, phase: 0 },
  { x: 0.52, size: 1.05, hang: 0.62, phase: 2.1 },
  { x: 0.84, size: 0.7, hang: 0.42, phase: 4.2 },
] as const
/** Circles after the ring: the invalid drip, then the resting drips. */
export const INPUT_DRIP_CIRCLES = (1 + DRIP_NECKS) * (1 + RESTING.length)
/** Ring circle count bounds. */
export const INPUT_RING_MIN = 24
export const INPUT_RING_MAX = 240

/** CSS vars the goo paints with (set on the host or an ancestor). */
export const INPUT_COLOR_VAR = '--goop-input-color'
export const INPUT_OPACITY_VAR = '--goop-input-opacity'
export const INPUT_INVALID_COLOR_VAR = '--goop-input-invalid-color'
export const INPUT_INVALID_OPACITY_VAR = '--goop-input-invalid-opacity'

export interface InputFeel {
  /** Seconds for the flow to close the ring. */
  flow: number
  /** Seconds for blur to drain it. */
  drain: number
  /** Ring circle radius, px (the band is about 1.6x this thick). */
  thickness: number
  /** How far the band's center line sits outside the border box, px. */
  offset: number
  /** Size of the flow fronts (multiplier). */
  bulb: number
  /** Close splash strength. */
  close: number
  /** Idle wobble strength. */
  wobble: number
  /** Typing ripple strength. */
  ripple: number
  /** Invalid drip radius, px. */
  drip: number
  /** Goo blur, px. */
  softness: number
}

export const INPUT_FEEL: Readonly<Record<GoopPreset, Readonly<InputFeel>>> = Object.freeze({
  subtle: Object.freeze({ flow: 0.34, drain: 0.26, thickness: 2.3, offset: 1, bulb: 0.45, close: 0.6, wobble: 0.6, ripple: 0.7, drip: 3.6, softness: 1 }),
  playful: Object.freeze({ flow: 0.42, drain: 0.32, thickness: 2.6, offset: 1.2, bulb: 0.7, close: 1, wobble: 1, ripple: 1, drip: 4.3, softness: 1.1 }),
  wild: Object.freeze({ flow: 0.55, drain: 0.4, thickness: 3, offset: 1.4, bulb: 1, close: 1.4, wobble: 1.5, ripple: 1.4, drip: 5, softness: 1.2 }),
})

/** The field's border box in host coordinates, and its corner radius. */
export interface InputGeometry {
  x: number
  y: number
  width: number
  height: number
  radius: number
}

export interface RingPoint {
  x: number
  y: number
  /** Outward unit normal. */
  nx: number
  ny: number
}

/** Rounded rect the band's center line follows. */
function ringRect(g: InputGeometry, offset: number) {
  const w = Math.max(1, g.width)
  const h = Math.max(1, g.height)
  const r = Math.max(0, Math.min(g.radius, w / 2, h / 2))
  const R = r + offset
  const sw = w - 2 * r
  const sh = h - 2 * r
  const arc = (Math.PI / 2) * R
  return { x0: g.x - offset, y0: g.y - offset, w: w + 2 * offset, h: h + 2 * offset, R, sw, sh, arc }
}

/** Length of the ring (the center line), px. */
export function ringPerimeter(g: InputGeometry, offset: number): number {
  const q = ringRect(g, offset)
  return 2 * q.sw + 2 * q.sh + 4 * q.arc
}

/** Point at arc length `s` along the ring, clockwise from the top edge's left end. */
export function ringPoint(g: InputGeometry, offset: number, s: number): RingPoint {
  const q = ringRect(g, offset)
  const P = 2 * q.sw + 2 * q.sh + 4 * q.arc
  let u = ((s % P) + P) % P
  const { x0, y0, w, h, R } = q
  const corner = (cx: number, cy: number, a0: number, d: number): RingPoint => {
    const a = a0 + (q.arc > 0 ? (d / q.arc) * (Math.PI / 2) : 0)
    const nx = Math.cos(a)
    const ny = Math.sin(a)
    return { x: cx + nx * R, y: cy + ny * R, nx, ny }
  }
  // top edge, TR corner, right edge, BR corner, bottom edge, BL corner, left edge, TL corner
  if (u < q.sw) return { x: x0 + R + u, y: y0, nx: 0, ny: -1 }
  u -= q.sw
  if (u < q.arc) return corner(x0 + w - R, y0 + R, -Math.PI / 2, u)
  u -= q.arc
  if (u < q.sh) return { x: x0 + w, y: y0 + R + u, nx: 1, ny: 0 }
  u -= q.sh
  if (u < q.arc) return corner(x0 + w - R, y0 + h - R, 0, u)
  u -= q.arc
  if (u < q.sw) return { x: x0 + w - R - u, y: y0 + h, nx: 0, ny: 1 }
  u -= q.sw
  if (u < q.arc) return corner(x0 + R, y0 + h - R, Math.PI / 2, u)
  u -= q.arc
  if (u < q.sh) return { x: x0, y: y0 + h - R - u, nx: -1, ny: 0 }
  u -= q.sh
  return corner(x0 + R, y0 + R, Math.PI, Math.min(u, q.arc))
}

/** Arc length of the ring point nearest (px, py). */
export function ringArcAt(g: InputGeometry, offset: number, px: number, py: number): number {
  const P = ringPerimeter(g, offset)
  const n = Math.max(64, Math.min(1024, Math.ceil(P / 2)))
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < n; i++) {
    const s = (i / n) * P
    const p = ringPoint(g, offset, s)
    const d = (p.x - px) ** 2 + (p.y - py) ** 2
    if (d < bestD) {
      bestD = d
      best = s
    }
  }
  return best
}

/** Ring circles for a ring `perimeter` px long with circles `thickness` px in radius. */
export function ringCircleCount(perimeter: number, thickness: number): number {
  const n = Math.ceil(perimeter / Math.max(0.5, thickness * 0.95))
  return Math.max(INPUT_RING_MIN, Math.min(INPUT_RING_MAX, n))
}

export interface InputRipple {
  /** Arc position it started at. */
  s: number
  /** Seconds since it started. */
  age: number
  amp: number
}

/** Everything a frame depends on. */
export interface InputGooState {
  /** Ring should be shown (focused or invalid). */
  shown: boolean
  focused: boolean
  invalid: boolean
  /** Flow progress 0..1 (1 = ring closed). */
  cover: number
  /** Drain progress 0..1 (0 = not draining). */
  drain: number
  /** Arc position the flow started from. */
  origin: number
  /** Seconds since the ring closed (Infinity = no close wobble). */
  closeAge: number
  /** Seconds of idle wobble time. */
  time: number
  ripples: InputRipple[]
  /** Invalid drip progress 0..1. */
  drip: number
  /** Resting drips progress 0..1. */
  drips: number
}

export const createInputGooState = (): InputGooState => ({
  shown: false,
  focused: false,
  invalid: false,
  cover: 0,
  drain: 0,
  origin: 0,
  closeAge: Infinity,
  time: 0,
  ripples: [],
  drip: 0,
  drips: 0,
})

/** Seconds the close wobble lasts. */
const CLOSE_SETTLE = 0.9
/** Seconds a typing ripple lives, its travel speed (px/s). */
const RIPPLE_LIFE = 0.75
const RIPPLE_SPEED = 120
/** Seconds the drips take to swell in / retract. */
const DRIP_SWELL = 0.7
const MAX_RIPPLES = 8

const approach = (v: number, target: number, step: number): number =>
  v < target ? Math.min(target, v + step) : Math.max(target, v - step)

/** Snap the state to where it's heading (reduced motion, or no flow/drain effect). */
export function settleInputGoo(st: InputGooState, effects: InputEffects = INPUT_DEFAULT_EFFECTS): void {
  st.cover = st.shown ? 1 : 0
  st.drain = 0
  st.closeAge = Infinity
  st.ripples = []
  st.drip = st.shown && st.invalid && effects.drip > 0 ? 1 : 0
  st.drips = st.shown && effects.drips > 0 ? 1 : 0
}

/** Advance the state by `dt` seconds. Returns true while anything is still moving. */
export function stepInputGoo(
  st: InputGooState,
  dt: number,
  feel: InputFeel = INPUT_FEEL.playful,
  effects: InputEffects = INPUT_DEFAULT_EFFECTS,
): boolean {
  if (st.shown) {
    if (st.drain > 0) st.drain = effects.drain > 0 ? Math.max(0, st.drain - dt / feel.drain) : 0
    else if (st.cover < 1) {
      st.cover = effects.flow > 0 ? Math.min(1, st.cover + dt / feel.flow) : 1
      if (st.cover >= 1) st.closeAge = effects.close > 0 && effects.flow > 0 ? 0 : Infinity
    }
  } else if (st.cover > 0) {
    st.drain = effects.drain > 0 ? Math.min(1, st.drain + dt / feel.drain) : 1
    if (st.drain >= 1) {
      st.cover = 0
      st.drain = 0
      st.closeAge = Infinity
      st.ripples = []
    }
  }
  if (st.closeAge < CLOSE_SETTLE) st.closeAge += dt
  else st.closeAge = Infinity
  for (const r of st.ripples) r.age += dt
  st.ripples = st.ripples.filter((r) => r.age < RIPPLE_LIFE)
  const full = st.cover >= 1 && st.drain === 0 && st.shown
  st.drip = approach(st.drip, full && st.invalid && effects.drip > 0 ? 1 : 0, dt / DRIP_SWELL)
  st.drips = approach(st.drips, full && effects.drips > 0 ? 1 : 0, dt / DRIP_SWELL)
  const idle = st.focused && full && effects.wobble > 0 && feel.wobble > 0
  if (idle) st.time += dt
  return (
    idle ||
    (st.shown ? st.cover < 1 || st.drain > 0 : st.cover > 0) ||
    st.closeAge !== Infinity ||
    st.ripples.length > 0 ||
    (st.drip > 0 && st.drip < 1) ||
    (st.drips > 0 && st.drips < 1)
  )
}

/** Start a typing ripple at arc `s`. */
export function addInputRipple(st: InputGooState, s: number, amp = 1): void {
  if (!(st.cover > 0) || st.drain > 0) return
  st.ripples.push({ s, age: 0, amp })
  if (st.ripples.length > MAX_RIPPLES) st.ripples.shift()
}

export interface InputRingPose {
  /** `ring` ring circles, then INPUT_DRIP_CIRCLES drip circles. */
  circles: GooCircle[]
  /** Fraction of the ring drawn (0 = hidden). */
  coverage: number
}

const gauss = (x: number): number => Math.exp(-x * x)
const easeOut = (t: number): number => 1 - (1 - t) ** 3

/** The ring at state `st`. Pure. `ring` = number of ring circles. */
export function inputRingPose(
  st: InputGooState,
  g: InputGeometry,
  ring: number,
  feel: InputFeel = INPUT_FEEL.playful,
  effects: InputEffects = INPUT_DEFAULT_EFFECTS,
  reduced = false,
): InputRingPose {
  const r0 = feel.thickness
  const P = ringPerimeter(g, feel.offset)
  const half = P / 2
  const circles: GooCircle[] = []
  const cover = reduced ? (st.shown ? 1 : 0) : st.cover
  const drain = reduced ? 0 : st.drain
  const front = easeOut(cover) * (half + r0 * 2.5)
  const flowFx = reduced ? 0 : Math.max(0, effects.flow) * feel.bulb
  const closeFx = reduced ? 0 : Math.max(0, effects.close) * feel.close
  const wobFx = reduced ? 0 : Math.max(0, effects.wobble) * feel.wobble
  const ripFx = reduced ? 0 : Math.max(0, effects.ripple) * feel.ripple
  const closeW = st.closeAge === Infinity ? 0 : decayWobble(st.closeAge, 2.6, 3.5, CLOSE_SETTLE)
  const top = g.y - feel.offset
  const tall = g.height + 2 * feel.offset
  let drawn = 0

  for (let i = 0; i < ring; i++) {
    const s = ((i + 0.5) / ring) * P
    const p = ringPoint(g, feel.offset, s)
    const dd = Math.abs(s - st.origin) % P
    const d = Math.min(dd, P - dd)
    if (cover <= 0) {
      circles.push(noCircle(p.x, p.y))
      continue
    }
    const k = cover >= 1 ? 1 : smooth01((front - d) / (r0 * 2))
    let grow = 0
    let push = 0
    if (cover < 1 && flowFx > 0) {
      // Bulbous fronts, and the dollop at the origin spreading out.
      grow += flowFx * gauss((front - d - r0 * 1.4) / (r0 * 1.6)) * (1 - smooth01((cover - 0.8) / 0.2))
      grow += flowFx * 0.8 * gauss(d / (r0 * 3)) * (1 - smooth01(cover / 0.5))
    }
    if (closeW !== 0) {
      // Where the fronts met: a swell that wobbles out; the ring rings with it.
      grow += closeFx * 0.9 * closeW * gauss((half - d) / (r0 * 4))
      push += closeFx * 0.6 * r0 * closeW * Math.sin((s / P) * Math.PI * 6)
    }
    if (wobFx > 0 && st.time > 0) {
      const w = Math.min(1, st.time / 0.6)
      const a = Math.sin((2 * Math.PI * s) / 47 - st.time * 1.7) + 0.6 * Math.sin((2 * Math.PI * s) / 29 + st.time * 1.1)
      grow += wobFx * 0.1 * w * a
      push += wobFx * 0.22 * r0 * w * a
    }
    if (ripFx > 0) {
      for (const rp of st.ripples) {
        let rd = Math.abs(s - rp.s) % P
        rd = Math.min(rd, P - rd)
        const life = 1 - rp.age / RIPPLE_LIFE
        const b = rp.amp * life * life * gauss((rd - rp.age * RIPPLE_SPEED) / (r0 * 2.2))
        grow += ripFx * 0.75 * b
        push += ripFx * 0.5 * r0 * b
      }
    }
    let x = p.x + p.nx * push
    let y = p.y + p.ny * push
    let r = r0 * k * Math.max(0, 1 + grow)
    if (drain > 0) {
      // Top drains first, sliding down as it goes.
      const yn = Math.max(0, Math.min(1, (p.y - top) / tall))
      const local = smooth01(drain * 1.6 - yn * 0.6)
      r *= 1 - local
      y += local * r0 * 1.5
    }
    if (r > 0.01) drawn++
    circles.push({ x, y, r: r > 0.01 ? r : 0, sx: 1, sy: 1 })
  }

  // Drips hang off the bottom of the band.
  const bottom = g.y + g.height + feel.offset
  const breathe = reduced ? 0 : wobFx * Math.min(1, st.time / 0.6)
  const drip = (frac: number, size: number, hang: number, phase: number, amount: number): GooCircle[] => {
    const ax = g.x + g.width * frac
    const rd = feel.drip * size
    if (!(amount > 0.001) || rd <= 0) return Array.from({ length: 1 + DRIP_NECKS }, () => noCircle(ax, bottom))
    const u = Math.max(0, hang * smooth01(amount) + 0.05 * breathe * Math.sin(st.time * 2.3 + phase))
    return hangingDrip(u, ax, bottom, r0, rd * smooth01(amount), DRIP_NECKS).map((c) => ({ ...c, sx: 1, sy: 1 }))
  }
  const invalidAmt = reduced ? (st.shown && st.invalid && effects.drip > 0 ? 1 : 0) : st.drip
  circles.push(...drip(0.74, Math.max(0, Math.min(2, effects.drip || 1)), 0.78, 1, invalidAmt))
  const restAmt = reduced ? (st.shown && effects.drips > 0 ? 1 : 0) : st.drips
  for (const d of RESTING) circles.push(...drip(d.x, d.size * Math.max(0, Math.min(2, effects.drips || 1)), d.hang, d.phase, restAmt))

  return { circles, coverage: ring > 0 ? drawn / ring : 0 }
}

/** Goo filter parameters. */
export function inputGooParams(feel: InputFeel = INPUT_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

// ---- caret ---------------------------------------------------------------------------------

const MIRROR_PROPS = [
  'boxSizing', 'width', 'height', 'overflowX', 'overflowY',
  'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontStyle', 'fontVariant', 'fontWeight', 'fontStretch', 'fontSize', 'lineHeight', 'fontFamily',
  'textAlign', 'textTransform', 'textIndent', 'letterSpacing', 'wordSpacing', 'tabSize',
] as const

/** Caret position in the field's border-box coordinates (mirror-div measurement). */
export function caretOffset(field: HTMLInputElement | HTMLTextAreaElement): { x: number; y: number } {
  const doc = field.ownerDocument
  const win = doc.defaultView
  const cs = win?.getComputedStyle(field)
  let pos = field.value.length
  try {
    pos = field.selectionEnd ?? pos
  } catch {
    // Some input types (email, number) don't expose a selection.
  }
  if (!cs) return { x: 0, y: field.clientHeight / 2 }
  const isInput = field.tagName === 'INPUT'
  const div = doc.createElement('div')
  const style = div.style
  for (const p of MIRROR_PROPS) style[p] = cs[p]
  style.position = 'absolute'
  style.visibility = 'hidden'
  style.top = '0'
  style.left = '-9999px'
  style.whiteSpace = isInput ? 'pre' : 'pre-wrap'
  style.wordWrap = isInput ? 'normal' : 'break-word'
  style.overflow = 'hidden'
  let text = field.value.slice(0, pos)
  if (isInput && (field as HTMLInputElement).type === 'password') text = '•'.repeat(text.length)
  div.textContent = text
  const mark = doc.createElement('span')
  mark.textContent = field.value.slice(pos) || '.'
  div.append(mark)
  doc.body.append(div)
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2 || 16
  let x = mark.offsetLeft - field.scrollLeft
  let y = isInput ? field.offsetHeight / 2 : mark.offsetTop - field.scrollTop + lh / 2
  div.remove()
  x = Math.max(0, Math.min(field.offsetWidth, x))
  y = Math.max(0, Math.min(field.offsetHeight, y))
  return { x, y }
}

// ---- attach --------------------------------------------------------------------------------

export interface InputOptions {
  /** Draw the invalid ring + drip. 'auto' (default) follows the field's aria-invalid, live. */
  invalid?: boolean | 'auto'
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** On focus goo flows around the border from the click point. Off: the ring just appears. */
  flow?: boolean | number
  /** A wobble where the two flow fronts meet and close the ring. */
  close?: boolean | number
  /** Typing sends ripples along the ring near the caret. */
  ripple?: boolean | number
  /** The closed ring wobbles gently while focused. */
  wobble?: boolean | number
  /** Blur drains the ring away, top first. Off: it vanishes. */
  drain?: boolean | number
  /** A small drip hangs off the bottom while invalid. */
  drip?: boolean | number
  /** Resting drips hang under the ring while it's shown. Default false. */
  drips?: boolean | number
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface InputHandle {
  update(opts?: InputOptions): void
  resize(): void
  /** Send a typing ripple from the caret (what an edit does). */
  ripple(): void
  readonly state: Readonly<InputGooState>
  readonly running: boolean
  readonly reducedMotion: boolean
  /** The pose last drawn. */
  readonly pose: InputRingPose | null
  destroy(): void
}

const effectsOf = (o: InputOptions): InputEffects => {
  const out = {} as InputEffects
  for (const k of INPUT_EFFECTS) out[k] = o[k] === undefined ? INPUT_DEFAULT_EFFECTS[k] : gooEffectValue(o[k])
  return out
}

/**
 * Attach the goo focus ring. `host` wraps `field` (it gets the goo layer and must be the
 * field's positioned ancestor; core makes it `position: relative` if static).
 */
export function attachInput(
  host: HTMLElement,
  field: HTMLInputElement | HTMLTextAreaElement,
  options: InputOptions = {},
): InputHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: InputOptions = { ...options }
  let feel = INPUT_FEEL[readPreset(host, opts.preset)]
  let effects = effectsOf(opts)
  const st = createInputGooState()
  let geom: InputGeometry = { x: 0, y: 0, width: 0, height: 0, radius: 0 }
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let ringCount = 0
  let last: InputRingPose | null = null
  let destroyed = false
  let lastDown: { x: number; y: number; t: number } | null = null
  let colorInvalid: boolean | null = null

  const readReduced = (): boolean => {
    const o = opts.reducedMotion
    return o === true || (o !== false && isReducedMotion(doc))
  }
  let reduced = readReduced()

  const readInvalid = (): boolean => {
    if (opts.invalid === true || opts.invalid === false) return opts.invalid
    const v = field.getAttribute('aria-invalid')
    return v !== null && v !== 'false'
  }

  const measure = (): InputGeometry => {
    const cs = win?.getComputedStyle(field)
    const radius = parseFloat(cs?.borderTopLeftRadius ?? '') || 0
    // offsetLeft/Top are relative to the host when the host is the offset parent.
    const hr = host.getBoundingClientRect()
    const fr = field.getBoundingClientRect()
    const viaRect = field.offsetParent !== host
    return {
      x: viaRect ? fr.left - hr.left : field.offsetLeft,
      y: viaRect ? fr.top - hr.top : field.offsetTop,
      width: field.offsetWidth || fr.width,
      height: field.offsetHeight || fr.height,
      radius,
    }
  }

  const paint = (): void => {
    if (!layer) return
    const invalid = st.invalid
    if (invalid !== colorInvalid) {
      colorInvalid = invalid
      const l = layer.layer.style
      l.setProperty(
        '--goop-color',
        invalid
          ? `var(${INPUT_INVALID_COLOR_VAR}, var(--destructive, #e7000b))`
          : `var(${INPUT_COLOR_VAR}, var(--ring, currentColor))`,
      )
      l.setProperty('opacity', invalid ? `var(${INPUT_INVALID_OPACITY_VAR}, 0.5)` : `var(${INPUT_OPACITY_VAR}, 0.5)`)
      layer.layer.toggleAttribute('data-goop-invalid', invalid)
    }
  }

  const draw = (): void => {
    if (!layer) return
    paint()
    last = inputRingPose(st, geom, ringCount, feel, effects, reduced)
    for (let i = 0; i < blobs.length; i++) {
      const c = last.circles[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
      else blobs[i]!.set(0, 0, 0)
    }
    layer.flush()
  }

  const padding = () => {
    const side = Math.ceil(feel.softness * 3 + feel.offset + feel.thickness * 3)
    return { side, bottom: side + Math.ceil(feel.drip * 5) }
  }

  const syncBlobs = (): void => {
    if (!layer) return
    ringCount = ringCircleCount(ringPerimeter(geom, feel.offset), feel.thickness)
    const want = ringCount + INPUT_DRIP_CIRCLES
    while (blobs.length < want) blobs.push(layer.createBlob())
    while (blobs.length > want) blobs.pop()!.remove()
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
    colorInvalid = null
  }

  const build = (): void => {
    teardown()
    geom = measure()
    layer = resolveRenderer(opts.renderer)(host, inputGooParams(feel))
    layer.layer.setAttribute('data-goop-part', 'input')
    layer.setBodyScale(0, 0)
    layer.setPadding(padding())
    syncBlobs()
    draw()
  }

  const relayout = (): void => {
    if (destroyed || !layer) return
    geom = measure()
    layer.setPadding(padding())
    syncBlobs()
    draw()
  }

  const tick: Ticker = (dt) => {
    if (destroyed || reduced) return false
    const moving = stepInputGoo(st, dt * Math.max(0.05, opts.speed ?? 1), feel, effects)
    draw()
    return moving
  }
  const kick = (): void => {
    if (destroyed) return
    if (reduced) {
      settleInputGoo(st, effects)
      removeTicker(tick)
      draw()
    } else {
      draw()
      wakeTicker(tick)
    }
  }

  const syncShown = (): void => {
    st.invalid = readInvalid()
    st.shown = st.focused || st.invalid
  }

  const onPointerDown = (ev: Event): void => {
    const e = ev as PointerEvent
    const r = host.getBoundingClientRect()
    lastDown = { x: e.clientX - r.left, y: e.clientY - r.top, t: Date.now() }
  }
  const onFocus = (): void => {
    const fresh = st.cover === 0 && st.drain === 0
    st.focused = true
    syncShown()
    if (fresh) {
      geom = measure()
      const down = lastDown && Date.now() - lastDown.t < 1000 ? lastDown : null
      lastDown = null
      const px = down ? down.x : geom.x
      const py = down ? down.y : geom.y + geom.height / 2
      st.origin = ringArcAt(geom, feel.offset, px, py)
      st.closeAge = Infinity
    }
    kick()
  }
  const onBlur = (): void => {
    st.focused = false
    st.time = 0
    syncShown()
    kick()
  }
  const ripple = (amp = 1): void => {
    if (reduced || effects.ripple <= 0) return
    const c = caretOffset(field)
    const below = field.tagName === 'INPUT' || c.y >= field.offsetHeight / 2
    const px = geom.x + c.x
    const py = below ? geom.y + geom.height : geom.y
    addInputRipple(st, ringArcAt(geom, feel.offset, px, py), amp)
    kick()
  }
  const onInput = (e: Event): void => {
    const type = (e as InputEvent).inputType ?? ''
    ripple(type.startsWith('delete') ? 0.7 : 1)
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  field.addEventListener('pointerdown', onPointerDown)
  field.addEventListener('focus', onFocus)
  field.addEventListener('blur', onBlur)
  field.addEventListener('input', onInput)

  st.focused = doc.activeElement === field
  syncShown()
  build()
  // Already focused/invalid at attach: show the settled ring (no flow on first paint).
  settleInputGoo(st, effects)
  kick()

  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => relayout()) : undefined
  ro?.observe(host)
  ro?.observe(field)
  const MO = win?.MutationObserver
  const mo = MO
    ? new MO(() => {
        const was = st.invalid
        syncShown()
        if (was !== st.invalid) {
          if (st.shown && st.cover === 0 && st.drain === 0) {
            st.origin = ringArcAt(geom, feel.offset, geom.x, geom.y + geom.height / 2)
          }
          kick()
        }
      })
    : undefined
  mo?.observe(field, { attributes: true, attributeFilter: ['aria-invalid'] })
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    kick()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = INPUT_FEEL[readPreset(host, opts.preset)]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      effects = effectsOf(opts)
      reduced = readReduced()
      const was = st.invalid
      syncShown()
      if (rebuild) build()
      else relayout()
      if (was !== st.invalid && st.shown && st.cover === 0 && st.drain === 0) {
        st.origin = ringArcAt(geom, feel.offset, geom.x, geom.y + geom.height / 2)
      }
      kick()
    },
    resize: relayout,
    ripple: () => ripple(1),
    get state() {
      return st
    },
    get running() {
      return !destroyed && !reduced && layer !== null && stepInputGoo({ ...st, ripples: [...st.ripples] }, 0, feel, effects)
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
      field.removeEventListener('pointerdown', onPointerDown)
      field.removeEventListener('focus', onFocus)
      field.removeEventListener('blur', onBlur)
      field.removeEventListener('input', onInput)
      teardown()
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

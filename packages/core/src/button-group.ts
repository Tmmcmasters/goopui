// Button group goo: the buttons of a group (shadcn's ButtonGroup: joined edges, one outer
// radius) behave like one soft body with ONE shared goo layer behind them.
//
// Hover / focus: a goo blob (the menu highlight engine, `./menu`) is the buttons' hover
// background and slides between them with momentum, trailing a low mound; its swell sits
// under the pointer (`followPointer`). It lights the hovered (mouse / pen) button, else the
// keyboard-focused one. No sticky hover on touch: there it shows only while pressed.
//
// Press: the goo under the pressed button swells into a low, wide mound past its edges
// (`bulge`, raised cosine, never a knob) and sends a ripple of goo into its neighbours
// (`ripple`: two soft lumps that travel outward and thin away), then settles with a jelly
// rebound. On top, the buttons themselves flex (transforms): the pressed one squishes (a
// little shorter across the group, a little longer along it) and its neighbours are tugged
// toward it from their far edges (`tug`).
//
// No gaps or seams: every member only ever grows along the group's axis, so joined edges
// overlap and never open. Transforms and an absolutely positioned goo layer never change
// layout or scroll size. Reduced motion: a static highlight, no press motion.
// No DOM access until `attachButtonGroup` is called (SSR-safe); the poses are pure.

import { BREADCRUMB_FEEL } from './breadcrumb'
import { GOOP_DEFAULT_PRESET, type GoopPreset, type SpringFeel } from './constants'
import type { EmergeCircle, EmergeRect } from './emerge'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { attachMenuHighlight, type MenuFeel, type MenuHighlightHandle } from './menu'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopRendererOption } from './renderers/resolve'
import { effectStrength } from './skeleton'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable button group effects (boolean or multiplier).
 *  `press`: the pressed button's squish. `tug`: its neighbours are pulled toward it.
 *  `highlight`: the hover / focus goo blob. `wobble`: its jelly landing. `momentum`: it
 *  stretches and trails while it travels. `followPointer`: its swell sits under the pointer.
 *  `bulge`: the goo under the pressed button swells past its edges. `ripple`: the press sends
 *  goo into the neighbours. */
export const BUTTON_GROUP_EFFECTS = ['press', 'tug', 'highlight', 'wobble', 'momentum', 'followPointer', 'bulge', 'ripple'] as const
export type ButtonGroupEffect = (typeof BUTTON_GROUP_EFFECTS)[number]

export type ButtonGroupOrientation = 'horizontal' | 'vertical'

export interface ButtonGroupFeel {
  /** Pressed button: squish across the group's axis, spread along it (fractions). */
  squish: number
  spread: number
  /** Nearest neighbour: how far its near edge is pulled toward the pressed button (px), and
   *  how much of the pressed squish it shares (fraction). */
  pull: number
  share: number
  /** Each further neighbour gets this fraction of the previous one's tug. */
  falloff: number
  /** Going down: quick. Coming back: softer, under-damped (the jelly rebound). */
  down: SpringFeel
  up: SpringFeel
  /** Shortest visible press (s). */
  hold: number
  /** Press bulge: how far the goo swells past the pressed button's edges at full depth (px). */
  bulge: number
  /** Ripple: the lumps' extra size as they leave (px), how far they travel (in button
   *  thicknesses) and how long they take (s). */
  ripple: number
  rippleReach: number
  rippleTime: number
}

export const BUTTON_GROUP_FEEL: Readonly<Record<GoopPreset, Readonly<ButtonGroupFeel>>> = Object.freeze({
  subtle: Object.freeze({
    squish: 0.04,
    spread: 0.015,
    pull: 1.2,
    share: 0.5,
    falloff: 0.4,
    down: { response: 0.09, dampingRatio: 0.9 },
    up: { response: 0.26, dampingRatio: 0.6 },
    hold: 0.06,
    bulge: 2,
    ripple: 1.5,
    rippleReach: 0.9,
    rippleTime: 0.4,
  }),
  playful: Object.freeze({
    squish: 0.06,
    spread: 0.025,
    pull: 2,
    share: 0.6,
    falloff: 0.45,
    down: { response: 0.09, dampingRatio: 0.85 },
    up: { response: 0.3, dampingRatio: 0.45 },
    hold: 0.07,
    bulge: 3,
    ripple: 2.5,
    rippleReach: 1.3,
    rippleTime: 0.5,
  }),
  wild: Object.freeze({
    squish: 0.1,
    spread: 0.04,
    pull: 3.5,
    share: 0.7,
    falloff: 0.5,
    down: { response: 0.1, dampingRatio: 0.8 },
    up: { response: 0.34, dampingRatio: 0.35 },
    hold: 0.08,
    bulge: 4.5,
    ripple: 3.5,
    rippleReach: 1.8,
    rippleTime: 0.6,
  }),
})

/** Per-preset feel of the hover / focus blob: the breadcrumb's (the tabs' sideways travel,
 *  calmed, plus the menu's pointer swell), with a firmer head and grow-in so the blob stays
 *  close to the group's outline at its ends (a little overshoot, not a fling past the edge). */
const firm = (f: Readonly<MenuFeel>): Readonly<MenuFeel> =>
  Object.freeze({
    ...f,
    head: { response: f.head.response, dampingRatio: Math.min(0.92, f.head.dampingRatio + 0.12) },
    decay: f.decay * 1.6,
  })
export const BUTTON_GROUP_HIGHLIGHT_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: firm(BREADCRUMB_FEEL.subtle),
  playful: firm(BREADCRUMB_FEEL.playful),
  wild: firm(BREADCRUMB_FEEL.wild),
})

export interface ButtonGroupOptions {
  /** The pressed button's squish. `false`: off; `true`: the preset's; a number scales it. */
  press?: boolean | number
  /** Neighbours tugged toward the pressed button. `false`: off; a number scales it. */
  tug?: boolean | number
  /** The hover / focus goo blob behind the buttons. `false`: shadcn's own hover backgrounds. */
  highlight?: boolean | number
  /** The blob's jelly landing (false: critically damped). */
  wobble?: boolean | number
  /** The blob stretches and trails a low mound while it travels. */
  momentum?: boolean | number
  /** The blob's low swell sits under the pointer (false: centred). */
  followPointer?: boolean | number
  /** The goo under the pressed button swells past its edges. A number scales it. */
  bulge?: boolean | number
  /** The press sends goo into the neighbours. A number scales it. */
  ripple?: boolean | number
  /** Default: the group's `data-orientation`, else horizontal. */
  orientation?: ButtonGroupOrientation
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** `true` keeps the group static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface ButtonGroupHandle {
  /** Press member `index` (as if it were pressed). */
  press(index: number): void
  release(): void
  /** Light member `index` with the highlight blob (-1: none), as a hover would. */
  light(index: number): void
  update(options: ButtonGroupOptions): void
  /** The pressed member's index, or -1. */
  readonly pressed: number
  /** The lit member's index, or -1. */
  readonly lit: number
  readonly running: boolean
  /** The aria-hidden goo layer element, while the goo is on. */
  readonly element: HTMLElement | null
  destroy(): void
}

/** A member's transform: scale along / across the group's axis and the origin along it
 *  (0 = its start edge, 0.5 = centre, 1 = its end edge). */
export interface ButtonGroupMemberPose {
  along: number
  across: number
  origin: number
}

const REST: ButtonGroupMemberPose = Object.freeze({ along: 1, across: 1, origin: 0.5 })

/**
 * The pose of member `index` (size `size` px along the group's axis) while member `pressed`
 * is pressed to depth `p` (0 = rest, 1 = full; under 0 = the rebound). Pure. Every member only
 * ever grows along the axis (no seams open), the pressed one about its centre and each
 * neighbour from its far edge toward the pressed one.
 */
export function buttonGroupPose(
  index: number,
  pressed: number,
  p: number,
  size: number,
  feel: ButtonGroupFeel = BUTTON_GROUP_FEEL.playful,
  press = 1,
  tug = 1,
): ButtonGroupMemberPose {
  if (pressed < 0 || !(size > 0) || p === 0) return REST
  const d = Math.max(-0.5, Math.min(1.2, p))
  if (index === pressed) {
    if (!(press > 0)) return REST
    // On the rebound (d < 0) it stretches across a little, but never shrinks along the axis.
    return { along: 1 + feel.spread * press * Math.max(0, d), across: 1 - feel.squish * press * d, origin: 0.5 }
  }
  if (!(tug > 0)) return REST
  const k = Math.abs(index - pressed)
  const f = feel.falloff ** (k - 1) * tug
  const pull = Math.max(0, feel.pull * f * d)
  return {
    along: 1 + pull / size,
    across: 1 - feel.squish * Math.max(0, press) * feel.share * f * d,
    // Anchored at the far edge: the near edge moves toward the pressed button.
    origin: index < pressed ? 0 : 1,
  }
}

/** Circles tracing the press bulge (a low, wide mound of overlapping circles along each
 *  long edge: two rows of 7). */
export const BUTTON_GROUP_BULGE_CIRCLES = 14
/** Circles per ripple lump (two lumps: one each way along the group). */
export const BUTTON_GROUP_LUMP_CIRCLES = 3
/** Circles a goo pose returns: the bulge, then the two ripple lumps. */
export const BUTTON_GROUP_GOO_CIRCLES = BUTTON_GROUP_BULGE_CIRCLES + 2 * BUTTON_GROUP_LUMP_CIRCLES

/** Input of `buttonGroupGooPose`: the pressed member and the group, in the group's
 *  coordinates. */
export interface ButtonGroupGooInput {
  /** The pressed member's rect (null: nothing pressed). */
  pressed: EmergeRect | null
  /** The group's span along its axis (px): from `start` to `end`. */
  start: number
  end: number
  vertical: boolean
  /** Press depth (the press spring: 0 rest, 1 full, under 0 the rebound). */
  depth: number
  /** Ripple progress, 0..1 (1 or more: done). */
  ripple: number
  /** Strengths (0 = off; 1 = the preset's). */
  bulgeStrength?: number
  rippleStrength?: number
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const zero = (): EmergeCircle => ({ x: 0, y: 0, r: 0 })

/**
 * The press goo of a button group: a low, wide mound across the pressed button that swells
 * `bulge` px past its edges at full depth (raised cosine, zero slope at the peak and where it
 * meets the edges: never a knob), plus two ripple lumps that leave its ends, travel into the
 * neighbours and thin away. BUTTON_GROUP_GOO_CIRCLES circles (zero-radius when unused), in
 * the group's coordinates. Pure.
 */
export function buttonGroupGooPose(input: ButtonGroupGooInput, feel: ButtonGroupFeel = BUTTON_GROUP_FEEL.playful): EmergeCircle[] {
  const out: EmergeCircle[] = Array.from({ length: BUTTON_GROUP_GOO_CIRCLES }, zero)
  const r = input.pressed
  if (!r || !(r.width > 0) || !(r.height > 0)) return out
  const v = input.vertical
  // Along / across the group's axis.
  const a0 = v ? r.y : r.x
  const len = v ? r.height : r.width
  const thick = v ? r.width : r.height
  const half = thick / 2
  const mid = a0 + len / 2
  const cross = v ? r.x + half : r.y + half
  const put = (i: number, along: number, rad: number): void => {
    out[i] = v ? { x: cross, y: along, r: rad } : { x: along, y: cross, r: rad }
  }

  const bulge = feel.bulge * Math.max(0, input.bulgeStrength ?? 1) * clamp(input.depth, 0, 1.2)
  if (bulge > 0.05) {
    // One row of circles along each long edge, each sitting just inside the button so only
    // `g` pokes past it. Their radius fits the button's length, so the mound never runs past
    // its ends (a square icon button gets a soft swell on two sides, not a ball).
    const R = Math.max(1, Math.min(half, len * 0.3))
    const hw = Math.max(0, len / 2 - R)
    const per = BUTTON_GROUP_BULGE_CIRCLES / 2
    for (let i = 0; i < per; i++) {
      const f = -1 + (2 * (i + 1)) / (per + 1)
      const g = (bulge * (1 + Math.cos(Math.PI * f))) / 2
      if (g < 0.05) continue
      const along = mid + f * hw
      const off = half - (R - g)
      for (const side of [-1, 1] as const) {
        const k = i * 2 + (side < 0 ? 0 : 1)
        out[k] = v ? { x: cross + side * off, y: along, r: R } : { x: along, y: cross + side * off, r: R }
      }
    }
  }

  const strength = Math.max(0, input.rippleStrength ?? 1)
  const u = input.ripple
  if (strength > 0 && u >= 0 && u < 1) {
    // Out quick, then slow (ease-out); thins from a lump about as thick as the button to a
    // small bead that the goo threshold dissolves.
    const travel = 1 - (1 - u) ** 3
    const reach = feel.rippleReach * thick * Math.min(1.5, strength)
    const rad = half * lerp(0.82, 0.3, u ** 1.2) + feel.ripple * strength * (1 - u) ** 1.5
    for (const dir of [-1, 1] as const) {
      const edge = dir < 0 ? a0 : a0 + len
      const room = dir < 0 ? edge - input.start : input.end - edge
      if (room < 2) continue
      // The lump starts on the button's end and stays inside the group.
      const lo = input.start + rad
      const hi = input.end - rad
      const c = clamp(edge - dir * half * 0.6 + dir * reach * travel, Math.min(lo, hi), Math.max(lo, hi))
      const base = BUTTON_GROUP_BULGE_CIRCLES + (dir < 0 ? 0 : BUTTON_GROUP_LUMP_CIRCLES)
      put(base, c, rad)
      put(base + 1, c - dir * rad * 0.55, rad * 0.84)
      put(base + 2, c - dir * rad * 1.05, rad * 0.62)
    }
  }
  return out
}

/** Members a press can start on: buttons and links (not inputs, text or separators). */
export const BUTTON_GROUP_PRESSABLE = 'button, a[href], [role="button"], [data-slot="button"]'
/** Set on the group while the highlight blob is on (the members drop their own hover bg). */
export const BUTTON_GROUP_HIGHLIGHT_ATTR = 'data-goop-group-highlight'
/** Set by core on the member the blob lights. */
export const BUTTON_GROUP_LIT_ATTR = 'data-goop-lit'

const r4 = (v: number): string => (Math.round(v * 10000) / 10000).toString()

/** Attach the goo to a button group (shadcn's ButtonGroup, `role="group"`). Appends an
 *  aria-hidden `[data-goop="highlight"]` goo layer as the group's last child (colored by
 *  `--goop-color` on it) while the highlight, bulge or ripple is on. */
export function attachButtonGroup(group: HTMLElement, initial: ButtonGroupOptions = {}): ButtonGroupHandle {
  const doc = group.ownerDocument
  const win = doc.defaultView
  let options: ButtonGroupOptions = { ...initial }
  const readReduced = (): boolean =>
    options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const s: SpringState = { x: 0, v: 0 }
  let target = 0
  let holdLeft = 0
  let releasing = false
  let moving = false
  let pressedIndex = -1
  /** Ripple progress (0..1; 1 = done). */
  let ripple = 1
  /** The pressed member and the group's span, measured at press (group coordinates). */
  let pressedRect: EmergeRect | null = null
  let span = { start: 0, end: 0 }
  let feel: ButtonGroupFeel = BUTTON_GROUP_FEEL[GOOP_DEFAULT_PRESET]
  /** Members touched this press, with their own inline transform to restore. */
  let touched = new Map<HTMLElement, { transform: string; origin: string }>()
  let goo: MenuHighlightHandle | null = null
  let lit: HTMLElement | null = null
  let touchLit = false
  let destroyed = false

  const strength = (k: ButtonGroupEffect): number => effectStrength(options[k])
  const speed = (): number => (options.speed && options.speed > 0 ? options.speed : 1)
  const flexOn = (): boolean => !reduced && (strength('press') > 0 || strength('tug') > 0)
  const gooOn = (): boolean => strength('highlight') > 0 || strength('bulge') > 0 || strength('ripple') > 0
  const active = (): boolean => !reduced && (flexOn() || strength('bulge') > 0 || strength('ripple') > 0)
  const vertical = (): boolean =>
    (options.orientation ?? (group.getAttribute('data-orientation') as ButtonGroupOrientation | null)) === 'vertical'
  const members = (): HTMLElement[] =>
    [...group.children].filter((c): c is HTMLElement => c instanceof (win?.HTMLElement ?? HTMLElement) && !c.hasAttribute('data-goop'))
  const pressable = (m: Element | undefined): boolean =>
    !!m &&
    m.matches(BUTTON_GROUP_PRESSABLE) &&
    !m.hasAttribute('disabled') &&
    m.getAttribute('aria-disabled') !== 'true' &&
    !m.hasAttribute('data-disabled')

  // ---- goo layer (highlight + press goo, one body) ----

  const rectOf = (el: Element): EmergeRect => {
    const c = group.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return {
      x: r.left - c.left - group.clientLeft + group.scrollLeft,
      y: r.top - c.top - group.clientTop + group.scrollTop,
      width: r.width,
      height: r.height,
    }
  }
  const gooCircles = (): EmergeCircle[] =>
    reduced
      ? []
      : buttonGroupGooPose(
          {
            pressed: pressedRect,
            start: span.start,
            end: span.end,
            vertical: vertical(),
            depth: s.x,
            ripple,
            bulgeStrength: strength('bulge'),
            rippleStrength: strength('ripple'),
          },
          feel,
        )
  const highlightOptions = () => ({
    feel: BUTTON_GROUP_HIGHLIGHT_FEEL,
    wobble: strength('wobble') > 0,
    momentum: strength('momentum') > 0,
    followPointer: strength('followPointer') > 0,
    speed: speed(),
    preset: options.preset,
    renderer: options.renderer,
    reducedMotion: options.reducedMotion,
    pop: false,
  })
  const syncGoo = (): void => {
    if (gooOn() && !goo) {
      goo = attachMenuHighlight(
        group,
        { ...highlightOptions(), find: () => (strength('highlight') > 0 ? lit : null) },
        { placement: 'last', extra: { count: BUTTON_GROUP_GOO_CIRCLES, circles: gooCircles, moving: () => moving } },
      )
    } else if (!gooOn() && goo) {
      goo.destroy()
      goo = null
    } else goo?.update(highlightOptions())
    if (goo && strength('highlight') > 0) group.setAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR, '')
    else group.removeAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)
  }

  const light = (el: HTMLElement | null): void => {
    if (el === lit) return
    lit?.removeAttribute(BUTTON_GROUP_LIT_ATTR)
    lit = el
    lit?.setAttribute(BUTTON_GROUP_LIT_ATTR, '')
    goo?.refresh()
  }

  // ---- press (transforms + press goo) ----

  const restore = (): void => {
    for (const [el, prev] of touched) {
      el.style.transform = prev.transform
      el.style.transformOrigin = prev.origin
    }
    touched = new Map()
  }

  const draw = (): void => {
    goo?.refresh()
    if (!flexOn()) return
    const list = members()
    const v = vertical()
    const press = strength('press')
    const tug = strength('tug')
    for (let i = 0; i < list.length; i++) {
      const el = list[i]!
      const size = v ? el.offsetHeight : el.offsetWidth
      const pose = buttonGroupPose(i, pressedIndex, s.x, size, feel, press, tug)
      if (pose === REST && !touched.has(el)) continue
      if (!touched.has(el)) touched.set(el, { transform: el.style.transform, origin: el.style.transformOrigin })
      const sx = v ? pose.across : pose.along
      const sy = v ? pose.along : pose.across
      el.style.transformOrigin = v ? `50% ${pose.origin * 100}%` : `${pose.origin * 100}% 50%`
      el.style.transform = `scale(${r4(sx)}, ${r4(sy)})`
    }
  }

  const rest = (): void => {
    s.x = 0
    s.v = 0
    moving = false
    pressedIndex = -1
    pressedRect = null
    ripple = 1
    restore()
    goo?.refresh()
  }

  const tick: Ticker = (dt) => {
    const step = dt * speed()
    if (holdLeft > 0) holdLeft -= step
    if (releasing && holdLeft <= 0) {
      releasing = false
      target = 0
    }
    if (ripple < 1) ripple = Math.min(1, ripple + step / Math.max(0.05, feel.rippleTime))
    stepSpring(s, target, springConfig(target > 0 ? feel.down : feel.up), step)
    if (target === 0 && !releasing && ripple >= 1 && isSpringSettled(s, 0, 0.002, 0.02)) {
      rest()
      return false
    }
    draw()
    if (target > 0 && ripple >= 1 && isSpringSettled(s, target, 0.002, 0.02)) {
      moving = false
      return false
    }
    return true
  }

  const wake = (): void => {
    moving = true
    wakeTicker(tick)
  }

  const pressAt = (index: number): void => {
    if (destroyed || !active() || index < 0) return
    const list = members()
    const el = list[index]
    if (!el) return
    feel = BUTTON_GROUP_FEEL[readPreset(group, options.preset)] ?? BUTTON_GROUP_FEEL[GOOP_DEFAULT_PRESET]
    if (index !== pressedIndex) restore()
    pressedIndex = index
    // Measured before this press's transforms (neighbours may still be springing back).
    pressedRect = rectOf(el)
    const v = vertical()
    const first = list[0] ? rectOf(list[0]) : pressedRect
    const last = list[list.length - 1] ? rectOf(list[list.length - 1]!) : pressedRect
    span = v ? { start: first.y, end: last.y + last.height } : { start: first.x, end: last.x + last.width }
    ripple = strength('ripple') > 0 ? 0 : 1
    target = 1
    releasing = false
    holdLeft = feel.hold
    wake()
  }
  const release = (): void => {
    if (target === 0) return
    releasing = true
    wake()
  }

  /** The member an event happened on (a direct child of the group), or -1. */
  const memberIndex = (t: EventTarget | null): number => {
    if (!win || !(t instanceof win.Element)) return -1
    return members().findIndex((m) => m.contains(t))
  }
  /** The pressable member an event started on, or -1. */
  const memberOf = (t: EventTarget | null): number => {
    const i = memberIndex(t)
    return pressable(members()[i]) ? i : -1
  }
  const focusVisible = (el: Element | null): boolean => {
    try {
      return !!el && el.contains(doc.activeElement) && (doc.activeElement?.matches(':focus-visible') ?? false)
    } catch {
      return false
    }
  }
  const focusedMember = (): HTMLElement | null => {
    const i = memberOf(doc.activeElement)
    const m = i >= 0 ? members()[i]! : null
    return m && focusVisible(m) ? m : null
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button > 0) return
    const i = memberOf(e.target)
    if (i >= 0 && e.pointerType === 'touch') {
      // No sticky hover on touch: the blob shows only while the finger is down.
      touchLit = true
      light(members()[i]!)
    }
    pressAt(i)
  }
  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return
    const i = memberIndex(e.target)
    const m = members()[i]
    if (pressable(m)) light(m!)
    // A separator between two buttons keeps the last one lit (no flicker); text, inputs and
    // disabled buttons are never lit.
    else if (m && !m.matches('[data-slot="button-group-separator"], [role="separator"]')) light(null)
  }
  const onLeave = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return
    light(focusedMember())
  }
  const onFocus = (e: FocusEvent): void => {
    const i = memberOf(e.target)
    const m = i >= 0 ? members()[i]! : null
    if (m && focusVisible(m)) light(m)
  }
  const onBlur = (): void => {
    // After focus settles: keep a hovered button lit, else whichever button has focus.
    queueMicrotask(() => {
      if (lit && lit.matches(':hover') && !touchLit) return
      light(focusedMember())
    })
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat && target > 0) return
    pressAt(memberOf(e.target))
  }
  const onUp = (): void => {
    release()
    if (touchLit) {
      touchLit = false
      light(focusedMember())
    }
  }
  group.addEventListener('pointerdown', onPointerDown, { passive: true })
  group.addEventListener('pointerover', onOver, { passive: true })
  group.addEventListener('pointerleave', onLeave, { passive: true })
  group.addEventListener('focusin', onFocus)
  group.addEventListener('focusout', onBlur)
  group.addEventListener('keydown', onKeyDown)
  group.addEventListener('keyup', onUp)
  win?.addEventListener('pointerup', onUp, { passive: true })
  win?.addEventListener('pointercancel', onUp, { passive: true })
  win?.addEventListener('blur', onUp)

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      removeTicker(tick)
      target = 0
      releasing = false
      rest()
    }
  })

  syncGoo()

  return {
    press: pressAt,
    release,
    light(index) {
      const m = members()[index]
      light(index >= 0 && pressable(m) ? m! : null)
    },
    update(next) {
      if (destroyed) return
      options = { ...next }
      reduced = readReduced()
      if (!active()) {
        removeTicker(tick)
        target = 0
        releasing = false
        rest()
      }
      syncGoo()
    },
    get pressed() {
      return target > 0 ? pressedIndex : -1
    },
    get lit() {
      return lit ? members().indexOf(lit) : -1
    },
    get running() {
      return moving
    },
    get element() {
      return goo?.element ?? null
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      target = 0
      rest()
      group.removeEventListener('pointerdown', onPointerDown)
      group.removeEventListener('pointerover', onOver)
      group.removeEventListener('pointerleave', onLeave)
      group.removeEventListener('focusin', onFocus)
      group.removeEventListener('focusout', onBlur)
      group.removeEventListener('keydown', onKeyDown)
      group.removeEventListener('keyup', onUp)
      win?.removeEventListener('pointerup', onUp)
      win?.removeEventListener('pointercancel', onUp)
      win?.removeEventListener('blur', onUp)
      stopWatch()
      light(null)
      goo?.destroy()
      goo = null
      group.removeAttribute(BUTTON_GROUP_HIGHLIGHT_ATTR)
    },
  }
}

// Button group goo: the buttons of a group (shadcn's ButtonGroup: joined edges, one outer
// radius) behave like one soft body. Pressing a button squishes it (a little shorter across
// the group, a little longer along it) and tugs its neighbours toward it: the nearest one's
// near edge is pulled in by a couple of px while its far edge stays put, the next one a little
// less, so the group flexes as one piece of goo. On release everything springs back with a
// small jelly rebound.
//
// No gaps or seams: every member only ever grows along the group's axis (the pressed one
// spreads, the neighbours stretch toward it from their far edge), so joined edges overlap and
// never open. Cheap on purpose: transforms on the members, driven by one spring on the shared
// frame loop only while it moves. Transforms never change layout (no layout shift, no scroll
// growth). Reduced motion: no squish, a static group.
// No DOM access until `attachButtonGroup` is called (SSR-safe); `buttonGroupPose` is pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset, type SpringFeel } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable button group effects (boolean or multiplier). `press`: the pressed
 *  button's squish. `tug`: its neighbours are pulled toward it. */
export const BUTTON_GROUP_EFFECTS = ['press', 'tug'] as const
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
}

export const BUTTON_GROUP_FEEL: Readonly<Record<GoopPreset, Readonly<ButtonGroupFeel>>> = Object.freeze({
  subtle: Object.freeze({ squish: 0.05, spread: 0.02, pull: 1.5, share: 0.5, falloff: 0.4, down: { response: 0.09, dampingRatio: 0.9 }, up: { response: 0.26, dampingRatio: 0.6 }, hold: 0.06 }),
  playful: Object.freeze({ squish: 0.08, spread: 0.03, pull: 2.5, share: 0.6, falloff: 0.45, down: { response: 0.09, dampingRatio: 0.85 }, up: { response: 0.3, dampingRatio: 0.45 }, hold: 0.07 }),
  wild: Object.freeze({ squish: 0.12, spread: 0.045, pull: 4, share: 0.7, falloff: 0.5, down: { response: 0.1, dampingRatio: 0.8 }, up: { response: 0.34, dampingRatio: 0.35 }, hold: 0.08 }),
})

export interface ButtonGroupOptions {
  /** The pressed button's squish. `false`: off; `true`: the preset's; a number scales it. */
  press?: boolean | number
  /** Neighbours tugged toward the pressed button. `false`: off; a number scales it. */
  tug?: boolean | number
  /** Default: the group's `data-orientation`, else horizontal. */
  orientation?: ButtonGroupOrientation
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the group static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface ButtonGroupHandle {
  /** Press member `index` (as if it were pressed). */
  press(index: number): void
  release(): void
  update(options: ButtonGroupOptions): void
  /** The pressed member's index, or -1. */
  readonly pressed: number
  readonly running: boolean
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

/** Members a press can start on: buttons and links (not inputs, text or separators). */
export const BUTTON_GROUP_PRESSABLE = 'button, a[href], [role="button"], [data-slot="button"]'

const r4 = (v: number): string => (Math.round(v * 10000) / 10000).toString()

/** Attach the goo press to a button group (shadcn's ButtonGroup, `role="group"`). */
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
  let feel: ButtonGroupFeel = BUTTON_GROUP_FEEL[GOOP_DEFAULT_PRESET]
  /** Members touched this press, with their own inline transform to restore. */
  let touched = new Map<HTMLElement, { transform: string; origin: string }>()

  const press = (): number => effectStrength(options.press)
  const tug = (): number => effectStrength(options.tug)
  const speed = (): number => (options.speed && options.speed > 0 ? options.speed : 1)
  const active = (): boolean => !reduced && (press() > 0 || tug() > 0)
  const vertical = (): boolean =>
    (options.orientation ?? (group.getAttribute('data-orientation') as ButtonGroupOrientation | null)) === 'vertical'
  const members = (): HTMLElement[] => [...group.children].filter((c): c is HTMLElement => c instanceof (win?.HTMLElement ?? HTMLElement) && !c.hasAttribute('data-goop'))

  const restore = (): void => {
    for (const [el, prev] of touched) {
      el.style.transform = prev.transform
      el.style.transformOrigin = prev.origin
    }
    touched = new Map()
  }

  const draw = (): void => {
    const list = members()
    const v = vertical()
    for (let i = 0; i < list.length; i++) {
      const el = list[i]!
      const size = v ? el.offsetHeight : el.offsetWidth
      const pose = buttonGroupPose(i, pressedIndex, s.x, size, feel, press(), tug())
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
    restore()
  }

  const tick: Ticker = (dt) => {
    const step = dt * speed()
    if (holdLeft > 0) holdLeft -= step
    if (releasing && holdLeft <= 0) {
      releasing = false
      target = 0
    }
    stepSpring(s, target, springConfig(target > 0 ? feel.down : feel.up), step)
    if (target === 0 && !releasing && isSpringSettled(s, 0, 0.002, 0.02)) {
      rest()
      return false
    }
    draw()
    if (target > 0 && isSpringSettled(s, target, 0.002, 0.02)) {
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
    if (!active() || index < 0) return
    feel = BUTTON_GROUP_FEEL[readPreset(group, options.preset)] ?? BUTTON_GROUP_FEEL[GOOP_DEFAULT_PRESET]
    if (index !== pressedIndex) restore()
    pressedIndex = index
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

  /** The pressable member an event started on (a direct child of the group), or -1. */
  const memberOf = (t: EventTarget | null): number => {
    if (!win || !(t instanceof win.Element)) return -1
    const list = members()
    const i = list.findIndex((m) => m.contains(t))
    const m = list[i]
    if (!m || !m.matches(BUTTON_GROUP_PRESSABLE)) return -1
    if (m.hasAttribute('disabled') || m.getAttribute('aria-disabled') === 'true' || m.hasAttribute('data-disabled')) return -1
    return i
  }
  const onPointerDown = (e: PointerEvent): void => {
    if (e.button > 0) return
    pressAt(memberOf(e.target))
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    if (e.repeat && target > 0) return
    pressAt(memberOf(e.target))
  }
  const onUp = (): void => release()
  group.addEventListener('pointerdown', onPointerDown, { passive: true })
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

  return {
    press: pressAt,
    release,
    update(next) {
      options = { ...next }
      reduced = readReduced()
      if (!active()) {
        removeTicker(tick)
        target = 0
        releasing = false
        rest()
      }
    },
    get pressed() {
      return target > 0 ? pressedIndex : -1
    },
    get running() {
      return moving
    },
    destroy() {
      removeTicker(tick)
      target = 0
      rest()
      group.removeEventListener('pointerdown', onPointerDown)
      group.removeEventListener('keydown', onKeyDown)
      group.removeEventListener('keyup', onUp)
      win?.removeEventListener('pointerup', onUp)
      win?.removeEventListener('pointercancel', onUp)
      win?.removeEventListener('blur', onUp)
      stopWatch()
    },
  }
}

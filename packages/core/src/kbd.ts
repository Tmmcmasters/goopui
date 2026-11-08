// Kbd key-press squish: a <kbd> squishes down into its base like a soft key when the matching
// key is pressed on the keyboard (opt-in `keys`, e.g. ['Meta', 'K']) or when it is clicked
// (adapters make the kbd take pointer events while the squish is on),
// and springs back up with a small jelly rebound when released. A tap shorter than a frame
// still shows a full press.
//
// Cheap on purpose: a transform on the kbd itself (scale about its bottom edge, a sub-px
// sink), driven by two springs on the shared frame loop only while it moves. Transforms never
// change layout, so nothing around it shifts. Reduced motion: no squish, a static kbd.
// No DOM access until `attachKbd` is called (SSR-safe); `kbdPose` / `kbdMatches` are pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset, type SpringFeel } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable kbd effects (boolean or multiplier). */
export const KBD_EFFECTS = ['press'] as const
export type KbdEffect = (typeof KBD_EFFECTS)[number]

export interface KbdFeel {
  /** Vertical squish at a full press (fraction of the height). */
  squish: number
  /** Sideways spread at a full press (fraction of the width): the goo bulges out as it squishes. */
  spread: number
  /** How far it sinks at a full press (px). */
  sink: number
  /** Going down: quick and nearly critically damped. */
  down: SpringFeel
  /** Coming back up: softer, under-damped (the jelly rebound). */
  up: SpringFeel
  /** Shortest visible press (s), so a quick tap or a key repeat still reads. */
  hold: number
}

export const KBD_FEEL: Readonly<Record<GoopPreset, Readonly<KbdFeel>>> = Object.freeze({
  subtle: Object.freeze({ squish: 0.06, spread: 0.03, sink: 0.5, down: { response: 0.08, dampingRatio: 0.9 }, up: { response: 0.22, dampingRatio: 0.6 }, hold: 0.06 }),
  playful: Object.freeze({ squish: 0.1, spread: 0.05, sink: 1, down: { response: 0.08, dampingRatio: 0.85 }, up: { response: 0.26, dampingRatio: 0.45 }, hold: 0.07 }),
  wild: Object.freeze({ squish: 0.16, spread: 0.08, sink: 1.5, down: { response: 0.09, dampingRatio: 0.8 }, up: { response: 0.3, dampingRatio: 0.35 }, hold: 0.08 }),
})

export interface KbdOptions {
  /** The squish. `false`: off; `true`: the preset's; a number scales it. */
  press?: boolean | number
  /** Keyboard keys that press it (KeyboardEvent.key names, or 'Meta' / 'Cmd' / '⌘', 'Ctrl',
   *  'Alt' / 'Option' / '⌥', 'Shift' / '⇧'). All of them held = pressed. Default: none
   *  (clicks only). */
  keys?: readonly string[]
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the kbd static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface KbdHandle {
  /** Press it down (as if its key went down). */
  press(): void
  /** Let it spring back up. */
  release(): void
  /** Press and release (a tap). */
  tap(): void
  update(options: KbdOptions): void
  /** Is it held down? */
  readonly pressed: boolean
  /** Is it moving? */
  readonly running: boolean
  destroy(): void
}

type Modifier = 'meta' | 'ctrl' | 'alt' | 'shift'
const MODIFIERS: Record<string, Modifier> = {
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  '⌘': 'meta',
  win: 'meta',
  super: 'meta',
  ctrl: 'ctrl',
  control: 'ctrl',
  '⌃': 'ctrl',
  alt: 'alt',
  option: 'alt',
  opt: 'alt',
  '⌥': 'alt',
  shift: 'shift',
  '⇧': 'shift',
}
const ALIASES: Record<string, string> = { esc: 'escape', return: 'enter', '⏎': 'enter', '↵': 'enter', space: ' ', spacebar: ' ', del: 'delete', '⌫': 'backspace', up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', '↑': 'arrowup', '↓': 'arrowdown', '←': 'arrowleft', '→': 'arrowright', tab: 'tab', '⇥': 'tab' }

/** A key name as a modifier, or null. */
export function kbdModifier(key: string): Modifier | null {
  return MODIFIERS[key.trim().toLowerCase()] ?? null
}

const norm = (key: string): string => {
  const k = key.length === 1 ? key.toLowerCase() : key.trim().toLowerCase()
  return ALIASES[k] ?? k
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'> & { code?: string }

/** Does the key in `e` belong to `keys` (a modifier or a plain key)? */
export function kbdHasKey(keys: readonly string[], e: Pick<KeyboardEvent, 'key'> & { code?: string }): boolean {
  const pressedMod = kbdModifier(e.key)
  const k = norm(e.key)
  const code = e.code?.toLowerCase() ?? ''
  return keys.some((name) => {
    const mod = kbdModifier(name)
    if (mod) return mod === pressedMod
    const n = norm(name)
    return n === k || (n.length === 1 && (code === `key${n}` || code === `digit${n}`))
  })
}

/**
 * Is the combo `keys` held, given a keydown event? Every modifier in `keys` must be held, and
 * the event's key must be one of `keys` (so ['Meta', 'K'] matches ⌘K, not K alone; ['Meta']
 * matches the Meta key itself). Empty `keys` never match. Pure.
 */
export function kbdMatches(keys: readonly string[] | undefined, e: KeyLike): boolean {
  if (!keys?.length || !kbdHasKey(keys, e)) return false
  const held: Record<Modifier, boolean> = { meta: e.metaKey, ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey }
  const pressedMod = kbdModifier(e.key)
  for (const name of keys) {
    const mod = kbdModifier(name)
    if (mod && mod !== pressedMod && !held[mod]) return false
  }
  return true
}

/** The kbd's transform at press depth `p` (0 = rest, 1 = full press; under 0 = the rebound). */
export function kbdPose(p: number, feel: KbdFeel = KBD_FEEL.playful, strength = 1): { sx: number; sy: number; ty: number } {
  const d = Math.max(-0.5, Math.min(1.2, p)) * Math.max(0, strength)
  return { sx: 1 + feel.spread * d, sy: 1 - feel.squish * d, ty: d > 0 ? feel.sink * d : 0 }
}

const r3 = (v: number): string => (Math.round(v * 1000) / 1000).toString()

/** Attach the key-press squish to a kbd element. */
export function attachKbd(el: HTMLElement, initial: KbdOptions = {}): KbdHandle {
  const doc = el.ownerDocument
  const win = doc.defaultView
  let options: KbdOptions = { ...initial }
  const readReduced = (): boolean =>
    options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const s: SpringState = { x: 0, v: 0 }
  let target = 0
  let holdLeft = 0
  let releasing = false
  let moving = false
  let feel: KbdFeel = KBD_FEEL[GOOP_DEFAULT_PRESET]
  const prev = { transform: el.style.transform, origin: el.style.transformOrigin }

  const strength = (): number => effectStrength(options.press)
  const speed = (): number => (options.speed && options.speed > 0 ? options.speed : 1)
  const active = (): boolean => !reduced && strength() > 0

  const draw = (): void => {
    if (s.x === 0 && target === 0) {
      el.style.transform = prev.transform
      return
    }
    const p = kbdPose(s.x, feel, strength())
    el.style.transformOrigin = '50% 100%'
    el.style.transform = `translateY(${r3(p.ty)}px) scale(${r3(p.sx)}, ${r3(p.sy)})`
  }

  const stop = (): void => {
    removeTicker(tick)
    moving = false
    s.x = 0
    s.v = 0
    target = 0
    holdLeft = 0
    releasing = false
    el.style.transform = prev.transform
    el.style.transformOrigin = prev.origin
    el.removeAttribute('data-goop-pressed')
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
      s.x = 0
      s.v = 0
      moving = false
      el.style.transform = prev.transform
      el.style.transformOrigin = prev.origin
      return false
    }
    draw()
    // Held down and settled: stop ticking until the release.
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

  const press = (): void => {
    if (!active()) return
    feel = KBD_FEEL[readPreset(el, options.preset)] ?? KBD_FEEL[GOOP_DEFAULT_PRESET]
    target = 1
    releasing = false
    holdLeft = feel.hold
    el.setAttribute('data-goop-pressed', '')
    wake()
  }
  const release = (): void => {
    if (target === 0) return
    el.removeAttribute('data-goop-pressed')
    releasing = true
    wake()
  }

  const keys = (): readonly string[] => options.keys ?? []
  const onKeyDown = (e: KeyboardEvent): void => {
    if (kbdMatches(keys(), e)) press()
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    if (target > 0 && kbdHasKey(keys(), e)) release()
  }
  const onBlur = (): void => release()
  const onPointerDown = (e: PointerEvent): void => {
    if (e.button > 0) return
    press()
  }
  const onPointerUp = (): void => release()

  win?.addEventListener('keydown', onKeyDown, true)
  win?.addEventListener('keyup', onKeyUp, true)
  win?.addEventListener('blur', onBlur)
  el.addEventListener('pointerdown', onPointerDown, { passive: true })
  el.addEventListener('pointerup', onPointerUp, { passive: true })
  el.addEventListener('pointercancel', onPointerUp, { passive: true })
  el.addEventListener('pointerleave', onPointerUp, { passive: true })

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) stop()
  })

  return {
    press,
    release,
    tap() {
      press()
      release()
    },
    update(next) {
      options = { ...next }
      reduced = readReduced()
      if (!active()) stop()
    },
    get pressed() {
      return target > 0
    },
    get running() {
      return moving
    },
    destroy() {
      stop()
      win?.removeEventListener('keydown', onKeyDown, true)
      win?.removeEventListener('keyup', onKeyUp, true)
      win?.removeEventListener('blur', onBlur)
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      el.removeEventListener('pointerleave', onPointerUp)
      stopWatch()
    },
  }
}

// Select: the goo for a select's listbox (GoopSelect). The panel is an emerge surface with the
// bloom open, and the item highlight is the menu highlight blob (menu.ts); this module adds the
// select-only parts:
//
// - Where the bloom starts: a select whose list is laid over its trigger (reka/Radix
//   `position: 'item-aligned'`) blooms out of the selected item, so the list grows from the
//   value you clicked on. A popper-positioned list blooms from its own center like a menu.
// - The check indicator "plop": when an item is chosen, its check mark drops in like a blob of
//   goo, squashing flat as it lands and jiggling back to round.
//
// Pure helpers plus one small DOM helper (`plopIn`, WAAPI). No framework imports.

import type { GoopPreset } from './constants'
import { emergeJelly } from './emerge'
import { isReducedMotion } from './reduced-motion'
import { readPreset } from './tuning'

/** Select effects (beyond the emerge and highlight toggles), each a prop in the adapters. */
export const SELECT_EFFECTS = ['highlight', 'pop', 'plop'] as const
export type SelectEffect = (typeof SELECT_EFFECTS)[number]

/** reka/Radix Select content positioning. */
export type SelectPosition = 'item-aligned' | 'popper'
/** Where the bloom starts: 'auto' (default: the selected item when the list is item-aligned,
 *  the center when it is a popper), 'selected' (always the selected item), 'center'. */
export type SelectBloomFrom = 'auto' | 'selected' | 'center'

/** True when the bloom should start at the selected item. Pure. */
export function selectBloomsFromItem(position: SelectPosition | undefined, from: SelectBloomFrom = 'auto'): boolean {
  if (from === 'center') return false
  if (from === 'selected') return true
  return position !== 'popper'
}

/** The option a select's bloom grows out of inside `container` (its item list): the selected
 *  option, else the highlighted one, else null (the panel's center). Skips disabled items. */
export function findSelectOrigin(container: ParentNode): Element | null {
  return (
    container.querySelector('[role="option"][aria-selected="true"]') ??
    container.querySelector('[role="option"][data-state="checked"]') ??
    container.querySelector('[role="option"][data-highlighted]')
  )
}

/** Per-preset feel of the indicator plop. Times in seconds. */
export interface SelectPlopFeel {
  /** Whole plop duration. */
  duration: number
  /** Fall: start offset (px, from above) and starting scale. */
  drop: number
  from: number
  /** Landing squash amount (fraction of the size). */
  squash: number
  /** Jelly decay of the rebound (lower = wobblier). */
  decay: number
}

export const SELECT_PLOP_FEEL: Readonly<Record<GoopPreset, Readonly<SelectPlopFeel>>> = Object.freeze({
  subtle: Object.freeze({ duration: 0.26, drop: 3, from: 0.5, squash: 0.18, decay: 7 }),
  playful: Object.freeze({ duration: 0.38, drop: 5, from: 0.3, squash: 0.32, decay: 4.5 }),
  wild: Object.freeze({ duration: 0.5, drop: 8, from: 0.15, squash: 0.45, decay: 3 }),
})

/** Plop phase: fraction of the duration spent falling in. */
const FALL = 0.28

export interface SelectPlopFrame {
  /** Offset down (px; negative is above). */
  y: number
  sx: number
  sy: number
  opacity: number
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))

/**
 * The indicator at time `u` (0..1) of the plop: it falls in small, lands with a squash (wide
 * and flat), then springs back to round with a jelly wobble (one plain rebound without
 * `wobble`). Ends exactly at rest. Pure.
 */
export function selectPlopFrame(u: number, feel: SelectPlopFeel = SELECT_PLOP_FEEL.playful, wobble = true): SelectPlopFrame {
  const t = clamp(u)
  if (t >= 1) return { y: 0, sx: 1, sy: 1, opacity: 1 }
  if (t < FALL) {
    const f = t / FALL
    const k = f * f
    const s = feel.from + (1 - feel.from) * k
    // Stretched along the fall.
    return { y: -feel.drop * (1 - k), sx: s * (1 - 0.12 * (1 - f)), sy: s * (1 + 0.18 * (1 - f)), opacity: clamp(f * 2.5) }
  }
  const v = (t - FALL) / (1 - FALL)
  // Landing: the squash ramps in fast, then the jelly carries it back through round with a
  // decaying wobble (1 - jelly swings 1 -> negative -> 0).
  const ramp = clamp(v / 0.1)
  const dev = feel.squash * (1 - emergeJelly(v, feel.decay, wobble)) * ramp * (2 - ramp)
  return { y: 0, sx: 1 + dev * 0.7, sy: 1 - dev, opacity: 1 }
}

/** WAAPI keyframes for the plop (`steps` + 1 frames). Transform origin should be the bottom. */
export function selectPlopKeyframes(feel: SelectPlopFeel = SELECT_PLOP_FEEL.playful, wobble = true, steps = 16): Keyframe[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const f = selectPlopFrame(i / steps, feel, wobble)
    const r = (n: number) => Math.round(n * 1000) / 1000
    return {
      offset: i / steps,
      opacity: r(f.opacity),
      transform: `translateY(${r(f.y)}px) scale(${r(f.sx)}, ${r(f.sy)})`,
    }
  })
}

export interface SelectPlopOptions {
  /** Feel preset. Default: `--goop-preset` on the element, then 'playful'. */
  preset?: GoopPreset
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Jelly rebound (false: one plain rebound). Default true. */
  wobble?: boolean
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion. */
  reducedMotion?: boolean | 'auto'
}

/**
 * Plop `el` (a select item's check indicator) in. Returns the running animation, or null when
 * nothing plays (reduced motion, or no WAAPI). Safe to call on an element mid-plop.
 */
export function plopIn(el: Element, options: SelectPlopOptions = {}): Animation | null {
  const doc = el.ownerDocument
  const reduced = options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  if (reduced || typeof (el as HTMLElement).animate !== 'function') return null
  const feel = SELECT_PLOP_FEEL[readPreset(el, options.preset)]
  const speed = Math.max(0.05, options.speed ?? 1)
  const anim = (el as HTMLElement).animate(selectPlopKeyframes(feel, options.wobble !== false), {
    duration: (feel.duration * 1000) / speed,
    easing: 'linear',
  })
  // A re-plop or unmount cancels it; don't let `finished` surface as an unhandled rejection.
  anim.finished?.catch(() => {})
  return anim
}

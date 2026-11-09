// Item goo (GoopItem, GoopItemGroup).
//
// Group highlight (`attachItemGroupHighlight`): in an ItemGroup the interactive items' hover /
// keyboard-focus background is ONE goo blob that glides from item to item, with a calm feel:
// a short rope, a gentle stretch, a soft landing and a low, wide swell under the pointer. It
// fades out when the pointer leaves the group. Only interactive items are lit (shadcn only
// gives `a` items a hover fill): a link, a button, or an element with an interactive role.
// It is the list highlight (`./list-highlight`, the menu highlight engine) fed ITEM_FEEL; the
// blob takes the item's own corner radius.
//
// Press (`attachItemPress`): pressing an interactive item squishes it a little and lets go
// with a small jelly settle, like a GoopButton body. Drawn with the CSS `scale` property
// (never `transform`, so it composes with the app's own), and only ever at or under 1: it
// never grows past the item's box (no layout shift, no scroll growth). Enter / Space press it
// too. Reduced motion: no squish.
//
// No DOM access until the attach functions run (SSR-safe). `itemPressScale` is pure.

import type { GoopPreset } from './constants'
import { attachListHighlight, type ListHighlightHandle } from './list-highlight'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { MENU_FEEL, type MenuFeel, type MenuHighlightOptions } from './menu'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { isSpringSettled, springConfig, stepSpring, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Item group toggles (GoopItemGroup's blob), each a prop in the adapters. All default true. */
export const ITEM_GROUP_EFFECTS = ['highlight', 'wobble', 'momentum', 'followPointer'] as const
export type ItemGroupEffect = (typeof ITEM_GROUP_EFFECTS)[number]
/** Item toggles (each GoopItem). `press` takes a boolean or a multiplier. Default true. */
export const ITEM_EFFECTS = ['press'] as const
export type ItemEffect = (typeof ITEM_EFFECTS)[number]

/** Interactive items: what the blob lights and what presses. */
export const ITEM_INTERACTIVE =
  '[data-slot="item"]:is(a[href], button, [role="button"], [role="link"], [role="option"], [role="menuitem"])'

const calm = (menu: Readonly<MenuFeel>): Readonly<MenuFeel> =>
  Object.freeze({
    ...menu,
    head: { response: menu.head.response, dampingRatio: Math.min(0.95, menu.head.dampingRatio + 0.12) },
    tail: { response: menu.tail.response, dampingRatio: Math.min(1, menu.tail.dampingRatio + 0.1) },
    lag: menu.lag * 0.6,
    stretch: menu.stretch * 0.45,
  })

/** Per-preset feel of the group blob: the menu highlight made calmer (items are tall cards with
 *  gaps between them, so a full menu stretch would read as a long smear). */
export const ITEM_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: calm(MENU_FEEL.subtle),
  playful: calm(MENU_FEEL.playful),
  wild: calm(MENU_FEEL.wild),
})

/** Group highlight options: the menu highlight's (feel defaults to ITEM_FEEL). */
export type ItemGroupHighlightOptions = Omit<MenuHighlightOptions, 'find' | 'pop'>

/**
 * Attach the goo hover / keyboard-focus highlight to an item group (shadcn's ItemGroup).
 * Inserts an aria-hidden `[data-goop="highlight"]` element behind the items (colored by
 * `--goop-color` on it); while attached the group carries `data-goop-menu`, so CSS can drop the
 * items' own flat hover fill. Touch never lights an item (no sticky hover).
 */
export function attachItemGroupHighlight(group: HTMLElement, options: ItemGroupHighlightOptions = {}): ListHighlightHandle {
  const fixed = { items: ITEM_INTERACTIVE, pop: false } as const
  const inner = attachListHighlight(group, { feel: ITEM_FEEL, ...options, ...fixed })
  return {
    ...inner,
    pop: () => 0,
    refresh: () => inner.refresh(),
    update: (next = {}) => inner.update({ feel: ITEM_FEEL, ...next, ...fixed }),
    get target() {
      return inner.target
    },
    get reducedMotion() {
      return inner.reducedMotion
    },
    get element() {
      return inner.element
    },
    destroy: () => inner.destroy(),
  }
}

// ---- press -----------------------------------------------------------------------------------

export interface ItemPressFeel {
  /** How far a press squishes the item: height and width fractions at full press. */
  squishY: number
  squishX: number
  /** Press spring (s, damping ratio): it sinks in. */
  down: { response: number; dampingRatio: number }
  /** Release spring: under 1 it settles with a small jelly bounce (never past full size). */
  up: { response: number; dampingRatio: number }
}

/** Per-preset press feel. Small on purpose: an item is a wide card, a few px reads as a press. */
export const ITEM_PRESS_FEEL: Readonly<Record<GoopPreset, Readonly<ItemPressFeel>>> = Object.freeze({
  subtle: Object.freeze({ squishY: 0.025, squishX: 0.006, down: { response: 0.12, dampingRatio: 1 }, up: { response: 0.3, dampingRatio: 0.75 } }),
  playful: Object.freeze({ squishY: 0.04, squishX: 0.01, down: { response: 0.12, dampingRatio: 1 }, up: { response: 0.36, dampingRatio: 0.5 } }),
  wild: Object.freeze({ squishY: 0.06, squishX: 0.016, down: { response: 0.14, dampingRatio: 1 }, up: { response: 0.42, dampingRatio: 0.35 } }),
})

/** The item's `scale` for press amount `p` (1 = fully pressed; the jelly swings it below 0,
 *  which squishes again rather than growing: the item never exceeds its box). Pure. */
export function itemPressScale(p: number, feel: ItemPressFeel = ITEM_PRESS_FEEL.playful, strength = 1): { sx: number; sy: number } {
  const a = Math.min(1.5, Math.abs(p)) * Math.max(0, strength)
  return { sx: 1 - feel.squishX * a, sy: 1 - feel.squishY * a }
}

export interface ItemPressOptions {
  /** The press squish: true / false or a multiplier. Default true. */
  press?: boolean | number
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the item, then 'playful'. */
  preset?: GoopPreset
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
}

export interface ItemPressHandle {
  /** Press / release by hand (what a pointer or Enter / Space does). */
  press(): void
  release(): void
  update(opts?: ItemPressOptions): void
  /** The current squish (1 = at rest). */
  readonly scale: { sx: number; sy: number }
  readonly reducedMotion: boolean
  destroy(): void
}

/** Attach the press squish to an item. It only reacts while the item is interactive
 *  (ITEM_INTERACTIVE) and not disabled, so a plain `div` item is never squished. */
export function attachItemPress(item: HTMLElement, options: ItemPressOptions = {}): ItemPressHandle {
  const doc = item.ownerDocument
  let opts: ItemPressOptions = { ...options }
  const feelOf = (): ItemPressFeel => ITEM_PRESS_FEEL[readPreset(item, opts.preset)]
  let feel = feelOf()
  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  let destroyed = false
  let held = false
  const s: SpringState = { x: 0, v: 0 }
  let scale = { sx: 1, sy: 1 }
  const prevScale = item.style.scale
  const prevOrigin = item.style.transformOrigin

  const strength = (): number => effectStrength(opts.press)
  const interactive = (): boolean => {
    try {
      return (
        item.matches(ITEM_INTERACTIVE) &&
        !item.hasAttribute('disabled') &&
        item.getAttribute('aria-disabled') !== 'true' &&
        item.getAttribute('data-disabled') === null
      )
    } catch {
      return false
    }
  }

  const draw = (): void => {
    scale = itemPressScale(s.x, feel, strength())
    if (scale.sx >= 0.9999 && scale.sy >= 0.9999) {
      item.style.scale = prevScale
      item.style.transformOrigin = prevOrigin
    } else {
      item.style.transformOrigin = '50% 50%'
      item.style.scale = `${scale.sx.toFixed(4)} ${scale.sy.toFixed(4)}`
    }
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    const target = held ? 1 : 0
    const cfg = springConfig(held ? feel.down : feel.up)
    stepSpring(s, target, cfg, dt * Math.max(0.05, opts.speed ?? 1))
    const done = !held && isSpringSettled(s, 0, 0.002, 0.02)
    if (done) {
      s.x = 0
      s.v = 0
    }
    draw()
    return !done
  }

  const press = (): void => {
    if (destroyed || reduced || strength() <= 0 || !interactive()) return
    held = true
    wakeTicker(tick)
  }
  const release = (): void => {
    if (!held) return
    held = false
    if (reduced) {
      s.x = 0
      s.v = 0
      draw()
      return
    }
    wakeTicker(tick)
  }

  const onDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    press()
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && e.target === item) press()
  }
  const onKeyUp = (e: KeyboardEvent): void => {
    if (e.key === 'Enter' || e.key === ' ') release()
  }
  item.addEventListener('pointerdown', onDown, { passive: true })
  item.addEventListener('pointerup', release, { passive: true })
  item.addEventListener('pointercancel', release, { passive: true })
  item.addEventListener('pointerleave', release, { passive: true })
  item.addEventListener('keydown', onKeyDown)
  item.addEventListener('keyup', onKeyUp)
  item.addEventListener('blur', release)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      held = false
      removeTicker(tick)
      s.x = 0
      s.v = 0
      draw()
    }
  })

  return {
    press,
    release,
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      feel = feelOf()
      reduced = readReduced()
      if (reduced || strength() <= 0) {
        held = false
        removeTicker(tick)
        s.x = 0
        s.v = 0
        draw()
      }
    },
    get scale() {
      return scale
    },
    get reducedMotion() {
      return reduced
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      unwatch()
      item.removeEventListener('pointerdown', onDown)
      item.removeEventListener('pointerup', release)
      item.removeEventListener('pointercancel', release)
      item.removeEventListener('pointerleave', release)
      item.removeEventListener('keydown', onKeyDown)
      item.removeEventListener('keyup', onKeyUp)
      item.removeEventListener('blur', release)
      item.style.scale = prevScale
      item.style.transformOrigin = prevOrigin
    },
  }
}

// Tabs indicator: the active-tab highlight of a tab list as a goo blob that slides between
// triggers with momentum, stretches with fat neck lumps while it travels (globby, never
// stringy) and lands with a jelly overshoot.
//
// It is the menu highlight engine (`./menu`) with its own feel table and target: the trigger
// carrying `data-state="active"` (reka-ui / Radix), so it follows clicks AND keyboard (arrow
// keys move focus and, in automatic activation mode, the active tab). No select pop. Physics
// and geometry stay pure in `menuHighlightStep` / `menuHighlightPose`, fed TABS_FEEL.

import type { GoopPreset } from './constants'
import {
  MENU_CONTAINER_ATTR,
  attachMenuHighlight,
  type MenuFeel,
  type MenuHighlightHandle,
  type MenuHighlightOptions,
} from './menu'

/** Per-preset feel of the tabs indicator. Tabs travel further than menu rows (sideways, a
 *  whole trigger width), so the rope is longer and the body stretches more. */
export const TABS_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: Object.freeze({
    head: { response: 0.22, dampingRatio: 0.88 },
    tail: { response: 0.3, dampingRatio: 0.95 },
    lag: 1.2,
    stretch: 0.45,
    squish: 0,
    pop: 0.18,
    appear: 0.18,
    hide: 0.12,
    decay: 7,
    softness: 3,
  }),
  playful: Object.freeze({
    head: { response: 0.28, dampingRatio: 0.6 },
    tail: { response: 0.4, dampingRatio: 0.72 },
    lag: 2.2,
    stretch: 0.9,
    squish: 0,
    pop: 0.24,
    appear: 0.26,
    hide: 0.14,
    decay: 4.5,
    softness: 3.5,
  }),
  wild: Object.freeze({
    head: { response: 0.34, dampingRatio: 0.44 },
    tail: { response: 0.5, dampingRatio: 0.55 },
    lag: 3.2,
    stretch: 1.3,
    squish: 0,
    pop: 0.3,
    appear: 0.32,
    hide: 0.16,
    decay: 3,
    softness: 4,
  }),
})

/** Tabs toggles, each a prop in the adapters. All default true. `wobble` and `momentum` are
 *  shared with the menu highlight (MenuHighlightEffects). */
export const TABS_EFFECTS = ['indicator', 'wobble', 'momentum'] as const
export type TabsEffect = (typeof TABS_EFFECTS)[number]

/** The active trigger of `list` (reka/Radix `data-state="active"`, role tab). Triggers of
 *  nested tab lists are skipped. */
export function findActiveTab(list: Element): Element | null {
  for (const el of list.querySelectorAll('[role="tab"][data-state="active"]')) {
    if (el.closest(`[${MENU_CONTAINER_ATTR}]`) === list) return el
  }
  return null
}

/** Indicator options: the menu highlight's, minus the select pop, target finder and pointer
 *  follow (the indicator marks the active tab, not the hovered one). */
export type TabsIndicatorOptions = Omit<MenuHighlightOptions, 'pop' | 'find' | 'followPointer'>

/**
 * Attach a goo active-tab indicator to a tab list. Inserts an aria-hidden
 * `[data-goop="highlight"]` element behind the triggers (colored by `--goop-color` on it).
 * Reduced motion: the blob snaps to the active tab, no travel.
 */
export function attachTabsIndicator(list: HTMLElement, options: TabsIndicatorOptions = {}): MenuHighlightHandle {
  return attachMenuHighlight(list, { feel: TABS_FEEL, ...options, pop: false, followPointer: false, find: findActiveTab })
}

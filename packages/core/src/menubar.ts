// Menubar trigger highlight (GoopMenubar): the top-level trigger highlight of a menubar as ONE
// goo body that flows between triggers with momentum as you hover or arrow across them.
//
// It is the menu highlight engine (`./menu`) fed the tabs feel (TABS_FEEL: sideways travel
// with a longer rope, fat neck lumps, jelly landing), with its own target. A menubar trigger
// is lit when its menu is open (reka/Radix `data-state="open"`), else when the pointer is over
// it, else when it has keyboard focus (`:focus-visible`). reka marks a trigger
// `data-highlighted` whenever it has focus, including after a mouse click closed its menu, so
// core marks the lit trigger itself (`data-goop-lit`) to match shadcn's look (hover and open
// only, plus a keyboard ring). No select pop: a trigger opens a menu. No DOM access until an
// attach runs (SSR-safe). Reduced motion: the blob snaps.

import { MENU_CONTAINER_ATTR, attachMenuHighlight, type MenuHighlightHandle } from './menu'
import { TABS_FEEL, type TabsIndicatorOptions } from './tabs'

/** Menubar toggles, each a prop in the adapters. All default true. `wobble` and `momentum`
 *  are shared with the menu highlight (MenuHighlightEffects). */
export const MENUBAR_EFFECTS = ['highlight', 'wobble', 'momentum'] as const
export type MenubarEffect = (typeof MENUBAR_EFFECTS)[number]

/** Per-preset feel of the trigger highlight: the tabs indicator's (sideways travel). */
export const MENUBAR_FEEL = TABS_FEEL

/** A menubar's top-level triggers. */
export const MENUBAR_TRIGGERS = '[role="menuitem"][aria-haspopup="menu"]'
/** Set by core on the trigger it lights for hover / keyboard focus. */
export const MENUBAR_LIT_ATTR = 'data-goop-lit'

/** The lit trigger of `bar`: the one whose menu is open, else the one core marked lit (hover /
 *  keyboard focus). Triggers of nested highlights are skipped. */
export function findMenubarHighlight(bar: Element): Element | null {
  const own = (el: Element) => el.closest(`[${MENU_CONTAINER_ATTR}]`) === bar
  for (const el of bar.querySelectorAll(`${MENUBAR_TRIGGERS}[data-state="open"]`)) if (own(el)) return el
  for (const el of bar.querySelectorAll(`[${MENUBAR_LIT_ATTR}]`)) if (own(el)) return el
  return null
}

/** Trigger highlight options: the tabs indicator's (no select pop, target finder or pointer
 *  follow; `feel` defaults to MENUBAR_FEEL). */
export type MenubarHighlightOptions = TabsIndicatorOptions

/**
 * Attach the goo trigger highlight to a menubar (`bar`, the `role="menubar"` element). Inserts
 * an aria-hidden `[data-goop="highlight"]` element behind the triggers (colored by
 * `--goop-color` on it). Lights the open trigger, else the hovered (mouse / pen) one, else the
 * keyboard-focused one. Disabled triggers are skipped. Returns the menu highlight handle.
 */
export function attachMenubarHighlight(bar: HTMLElement, options: MenubarHighlightOptions = {}): MenuHighlightHandle {
  const doc = bar.ownerDocument
  const win = doc.defaultView
  let lit: Element | null = null
  let handle: MenuHighlightHandle | null = null
  const usable = (t: Element | null): t is HTMLElement =>
    !!t && bar.contains(t) && !t.hasAttribute('disabled') && t.getAttribute('data-disabled') === null
  const light = (t: Element | null): void => {
    if (t === lit) return
    lit?.removeAttribute(MENUBAR_LIT_ATTR)
    lit = t
    lit?.setAttribute(MENUBAR_LIT_ATTR, '')
    handle?.refresh()
  }
  const triggerOf = (t: EventTarget | null): Element | null => {
    const el = win && t instanceof win.Element ? t.closest(MENUBAR_TRIGGERS) : null
    return usable(el) ? el : null
  }
  const focusVisible = (el: Element | null): boolean => {
    try {
      return !!el && el === doc.activeElement && el.matches(':focus-visible')
    } catch {
      return false
    }
  }
  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return
    const t = triggerOf(e.target)
    // Over the bar's padding or gaps: keep the last trigger (the body doesn't flicker out
    // between neighbours); leaving the bar clears it.
    if (t) light(t)
  }
  const onLeave = (): void => {
    if (focusVisible(lit)) return
    const focused = triggerOf(doc.activeElement)
    light(focusVisible(focused) ? focused : null)
  }
  const onFocus = (e: FocusEvent): void => {
    const t = triggerOf(e.target)
    if (t && focusVisible(t)) light(t)
  }
  const onBlur = (e: FocusEvent): void => {
    if (triggerOf(e.target) === lit && !lit?.matches(':hover')) light(null)
  }
  bar.addEventListener('pointerover', onOver, { passive: true })
  bar.addEventListener('pointerleave', onLeave, { passive: true })
  bar.addEventListener('focusin', onFocus)
  bar.addEventListener('focusout', onBlur)
  const inner = attachMenuHighlight(bar, {
    feel: MENUBAR_FEEL,
    ...options,
    pop: false,
    followPointer: false,
    find: findMenubarHighlight,
  })
  handle = inner
  return {
    pop: () => 0,
    refresh: () => inner.refresh(),
    update: (next = {}) => inner.update({ ...next, pop: false, followPointer: false, find: findMenubarHighlight }),
    get target() {
      return inner.target
    },
    get reducedMotion() {
      return inner.reducedMotion
    },
    get element() {
      return inner.element
    },
    destroy() {
      bar.removeEventListener('pointerover', onOver)
      bar.removeEventListener('pointerleave', onLeave)
      bar.removeEventListener('focusin', onFocus)
      bar.removeEventListener('focusout', onBlur)
      handle = null
      light(null)
      inner.destroy()
    },
  }
}

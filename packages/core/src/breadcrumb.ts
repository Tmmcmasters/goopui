// Breadcrumb hover highlight (GoopBreadcrumbList): the hover / keyboard-focus highlight of a
// breadcrumb's links as ONE goo blob that flows from link to link as the pointer moves along
// the trail, with a subtle feel: a short rope, a gentle stretch, a soft landing, and a low,
// wide swell that sits under the pointer (`followPointer`). It fades out when the pointer
// leaves the trail. Separators, the ellipsis and the current page are never lit.
//
// It is the menu highlight engine (`./menu`) fed BREADCRUMB_FEEL (the tabs feel for sideways
// travel, toned down) with its own target: core marks the lit link (`data-goop-lit`). Pointer
// over the gaps between links keeps the last link lit, so the blob doesn't flicker out between
// neighbours. No DOM access until `attachBreadcrumbHighlight` runs (SSR-safe). Reduced motion:
// the blob snaps to the link, no travel.

import type { GoopPreset } from './constants'
import { MENU_CONTAINER_ATTR, MENU_FEEL, attachMenuHighlight, type MenuFeel, type MenuHighlightHandle } from './menu'
import { TABS_FEEL, type TabsIndicatorOptions } from './tabs'

/** Breadcrumb toggles, each a prop in the adapters. All default true. `wobble`, `momentum` and
 *  `followPointer` are shared with the menu highlight (MenuHighlightEffects). */
export const BREADCRUMB_EFFECTS = ['highlight', 'wobble', 'momentum', 'followPointer'] as const
export type BreadcrumbEffect = (typeof BREADCRUMB_EFFECTS)[number]

const calm = (tabs: Readonly<MenuFeel>, menu: Readonly<MenuFeel>): Readonly<MenuFeel> =>
  Object.freeze({
    ...tabs,
    head: { response: tabs.head.response, dampingRatio: Math.min(0.95, tabs.head.dampingRatio + 0.12) },
    tail: { response: tabs.tail.response, dampingRatio: Math.min(1, tabs.tail.dampingRatio + 0.1) },
    lag: tabs.lag * 0.7,
    stretch: tabs.stretch * 0.55,
    swell: menu.swell,
  })

/** Per-preset feel of the breadcrumb blob: the tabs feel (sideways travel) made calmer, plus
 *  the menu's pointer swell. */
export const BREADCRUMB_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: calm(TABS_FEEL.subtle, MENU_FEEL.subtle),
  playful: calm(TABS_FEEL.playful, MENU_FEEL.playful),
  wild: calm(TABS_FEEL.wild, MENU_FEEL.wild),
})

/** The links the blob can light: shadcn's BreadcrumbLink. */
export const BREADCRUMB_LINKS = '[data-slot="breadcrumb-link"]'
/** Set by core on the link it lights. */
export const BREADCRUMB_LIT_ATTR = 'data-goop-lit'

/** The lit link of `list` (marked by core). Links of nested highlights are skipped. */
export function findBreadcrumbHighlight(list: Element): Element | null {
  for (const el of list.querySelectorAll(`[${BREADCRUMB_LIT_ATTR}]`)) if (el.closest(`[${MENU_CONTAINER_ATTR}]`) === list) return el
  return null
}

/** Highlight options: the tabs indicator's plus `followPointer` (default true; `feel`
 *  defaults to BREADCRUMB_FEEL). */
export type BreadcrumbHighlightOptions = TabsIndicatorOptions & { followPointer?: boolean }

/**
 * Attach the goo hover highlight to a breadcrumb list (shadcn's BreadcrumbList, the `<ol>`).
 * Inserts an aria-hidden `[data-goop="highlight"]` element behind the links (colored by
 * `--goop-color` on it). Lights the hovered (mouse / pen) link, else the keyboard-focused one.
 */
export function attachBreadcrumbHighlight(list: HTMLElement, options: BreadcrumbHighlightOptions = {}): MenuHighlightHandle {
  const doc = list.ownerDocument
  const win = doc.defaultView
  let lit: Element | null = null
  let handle: MenuHighlightHandle | null = null
  const linkOf = (t: EventTarget | null): Element | null => {
    const el = win && t instanceof win.Element ? t.closest(BREADCRUMB_LINKS) : null
    return el && list.contains(el) && el.getAttribute('aria-disabled') !== 'true' ? el : null
  }
  const light = (t: Element | null): void => {
    if (t === lit) return
    lit?.removeAttribute(BREADCRUMB_LIT_ATTR)
    lit = t
    lit?.setAttribute(BREADCRUMB_LIT_ATTR, '')
    handle?.refresh()
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
    const t = linkOf(e.target)
    if (t) light(t)
  }
  const onLeave = (): void => {
    const focused = linkOf(doc.activeElement)
    light(focusVisible(focused) ? focused : null)
  }
  const onFocus = (e: FocusEvent): void => {
    const t = linkOf(e.target)
    if (t && focusVisible(t)) light(t)
  }
  const onBlur = (e: FocusEvent): void => {
    if (linkOf(e.target) === lit && !lit?.matches(':hover')) light(null)
  }
  list.addEventListener('pointerover', onOver, { passive: true })
  list.addEventListener('pointerleave', onLeave, { passive: true })
  list.addEventListener('focusin', onFocus)
  list.addEventListener('focusout', onBlur)
  const fixed = { pop: false, find: findBreadcrumbHighlight } as const
  const inner = attachMenuHighlight(list, { feel: BREADCRUMB_FEEL, ...options, ...fixed })
  handle = inner
  return {
    pop: () => 0,
    refresh: () => inner.refresh(),
    update: (next = {}) => inner.update({ feel: BREADCRUMB_FEEL, ...next, ...fixed }),
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
      list.removeEventListener('pointerover', onOver)
      list.removeEventListener('pointerleave', onLeave)
      list.removeEventListener('focusin', onFocus)
      list.removeEventListener('focusout', onBlur)
      handle = null
      light(null)
      inner.destroy()
    },
  }
}

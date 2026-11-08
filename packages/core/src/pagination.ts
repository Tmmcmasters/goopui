// Pagination indicator: the current page's highlight as ONE goo blob that slides between page
// numbers with momentum, stretches gently while it travels (a few fat neck lumps to a short
// tail, never a thin string) and lands with a jelly overshoot. Jumps over several pages are
// one long slide.
//
// It is the Tabs indicator (the menu highlight engine, `./menu`) with its own feel table and
// target: the page item marked current (`data-active` when the app sets it, else reka-ui's
// `data-selected` / `aria-current="page"`). reka re-renders the page window as the page
// changes (ellipses come and go, numbers shift), so on top of the engine's own observer this
// watches the list's children and the current-page attributes. Prev / Next press squish is
// GoopButton's (adapters render those parts as ghost GoopButtons), not this module.
// No DOM access until `attachPaginationIndicator` is called (SSR-safe).

import type { GoopPreset } from './constants'
import {
  MENU_CONTAINER_ATTR,
  attachMenuHighlight,
  type MenuFeel,
  type MenuHighlightHandle,
} from './menu'
import { TABS_FEEL, type TabsIndicatorOptions } from './tabs'

/** Per-preset feel of the pagination blob. Tabs' springs; page items are small squares, so
 *  the rope and the stretch (both in item heights) are shorter to keep the travel gentle. */
export const PAGINATION_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: Object.freeze({ ...TABS_FEEL.subtle, lag: 1, stretch: 0.3 }),
  playful: Object.freeze({ ...TABS_FEEL.playful, lag: 1.8, stretch: 0.6 }),
  wild: Object.freeze({ ...TABS_FEEL.wild, lag: 2.6, stretch: 0.95 }),
})

/** Pagination toggles, each a prop in the adapters. All default true. `indicator`, `wobble`
 *  and `momentum` drive the blob; `press` is the Prev / Next / First / Last press squish. */
export const PAGINATION_EFFECTS = ['indicator', 'wobble', 'momentum', 'press'] as const
export type PaginationEffect = (typeof PAGINATION_EFFECTS)[number]

/** Page items the blob can mark: reka-ui's PaginationListItem (`data-type="page"`) and
 *  shadcn's link-style PaginationLink. */
export const PAGINATION_ITEM = '[data-type="page"], [data-slot="pagination-link"]'

/** Attributes that mark the current page (watched for changes). */
const CURRENT_ATTRS = ['data-active', 'data-selected', 'aria-current']

const truthy = (v: string | null): boolean => v !== null && v !== 'false'

/** Is this page item the current page? `data-active` wins when present (shadcn's `isActive`),
 *  else reka-ui's `data-selected="true"` or `aria-current="page"`. */
export function isPaginationActive(el: Element): boolean {
  if (el.hasAttribute('data-active')) return truthy(el.getAttribute('data-active'))
  return el.getAttribute('data-selected') === 'true' || el.getAttribute('aria-current') === 'page'
}

/** The current page item of `list`. When any item carries `data-active`, only `data-active`
 *  counts (the app drives it); otherwise reka's own marking. Items of nested lists are skipped. */
export function findActivePage(list: Element): Element | null {
  const items = [...list.querySelectorAll(PAGINATION_ITEM)].filter(
    (el) => el.closest(`[${MENU_CONTAINER_ATTR}]`) === list || !list.hasAttribute(MENU_CONTAINER_ATTR),
  )
  const appDriven = items.some((el) => el.hasAttribute('data-active'))
  for (const el of items) {
    if (appDriven ? truthy(el.getAttribute('data-active')) : isPaginationActive(el)) return el
  }
  return null
}

/** Indicator options: the Tabs indicator's (feel defaults to PAGINATION_FEEL). */
export type PaginationIndicatorOptions = TabsIndicatorOptions

/**
 * Attach the goo current-page blob to a pagination list (shadcn's PaginationContent). Inserts
 * an aria-hidden `[data-goop="highlight"]` element behind the page items (colored by
 * `--goop-color` on it). Reduced motion: the blob snaps to the current page, no travel.
 */
export function attachPaginationIndicator(list: HTMLElement, options: PaginationIndicatorOptions = {}): MenuHighlightHandle {
  const h = attachMenuHighlight(list, {
    feel: PAGINATION_FEEL,
    ...options,
    pop: false,
    followPointer: false,
    find: findActivePage,
  })
  const win = list.ownerDocument.defaultView
  const mo = win?.MutationObserver ? new win.MutationObserver(() => h.refresh()) : null
  mo?.observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: CURRENT_ATTRS })
  return {
    pop: () => h.pop(),
    refresh: () => h.refresh(),
    update: (opts) => h.update(opts),
    get target() {
      return h.target
    },
    get reducedMotion() {
      return h.reducedMotion
    },
    get element() {
      return h.element
    },
    destroy() {
      mo?.disconnect()
      h.destroy()
    },
  }
}

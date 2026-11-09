// List highlight: the menu highlight blob (`./menu`) over ANY list of links or buttons, for
// lists that have no reka/Radix `data-highlighted` of their own (a docs nav, a table of
// contents, a header's links, a segmented switch).
//
// The blob rides the item that is hovered (mouse / pen, never touch: no sticky hover on a
// phone) or keyboard-focused (`:focus-visible`), and otherwise rests on the list's `active`
// item (the current page, the section in view, the selected option), if any. So one blob is
// both the hover background and the "you are here" marker, and it slides between them.
// Physics, geometry, reduced motion and goo rendering are the menu highlight's.
//
// Nothing here touches `document`/`window` until it runs.

import {
  MENU_CONTAINER_ATTR,
  attachMenuHighlight,
  type MenuHighlightHandle,
  type MenuHighlightOptions,
} from './menu'

/** Default `items`: every link and button in the list. */
export const LIST_HIGHLIGHT_ITEMS = 'a[href],button'

/** Attributes whose change can move the resting item (re-read when they change). */
export const LIST_HIGHLIGHT_ACTIVE_ATTRS = Object.freeze([
  'aria-current',
  'aria-selected',
  'aria-pressed',
  'aria-checked',
  'data-active',
  'data-on',
])

export interface ListHighlightOptions extends Omit<MenuHighlightOptions, 'find'> {
  /** Selector of the items the blob rides. Default LIST_HIGHLIGHT_ITEMS. */
  items?: string
  /** The resting item when nothing is hovered or focused: a selector (matched among `items`,
   *  e.g. `[aria-current="page"]`) or a function. Default none (the blob hides). */
  active?: string | ((container: HTMLElement) => Element | null)
  /** Hovering an item (mouse / pen) moves the blob to it. Default true. */
  hover?: boolean
  /** Keyboard focus (`:focus-visible`) moves the blob to the item. Default true. With
   *  `hover: false` too, the blob only marks the active item (a segmented switch; the focus
   *  ring still shows). */
  focus?: boolean
}

/** The menu highlight handle, whose `update` also takes the list options. */
export interface ListHighlightHandle extends Omit<MenuHighlightHandle, 'update'> {
  update(opts?: ListHighlightOptions): void
}

/** The item of `container` the blob should ride: the one marked `data-highlighted` (hover or
 *  keyboard focus), else the active one. Items of nested highlight lists are skipped. */
export function findListHighlight(
  container: HTMLElement,
  items: string = LIST_HIGHLIGHT_ITEMS,
  active?: ListHighlightOptions['active'],
): Element | null {
  const own = (el: Element) => (el.parentElement?.closest(`[${MENU_CONTAINER_ATTR}]`) ?? container) === container
  for (const el of container.querySelectorAll(`[data-highlighted]`)) if (own(el) && el.matches(items)) return el
  if (!active) return null
  if (typeof active === 'function') return active(container)
  for (const el of container.querySelectorAll(active)) if (own(el) && el.matches(items)) return el
  return null
}

/**
 * Attach a goo highlight to a list of links / buttons (`container`). Marks the hovered (mouse
 * / pen) or keyboard-focused item `data-highlighted`, and the menu highlight blob follows it,
 * falling back to `active`. Disabled items are skipped. Inserts an aria-hidden
 * `[data-goop="highlight"]` element behind the items (colored by `--goop-color` on it); while
 * attached the container carries `data-goop-menu`, so CSS can drop the items' own flat
 * hover / active background. Default feel MENU_FEEL (vertical lists); pass `feel: TABS_FEEL`
 * for a row. Reduced motion: the blob snaps, no travel.
 */
export function attachListHighlight(container: HTMLElement, options: ListHighlightOptions = {}): ListHighlightHandle {
  const doc = container.ownerDocument
  const win = doc.defaultView
  const El = win?.Element
  let opts: ListHighlightOptions = { ...options }
  let lit: Element | null = null
  let handle: MenuHighlightHandle | null = null

  const itemsSel = (): string => opts.items ?? LIST_HIGHLIGHT_ITEMS
  const usable = (b: Element | null): b is HTMLElement =>
    !!b &&
    container.contains(b) &&
    !b.hasAttribute('disabled') &&
    b.getAttribute('aria-disabled') !== 'true' &&
    b.getAttribute('data-disabled') === null &&
    (b.parentElement?.closest(`[${MENU_CONTAINER_ATTR}]`) ?? container) === container
  const itemOf = (t: EventTarget | null): Element | null => {
    const b = El && t instanceof El ? t.closest(itemsSel()) : null
    return usable(b) ? b : null
  }
  const light = (b: Element | null): void => {
    if (b === lit) return
    lit?.removeAttribute('data-highlighted')
    lit = b
    lit?.setAttribute('data-highlighted', '')
    handle?.refresh()
  }
  const matches = (el: Element, sel: string): boolean => {
    try {
      return el.matches(sel)
    } catch {
      return false
    }
  }

  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch' || opts.hover === false) return
    // Over a nested highlight list (its own blob takes over): this one lets go.
    const t = El && e.target instanceof El ? e.target : null
    const nest = t?.closest(`[${MENU_CONTAINER_ATTR}]`)
    if (nest && nest !== container) return light(null)
    const b = itemOf(e.target)
    // Between items (a gap, a heading) the blob stays where it is until the pointer leaves.
    if (b) light(b)
  }
  const onLeave = (): void => {
    if (lit && lit === doc.activeElement && matches(lit, ':focus-visible')) return
    light(null)
  }
  const onFocus = (e: FocusEvent): void => {
    if (opts.focus === false) return
    const b = itemOf(e.target)
    if (b && matches(b, ':focus-visible')) light(b)
  }
  const onBlur = (e: FocusEvent): void => {
    if (itemOf(e.target) === lit && !(lit && matches(lit, ':hover') && opts.hover !== false)) light(null)
  }
  container.addEventListener('pointerover', onOver, { passive: true })
  container.addEventListener('pointerleave', onLeave, { passive: true })
  container.addEventListener('focusin', onFocus)
  container.addEventListener('focusout', onBlur)

  const menuOpts = (o: ListHighlightOptions): MenuHighlightOptions => {
    const { items: _items, active: _active, hover: _hover, focus: _focus, ...rest } = o
    return rest
  }
  handle = attachMenuHighlight(container, {
    ...menuOpts(opts),
    find: (c) => {
      // A lit item that left the list (filtered out, re-rendered) no longer counts.
      if (lit && !lit.isConnected) {
        lit.removeAttribute('data-highlighted')
        lit = null
      }
      return findListHighlight(c, itemsSel(), opts.active)
    },
  })
  const h = handle

  // The resting item moves when the list re-renders (route change, scroll spy, filter).
  const mo = win?.MutationObserver ? new win.MutationObserver(() => h.refresh()) : null
  mo?.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: [...LIST_HIGHLIGHT_ACTIVE_ATTRS] })

  return {
    pop: () => h.pop(),
    refresh: () => h.refresh(),
    update(next = {}) {
      opts = { ...opts, ...next }
      if (lit && (opts.hover === false || opts.focus === false)) light(null)
      h.update(menuOpts(next))
    },
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
      container.removeEventListener('pointerover', onOver)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('focusin', onFocus)
      container.removeEventListener('focusout', onBlur)
      mo?.disconnect()
      light(null)
      handle = null
      h.destroy()
    },
  }
}

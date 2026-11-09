/**
 * reka focuses a menu item from script as the pointer moves over it (`item.focus()` in its
 * pointermove handler), and a browser may treat that script focus as keyboard-like:
 * `:focus-visible` matched, so a page's focus-visible outline showed on hovered items (seen on
 * GoopContextMenu, whose menu opens from a right-click / long-press). Bound as an item's
 * `@pointermove`, this runs before reka's handler (reka merges its own handler after the
 * item's attrs) and makes its `focus()` for this one event pass `focusVisible: false`.
 * Keyboard focus is untouched. Same as @goopui/react's `quietFocus`.
 */
export function quietFocus(event: PointerEvent): void {
  const el = event.currentTarget as HTMLElement | null
  if (!el || typeof el.focus !== 'function' || Object.prototype.hasOwnProperty.call(el, 'focus')) return
  el.focus = (options?: FocusOptions) => HTMLElement.prototype.focus.call(el, { ...options, focusVisible: false } as FocusOptions)
  queueMicrotask(() => {
    delete (el as { focus?: unknown }).focus
  })
}

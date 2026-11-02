// Command: the goo for a command palette / combobox list (GoopCommand, GoopCombobox). The
// item highlight is the menu highlight blob (menu.ts) and the input's ring is the text-field
// goo ring (input.ts); a combobox's popover is an emerge surface with the bloom open. This
// module adds the command-only parts:
//
// - `findCommandHighlight`: the highlighted option of a filtered list. A command list hides
//   items as you type, and the item reka last highlighted can be filtered out (unmounted, or
//   hidden with `display: none`) while it still carries `data-highlighted` for a moment. A
//   hidden item has no box, so the blob would fly to (0, 0): skip it, so the blob shrinks out
//   instead and grows in again on the next visible match.
//
// Pure helpers plus one tiny DOM query. No framework imports.

import { MENU_CONTAINER_ATTR } from './menu'

/** Command effects, each a prop in the adapters. All default true.
 *  `highlight`: the active item is a goo blob that glides between items (keyboard and pointer).
 *  `pop`: the blob squishes when an item is chosen. `ring`: the input's goo focus ring. */
export const COMMAND_EFFECTS = ['highlight', 'pop', 'ring'] as const
export type CommandEffect = (typeof COMMAND_EFFECTS)[number]

/** Combobox list effects beyond the emerge (popover bloom) toggles: the highlight blob, the
 *  select pop and the check mark plop (as GoopSelect). All default true. The input's goo ring
 *  is the input's own `goo` switch. */
export const COMBOBOX_EFFECTS = ['highlight', 'pop', 'plop'] as const
export type ComboboxEffect = (typeof COMBOBOX_EFFECTS)[number]

/** True when `el` takes up space on the page: connected, not inside a `[hidden]` element, and
 *  neither it nor an ancestor is `display: none`. A box with a size answers at once; otherwise
 *  (a hidden item, or a DOM without layout) the ancestors' display decides. */
export function isRenderedItem(el: Element): boolean {
  if (!el.isConnected) return false
  if (el.closest('[hidden]')) return false
  const r = (el as HTMLElement).getBoundingClientRect?.()
  if (r && (r.width > 0 || r.height > 0)) return true
  const win = el.ownerDocument.defaultView
  for (let n: Element | null = el; n; n = n.parentElement) {
    const display = win ? win.getComputedStyle(n).display : (n as HTMLElement).style?.display
    if (display === 'none') return false
  }
  return true
}

/** The highlighted, visible item of `container` (a command / combobox list): reka's
 *  `data-highlighted` on an option that is still rendered. Items of nested highlight
 *  containers are skipped. Null when nothing visible is highlighted. */
export function findCommandHighlight(container: Element): Element | null {
  for (const el of container.querySelectorAll('[data-highlighted]')) {
    const owner = el.closest(`[${MENU_CONTAINER_ATTR}]`)
    if (owner && owner !== container) continue
    if (isRenderedItem(el)) return el
  }
  return null
}

// Context menu + hover card: where their bloom starts.
//
// - A context menu has no trigger box to emerge from: it opens at the pointer (a right-click,
//   or a touch long-press). Its panel blooms detached (`attachEmerge(host, { detached: true })`,
//   no anchor to keep clear of) with `bloomOrigin` at that point, so the puddle grows out of
//   the spot you clicked (the point is clamped a droplet inside the panel, so a menu flipped to
//   the left of / above the pointer still grows from its corner nearest the pointer) and shrinks
//   back to it on close. `attachContextPoint` records the point.
// - A hover card blooms from its trigger: `bloomOrigin` is the trigger element, whose center
//   core clamps onto the card's near edge, so the card grows out of the side facing the link.
//
// No framework imports.

import type { EmergePoint } from './emerge'

/** Where a context menu's bloom starts: 'pointer' (default: the right-click / long-press
 *  point) or 'center' (the panel's own center, like a dropdown menu). */
export type ContextMenuBloomFrom = 'pointer' | 'center'
/** Where a hover card's bloom starts: 'trigger' (default: the card's edge facing its trigger)
 *  or 'center' (the card's own center, like a popover). */
export type HoverCardBloomFrom = 'trigger' | 'center'

export interface ContextPointHandle {
  /** The last context-menu point (client px), or null before the first one. */
  point(): EmergePoint | null
  /** Forget the point. */
  clear(): void
  /** Remove the listeners. */
  destroy(): void
}

/** Record where a context menu is opened on `target`: the `contextmenu` event's client point
 *  (right-click, the context-menu key, a touch long-press in browsers that fire it) and a
 *  touch / pen `pointerdown` (reka's own long-press opens at that point). Capture-phase and
 *  passive, so it never interferes with the primitive's handlers. SSR-safe (no-op without
 *  addEventListener). */
export function attachContextPoint(target: EventTarget | null | undefined): ContextPointHandle {
  let p: EmergePoint | null = null
  const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
  const record = (e: Event): void => {
    const { clientX: x, clientY: y } = e as MouseEvent
    if (finite(x) && finite(y)) p = { x, y }
  }
  const onDown = (e: Event): void => {
    const t = (e as PointerEvent).pointerType
    if (t && t !== 'mouse') record(e)
  }
  const ok = !!target && typeof target.addEventListener === 'function'
  const opts: AddEventListenerOptions = { capture: true, passive: true }
  if (ok) {
    target.addEventListener('contextmenu', record, opts)
    target.addEventListener('pointerdown', onDown, opts)
  }
  return {
    point: () => p,
    clear: () => {
      p = null
    },
    destroy: () => {
      if (!ok) return
      target.removeEventListener('contextmenu', record, opts)
      target.removeEventListener('pointerdown', onDown, opts)
    },
  }
}

/** The bloom origin for a context menu: the recorded point for 'pointer', null (the panel's
 *  center) for 'center' or before any point is known. Pure. */
export function contextMenuBloomOrigin(from: ContextMenuBloomFrom | undefined, point: EmergePoint | null): EmergePoint | null {
  return from === 'center' ? null : point
}

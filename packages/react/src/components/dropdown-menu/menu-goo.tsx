'use client'
// The goo shared by the menus (GoopDropdownMenu, GoopContextMenu, GoopMenubar): mirrors
// @goopui/vue's use-menu-goo.ts and dropdown-menu/context.ts.
//
// One panel (a Radix Content or SubContent) = `attachEmerge` on the panel (the same engine and
// goop.css hold rules as GoopDialogContent; the bloom by default) + `attachMenuHighlight` on its
// item list. Both attach from layout effects of parts rendered INSIDE the Radix content
// (`MenuSurface`, `MenuList`), so they run when Radix's Presence mounts the content (every
// open), and close() lands before Presence's own layout effect reads the hold animation
// (children's layout effects run first). Browser-only: SSR renders plain markup (the content is
// portalled and only mounts once open).
import {
  attachEmerge,
  attachMenuHighlight,
  type EmergeHandle,
  type EmergeOptions,
  type EmergePoint,
  type EmergeSurfaceColors,
  type MenuHighlightHandle,
  type MenuHighlightOptions,
} from '@goopui/core'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type CSSProperties, type MutableRefObject, type ReactNode, type Ref } from 'react'
import type { ResolvedMenuProps } from '../../goop-props'
import { setRef, useIsomorphicLayoutEffect } from '../../utils'

// ---- contexts ---------------------------------------------------------------------------------

/** Provided by a goo menu panel (Content / SubContent) to its items and nested submenus. */
export interface MenuContentState {
  /** Resolved settings of this panel (submenus inherit them). */
  menu: ResolvedMenuProps
  /** The goo highlight blob is drawing the highlight: items drop their flat focus bg. */
  blob: boolean
  /** An item was selected: play the pop, and hold the close until it has played. */
  select(event: Event): void
  /** This panel's resolved surface colors (submenus reuse them); null: popover tokens. */
  colors(): EmergeSurfaceColors | null
}
export const MenuContentContext = createContext<MenuContentState | null>(null)
MenuContentContext.displayName = 'GoopMenuContentContext'
export const useMenuContent = (): MenuContentState | null => useContext(MenuContentContext)

/** An item's select handler: runs the consumer's onSelect first (so their `preventDefault()`
 *  keeps the menu open), then the panel's pop. `blob`: drop the flat focus bg. */
export function useMenuSelect(onSelect: ((event: Event) => void) | undefined): { blob: boolean; onSelect: (event: Event) => void } {
  const menu = useMenuContent()
  return {
    blob: !!menu?.blob,
    onSelect: (event: Event) => {
      onSelect?.(event)
      menu?.select(event)
    },
  }
}

/**
 * Radix focuses a menu item from script as the pointer moves over it, and browsers treat that
 * script focus as keyboard-like: `:focus-visible` matched, so a page's focus-visible outline
 * showed on hovered items (@goopui/vue does the same for reka's menus). This runs
 * before Radix's handler and makes its `focus()` for this one event pass
 * `focusVisible: false`. Keyboard focus is untouched.
 */
export function quietFocus<E extends { currentTarget: EventTarget }>(handler?: (event: E) => void): (event: E) => void {
  return (event) => {
    handler?.(event)
    const el = event.currentTarget as HTMLElement
    if (typeof el.focus !== 'function' || Object.prototype.hasOwnProperty.call(el, 'focus')) return
    el.focus = (options?: FocusOptions) => HTMLElement.prototype.focus.call(el, { ...options, focusVisible: false } as FocusOptions)
    queueMicrotask(() => {
      delete (el as { focus?: unknown }).focus
    })
  }
}

/** A submenu with no `goo` of its own is plain when its parent has `submenus={false}`. */
export function subMenu<M extends { goo: boolean }>(m: M, ownGoo: boolean | undefined, parentSubmenus: boolean | undefined): M {
  return ownGoo === undefined && parentSubmenus === false ? { ...m, goo: false } : m
}

/** A submenu without its own `surface` reuses the parent panel's resolved colors. */
export function useInheritedColors<O extends object>(emerge: O, parent: MenuContentState | null): O {
  return useMemo(() => (parent ? { ...emerge, surfaceColor: () => parent.colors() } : emerge), [emerge, parent])
}

/** Shared by a Sub's parts: its open state and the row it emerges from. */
export interface MenuSubState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
}
export const MenuSubContext = createContext<MenuSubState | null>(null)
MenuSubContext.displayName = 'GoopMenuSubContext'
export const useMenuSub = (): MenuSubState | null => useContext(MenuSubContext)

/** Controlled-or-not open state (Radix roots and subs): the goo needs to know `open` while
 *  rendering, so the wrapper drives the primitive. */
export function useOpenState(
  openProp: boolean | undefined,
  defaultOpen: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
): [boolean, (open: boolean) => void] {
  const [inner, setInner] = useState(!!defaultOpen)
  const controlled = openProp !== undefined
  const latest = useRef(onOpenChange)
  latest.current = onOpenChange
  const set = useCallback(
    (v: boolean) => {
      if (!controlled) setInner(v)
      latest.current?.(v)
    },
    [controlled],
  )
  return [controlled ? openProp : inner, set]
}

// ---- the panel engine -------------------------------------------------------------------------

export interface MenuGooInput {
  open: boolean
  /** The trigger (or submenu row): `surface: 'trigger'` reads its colors; the neck flows out of it. */
  anchor: () => HTMLElement | null | undefined
  emerge: EmergeOptions
  /** null: the highlight blob is off. */
  highlight: MenuHighlightOptions | null
  /** Close the whole menu (after the select pop). */
  close: () => void
  /** Where a bloom starts (core `bloomOrigin`); absent: the panel's center. */
  origin?: () => Element | EmergePoint | null | undefined
  /** Receives the live emerge / highlight handles. */
  goopRef?: Ref<EmergeHandle>
  highlightRef?: Ref<MenuHighlightHandle>
}

/** Radix parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
const positioned = (host: HTMLElement): boolean => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-radix-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

export interface MenuGoo {
  input: MutableRefObject<MenuGooInput>
  emerge: MutableRefObject<EmergeHandle | null>
  highlight: MutableRefObject<MenuHighlightHandle | null>
  timer: MutableRefObject<ReturnType<typeof setTimeout> | undefined>
  /** Item selected: squish the highlight and, if the menu would close, close it once the pop
   *  has played. Respects a consumer's `event.preventDefault()` (the menu stays open). */
  select: (event: Event) => void
  colors: () => EmergeSurfaceColors | null
}

/** One panel's goo state. Render `<MenuSurface goo={...} />` and `<MenuList goo={...}>` inside
 *  the Radix content. */
export function useMenuGoo(input: MenuGooInput): MenuGoo {
  const latest = useRef(input)
  latest.current = input
  const ref = useRef<MenuGoo | null>(null)
  if (!ref.current) {
    const emerge: MutableRefObject<EmergeHandle | null> = { current: null }
    const highlight: MutableRefObject<MenuHighlightHandle | null> = { current: null }
    const timer: MutableRefObject<ReturnType<typeof setTimeout> | undefined> = { current: undefined }
    ref.current = {
      input: latest,
      emerge,
      highlight,
      timer,
      select: (event) => {
        const ms = highlight.current?.pop() ?? 0
        if (ms <= 0 || event.defaultPrevented) return
        event.preventDefault()
        clearTimeout(timer.current)
        timer.current = setTimeout(() => latest.current.close(), ms)
      },
      colors: () => emerge.current?.colors ?? null,
    }
  }
  const goo = ref.current
  useIsomorphicLayoutEffect(() => () => clearTimeout(goo.timer.current), [goo])
  return goo
}

export const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }

/** The aria-hidden emerge surface: attaches the panel's goo to its parent (the Radix content)
 *  on mount, and plays open / close as `open` flips. */
export function MenuSurface({ goo }: { goo: MenuGoo }) {
  const el = useRef<HTMLSpanElement | null>(null)
  const shown = useRef(goo.input.current.open)
  const { open, emerge } = goo.input.current

  useIsomorphicLayoutEffect(() => {
    const span = el.current
    const host = span?.parentElement
    if (!span || !host) return
    const input = goo.input
    const h = attachEmerge(host, {
      ...input.current.emerge,
      surface: span,
      anchor: () => input.current.anchor() ?? null,
      ready: () => positioned(host),
      bloomOrigin: input.current.origin ? () => input.current.origin?.() ?? null : null,
    })
    goo.emerge.current = h
    setRef(input.current.goopRef, h)
    shown.current = input.current.open
    if (input.current.open) h.open()
    return () => {
      h.destroy()
      goo.emerge.current = null
      setRef(input.current.goopRef, null)
    }
  }, [goo])

  useIsomorphicLayoutEffect(() => {
    goo.emerge.current?.update(emerge)
  }, [goo, emerge])

  useIsomorphicLayoutEffect(() => {
    const h = goo.emerge.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else {
      clearTimeout(goo.timer.current)
      h.close()
    }
  }, [goo, open])

  return <span ref={el} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} />
}

/** The item list (shadcn's padding): holds the highlight blob and clips its goo, so the blob
 *  never adds scroll overflow. */
export function MenuList({ goo, slot, className, children }: { goo: MenuGoo; slot: string; className: string; children?: ReactNode }) {
  const el = useRef<HTMLDivElement | null>(null)
  const options = goo.input.current.highlight

  useIsomorphicLayoutEffect(() => {
    const list = el.current
    if (!list || !options) {
      goo.highlight.current?.destroy()
      goo.highlight.current = null
      setRef(goo.input.current.highlightRef, null)
      return
    }
    if (goo.highlight.current) goo.highlight.current.update(options)
    else {
      goo.highlight.current = attachMenuHighlight(list, options)
      setRef(goo.input.current.highlightRef, goo.highlight.current)
    }
  }, [goo, options])
  useIsomorphicLayoutEffect(
    () => () => {
      goo.highlight.current?.destroy()
      goo.highlight.current = null
      setRef(goo.input.current.highlightRef, null)
    },
    [goo],
  )

  return (
    <div ref={el} data-slot={slot} className={className}>
      {children}
    </div>
  )
}

// ---- shared classes (Vue's SCROLL / LIST) ------------------------------------------------------

/** The scroller (shadcn's max-height and overflow move onto it). */
export const MENU_SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-x-hidden overflow-y-auto'
/** A submenu's scroller (shadcn's submenus don't scroll). */
export const MENU_SUB_SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-hidden'
/** The highlight blob's goo layer overshoots the items; `overflow: clip` (not a scroll
 *  container) keeps that overshoot out of the scroller's scrollable overflow, so a short menu
 *  never grows a scrollbar or scrolls while the blob moves or pops. */
export const MENU_LIST = 'relative overflow-clip p-1'

/** The check icon of checkbox / radio items (lucide CheckIcon). */
export function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

/** The submenu row's chevron (lucide ChevronRightIcon). */
export function ChevronRightIcon({ className = 'cn-rtl-flip ml-auto' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

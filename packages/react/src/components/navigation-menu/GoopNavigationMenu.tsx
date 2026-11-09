'use client'
// GoopNavigationMenu: shadcn/ui's NavigationMenu (Radix NavigationMenu, same parts and props,
// shadcn's `viewport` prop) carrying the goo props for every part, like the Vue
// GoopNavigationMenu:
//   - the top-level items' hover / focus / open background is ONE goo blob that flows between
//     them with momentum (GoopNavigationMenuList, core `attachNavigationMenuHighlight`); the
//     links inside a panel get the same blob (`contentHighlight`);
//   - the viewport blooms out of the active trigger, and moving to another trigger slides and
//     resizes it as one goo body with a gentle jelly settle, not a re-open
//     (GoopNavigationMenuViewport, core `attachNavigationMenuViewport`); a light splash of drops
//     on open (`openDrips`, on by default). With `viewport={false}` each panel blooms from its
//     own trigger.
// Toggles: `highlight`, `contentHighlight`, `bloom`, `jelly`, `wobble`, `momentum`, plus the
// bloom's `fade` / `openSlosh` / `openDrips` / `closeSlosh`; `goo={false}` is plain shadcn.
// Reduced motion: static goo (the blob and panel snap). Browser-only goo: SSR renders shadcn.
//
// The viewport sits centred under the active trigger (as reka-ui's default `align` places it
// in Vue), kept 10px inside the page; Radix doesn't publish a left, so it is measured here.
import {
  NAVIGATION_MENU_ITEM_ATTR,
  NAVIGATION_MENU_SCOPE_ATTR,
  attachEmerge,
  attachNavigationMenuHighlight,
  attachNavigationMenuViewport,
  type EmergeHandle,
  type MenuHighlightHandle,
  type NavigationMenuBox,
  type NavigationMenuViewportHandle,
} from '@goopui/core'
import { cn } from 'cn'
import { NavigationMenu as NavigationMenuPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MutableRefObject,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import {
  NAVIGATION_MENU_PROP_KEYS,
  splitProps,
  toNavigationMenuOptions,
  type GoopNavigationMenuProps,
  type GoopSoundProps,
  type ResolvedNavigationMenuGoo,
} from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { setRef, useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { SURFACE_STYLE } from '../dropdown-menu/menu-goo'
import {
  NAVIGATION_MENU_CHEVRON,
  NAVIGATION_MENU_CONTENT,
  NAVIGATION_MENU_CONTENT_GOO,
  NAVIGATION_MENU_CONTENT_GOO_INLINE,
  NAVIGATION_MENU_INDICATOR,
  NAVIGATION_MENU_INDICATOR_ARROW,
  NAVIGATION_MENU_LINK,
  NAVIGATION_MENU_LIST,
  NAVIGATION_MENU_ROOT,
  NAVIGATION_MENU_TRIGGER_OPEN,
  NAVIGATION_MENU_VIEWPORT,
  NAVIGATION_MENU_VIEWPORT_BOX_GOO,
  NAVIGATION_MENU_VIEWPORT_GOO,
  NAVIGATION_MENU_VIEWPORT_WRAP,
  navigationMenuTriggerStyle,
} from './variants'

// ---- root ------------------------------------------------------------------------------------

interface NavState {
  /** What each part's goo does (null entries: that part is plain shadcn). */
  goo: ResolvedNavigationMenuGoo
  /** The root renders the shared viewport (shadcn's `viewport` prop, default true). */
  viewport: boolean
  /** The open item's value ('' when none). */
  value: string
  root: MutableRefObject<HTMLElement | null>
  /** The open trigger, else the last one that was open (the close shrinks back into it). */
  trigger: () => HTMLElement | null
}
const NavContext = createContext<NavState | null>(null)
/** True inside a content panel (its links are panel links, not top-level items). */
const InContentContext = createContext(false)

export type GoopNavigationMenuRootProps = Omit<ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Root>, keyof GoopNavigationMenuProps> &
  GoopNavigationMenuProps &
  GoopSoundProps & {
    /** Render the shared viewport (default true). `false`: each panel opens under its trigger. */
    viewport?: boolean
  }

export const GoopNavigationMenu = forwardRef<HTMLElement, GoopNavigationMenuRootProps>(function GoopNavigationMenu(allProps, ref) {
  const [engine, props] = splitProps(allProps, NAVIGATION_MENU_PROP_KEYS)
  const { className, children, viewport = true, value: valueProp, defaultValue, onValueChange, sound, ...rest } = props
  const [inner, setInner] = useState(defaultValue ?? '')
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const latest = useRef(onValueChange)
  latest.current = onValueChange
  const setValue = useCallback(
    (v: string) => {
      if (!controlled) setInner(v)
      latest.current?.(v)
    },
    [controlled],
  )
  useGoopSound(sound)

  const config = useGoopConfig()
  const goo = useStableValue(toNavigationMenuOptions(engine, config))
  const root = useRef<HTMLElement | null>(null)
  const composed = useComposedRefs(ref, root)
  const last = useRef<HTMLElement | null>(null)
  const trigger = useCallback((): HTMLElement | null => {
    const el = root.current
    if (el) {
      for (const t of el.querySelectorAll<HTMLElement>('[data-slot="navigation-menu-trigger"][data-state="open"]')) {
        if (t.closest('[data-slot="navigation-menu"]') === el) {
          last.current = t
          return t
        }
      }
    }
    return last.current?.isConnected ? last.current : null
  }, [])
  // Remember the open trigger as soon as it opens.
  useIsomorphicLayoutEffect(() => {
    if (value) trigger()
  }, [value, trigger])
  const state = useMemo(() => ({ goo, viewport, value, root, trigger }), [goo, viewport, value, trigger])

  return (
    <NavContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <NavigationMenuPrimitive.Root
          ref={composed}
          data-slot="navigation-menu"
          data-viewport={viewport}
          className={cn(NAVIGATION_MENU_ROOT, className)}
          value={value}
          onValueChange={setValue}
          {...rest}
        >
          {children}
          {viewport ? <GoopNavigationMenuViewport /> : null}
        </NavigationMenuPrimitive.Root>
      </GoopSoundScope>
    </NavContext.Provider>
  )
})
GoopNavigationMenu.displayName = 'GoopNavigationMenu'

const useNav = (): NavState | null => useContext(NavContext)

// ---- list / item ------------------------------------------------------------------------------

export type GoopNavigationMenuListProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.List> & {
  /** Receives the live highlight handle (null before mount / when the goo highlight is off). */
  goopRef?: Ref<MenuHighlightHandle>
}

/** shadcn's NavigationMenuList. Inside a goo GoopNavigationMenu its items' hover / focus / open
 *  background is one goo blob (on Radix's list wrapper) that slides between the triggers and
 *  links with momentum and rests on the open trigger while its panel is open. */
export const GoopNavigationMenuList = forwardRef<HTMLUListElement, GoopNavigationMenuListProps>(function GoopNavigationMenuList({ className, goopRef, ...props }, ref) {
  const nav = useNav()
  const options = nav?.goo.highlight ?? null
  const el = useRef<HTMLUListElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useRef<MenuHighlightHandle | null>(null)
  useIsomorphicLayoutEffect(() => {
    // Radix wraps the list in a `position: relative` div (the indicator track): the blob goes there.
    const wrap = el.current?.parentElement
    if (!wrap || !options) {
      handle.current?.destroy()
      handle.current = null
      return
    }
    if (handle.current) handle.current.update(options)
    else handle.current = attachNavigationMenuHighlight(wrap, options)
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  useImperativeHandle(goopRef, () => handle.current as MenuHighlightHandle)
  return <NavigationMenuPrimitive.List ref={composed} data-slot="navigation-menu-list" className={cn(NAVIGATION_MENU_LIST, className)} {...props} />
})
GoopNavigationMenuList.displayName = 'GoopNavigationMenuList'

/** The item's value (yours, or a generated one) so its content knows when it is open. */
const ItemContext = createContext('')

export type GoopNavigationMenuItemProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Item>

export const GoopNavigationMenuItem = forwardRef<HTMLLIElement, GoopNavigationMenuItemProps>(function GoopNavigationMenuItem({ className, value: valueProp, ...props }, ref) {
  const auto = useId()
  const value = valueProp ?? auto
  return (
    <ItemContext.Provider value={value}>
      <NavigationMenuPrimitive.Item ref={ref} data-slot="navigation-menu-item" value={value} className={cn('relative', className)} {...props} />
    </ItemContext.Provider>
  )
})
GoopNavigationMenuItem.displayName = 'GoopNavigationMenuItem'

// ---- trigger / link ---------------------------------------------------------------------------

export type GoopNavigationMenuTriggerProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Trigger>

/** shadcn's NavigationMenuTrigger (`navigationMenuTriggerStyle`, chevron). Inside a goo
 *  GoopNavigationMenu its hover / open background is painted by the list's goo blob. */
export const GoopNavigationMenuTrigger = forwardRef<HTMLButtonElement, GoopNavigationMenuTriggerProps>(function GoopNavigationMenuTrigger(
  { className, children, ...props },
  ref,
) {
  const nav = useNav()
  const item = nav?.goo.highlight ? { [NAVIGATION_MENU_ITEM_ATTR]: '' } : null
  const cue = useGoopCue('menuTrigger')
  return (
    <NavigationMenuPrimitive.Trigger
      ref={ref}
      data-slot="navigation-menu-trigger"
      // reka-ui's marker for a trigger, which core's highlight falls back to (the open trigger).
      data-navigation-menu-trigger=""
      className={cn(navigationMenuTriggerStyle(), NAVIGATION_MENU_TRIGGER_OPEN, 'group', className)}
      {...item}
      {...cue}
      {...props}
    >
      {children}{' '}
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
        className={NAVIGATION_MENU_CHEVRON}
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </NavigationMenuPrimitive.Trigger>
  )
})
GoopNavigationMenuTrigger.displayName = 'GoopNavigationMenuTrigger'

export type GoopNavigationMenuLinkProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Link>

/** shadcn's NavigationMenuLink. Inside a goo GoopNavigationMenu its hover background is the goo
 *  blob: the list's for a top-level link, the panel's for a link inside a content panel. */
export const GoopNavigationMenuLink = forwardRef<HTMLAnchorElement, GoopNavigationMenuLinkProps>(function GoopNavigationMenuLink({ className, ...props }, ref) {
  const nav = useNav()
  const inContent = useContext(InContentContext)
  const on = inContent ? nav?.goo.contentHighlight : nav?.goo.highlight
  const item = on ? { [NAVIGATION_MENU_ITEM_ATTR]: '' } : null
  const cue = useGoopCue('menuItem')
  return <NavigationMenuPrimitive.Link ref={ref} data-slot="navigation-menu-link" className={cn(NAVIGATION_MENU_LINK, className)} {...item} {...cue} {...props} />
})
GoopNavigationMenuLink.displayName = 'GoopNavigationMenuLink'

// ---- content ----------------------------------------------------------------------------------

export type GoopNavigationMenuContentProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Content> & {
  /** Receives the panel's link highlight handle (null when it is off). */
  goopRef?: Ref<MenuHighlightHandle>
  /** Receives a `viewport={false}` panel's own bloom handle (null otherwise). */
  bloomRef?: Ref<EmergeHandle>
}

/**
 * shadcn's NavigationMenuContent. Inside a goo GoopNavigationMenu:
 *   - its links' hover / focus background is one goo blob that glides between them (the menu
 *     highlight's feel, `contentHighlight`);
 *   - in the shared viewport it keeps shadcn's slide between panels; the viewport's goo is the
 *     background;
 *   - with `viewport={false}` the panel itself blooms out of its trigger and shrinks back into
 *     it on close.
 * Radix renders a viewport panel inside the viewport, so the goo parts travel with `children`.
 */
export const GoopNavigationMenuContent = forwardRef<HTMLDivElement, GoopNavigationMenuContentProps>(function GoopNavigationMenuContent(
  { className, children, goopRef, bloomRef, ...props },
  ref,
) {
  const nav = useNav()
  const value = useContext(ItemContext)
  const bloom = nav?.goo.viewport ?? null
  const mode = !bloom ? 'plain' : nav?.viewport === false ? 'inline' : 'viewport'
  const scope = nav ? { [NAVIGATION_MENU_SCOPE_ATTR]: '' } : null
  const open = !!nav && !!value && nav.value === value
  return (
    <NavigationMenuPrimitive.Content
      ref={ref}
      data-slot="navigation-menu-content"
      className={cn(mode === 'viewport' ? NAVIGATION_MENU_CONTENT_GOO : mode === 'inline' ? NAVIGATION_MENU_CONTENT_GOO_INLINE : NAVIGATION_MENU_CONTENT, className)}
      {...scope}
      {...props}
    >
      <InContentContext.Provider value>
        {nav && (nav.goo.contentHighlight || mode === 'inline') ? <ContentGoo nav={nav} open={open} inline={mode === 'inline'} goopRef={goopRef} bloomRef={bloomRef} /> : null}
        {children}
      </InContentContext.Provider>
    </NavigationMenuPrimitive.Content>
  )
})
GoopNavigationMenuContent.displayName = 'GoopNavigationMenuContent'

/** A panel's goo, attached to its content element (the parent of these spans): the link
 *  highlight, and for an inline (`viewport={false}`) panel its own bloom out of the trigger.
 *  Its layout effects run before Radix Presence's, so close() lands before the exit check. */
function ContentGoo({
  nav,
  open,
  inline,
  goopRef,
  bloomRef,
}: {
  nav: NavState
  open: boolean
  inline: boolean
  goopRef?: Ref<MenuHighlightHandle>
  bloomRef?: Ref<EmergeHandle>
}) {
  const marker = useRef<HTMLSpanElement | null>(null)
  const surface = useRef<HTMLSpanElement | null>(null)
  const highlight = useRef<MenuHighlightHandle | null>(null)
  const emerge = useRef<EmergeHandle | null>(null)
  const shown = useRef(open)
  const options = nav.goo.contentHighlight
  const bloom = nav.goo.viewport
  const openNow = useRef(open)
  openNow.current = open

  useIsomorphicLayoutEffect(() => {
    const content = marker.current?.parentElement
    if (!content || !options) {
      highlight.current?.destroy()
      highlight.current = null
      setRef(goopRef, null)
      return
    }
    if (highlight.current) highlight.current.update(options)
    else {
      highlight.current = attachNavigationMenuHighlight(content, options)
      setRef(goopRef, highlight.current)
    }
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      highlight.current?.destroy()
      highlight.current = null
      setRef(goopRef, null)
    },
    [],
  )

  const bloomOpts = useMemo(() => {
    if (!inline || !bloom) return null
    const { jelly: _jelly, target: _target, jellyFeel: _feel, ...rest } = bloom
    return rest
  }, [inline, bloom])
  useIsomorphicLayoutEffect(() => {
    const el = surface.current
    const host = el?.parentElement
    if (!el || !host || !bloomOpts) return
    const trigger = () => nav.trigger() ?? host.parentElement?.querySelector<HTMLElement>('[data-slot="navigation-menu-trigger"]') ?? null
    const h = attachEmerge(host, { ...bloomOpts, surface: el, side: 'bottom', anchor: trigger, bloomOrigin: trigger })
    emerge.current = h
    setRef(bloomRef, h)
    shown.current = openNow.current
    if (openNow.current) h.open()
    return () => {
      h.destroy()
      emerge.current = null
      setRef(bloomRef, null)
    }
    // Re-attach only when the panel switches between inline and viewport mode.
  }, [!!bloomOpts])
  useIsomorphicLayoutEffect(() => {
    if (bloomOpts) emerge.current?.update(bloomOpts)
  }, [bloomOpts])
  useIsomorphicLayoutEffect(() => {
    const h = emerge.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else h.close()
  }, [open])

  return (
    <>
      {bloomOpts ? <span ref={surface} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} /> : null}
      <span ref={marker} hidden aria-hidden="true" data-goop="marker" />
    </>
  )
}

// ---- viewport ---------------------------------------------------------------------------------

export type GoopNavigationMenuViewportProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Viewport> & {
  /** Receives the live viewport handle (null before mount / when the goo bloom is off). */
  goopRef?: Ref<NavigationMenuViewportHandle>
}

const px = (el: HTMLElement, name: string) => Number.parseFloat(el.style.getPropertyValue(name))
const SCREEN_OFFSET = 10

/**
 * shadcn's NavigationMenuViewport (Radix's, in shadcn's wrapper). GoopNavigationMenu renders it
 * for you (shadcn's `viewport` prop).
 *
 * Goo (core `attachNavigationMenuViewport`): the panel is an emerge bloom out of the active
 * trigger (it pools under the trigger, spreads with a lobed edge, overshoots, splashes lightly
 * and settles; it shrinks back into the trigger on close). It sits centred under the active
 * trigger, and moving to another trigger does not re-open it: its box slides and resizes on a
 * spring as one goo body and settles with a gentle jelly wobble (`jelly`), while shadcn's
 * content slide plays inside. `bloom={false}` (or `goo={false}`) is shadcn's zoom.
 */
export const GoopNavigationMenuViewport = forwardRef<HTMLDivElement, GoopNavigationMenuViewportProps>(function GoopNavigationMenuViewport(
  { className, goopRef, ...props },
  ref,
) {
  const nav = useNav()
  const options = nav?.goo.viewport ?? null
  const box = useRef<HTMLDivElement | null>(null)
  const handle = useRef<NavigationMenuViewportHandle | null>(null)
  /** Whether the goo was last told to be open (shared with ViewportClose). */
  const shown = useRef(false)
  const open = !!nav?.value
  const openNow = useRef(open)
  openNow.current = open
  const navNow = useRef(nav)
  navNow.current = nav

  // Attach when the goo box mounts (it stays mounted while the goo is on); option changes go
  // through update().
  useIsomorphicLayoutEffect(() => {
    const host = box.current
    if (!host || !options) return
    const trigger = () => navNow.current?.trigger() ?? null
    /** Radix's measured size, centred under the trigger and kept on screen (reka's `align`). */
    const target = (): NavigationMenuBox | null => {
      const el = host.querySelector<HTMLElement>(':scope > [data-slot="navigation-menu-viewport"]')
      const root = navNow.current?.root.current
      if (!el || !root) return null
      const width = px(el, '--radix-navigation-menu-viewport-width')
      const height = px(el, '--radix-navigation-menu-viewport-height')
      if (!(width > 0) || !(height > 0)) return null
      const t = trigger()
      if (!t) return { left: 0, width, height }
      const r = root.getBoundingClientRect()
      const tr = t.getBoundingClientRect()
      const page = root.ownerDocument.documentElement.offsetWidth
      let left = tr.left - r.left - width / 2 + tr.width / 2
      if (left + r.left < SCREEN_OFFSET) left = SCREEN_OFFSET - r.left
      const right = left + r.left + width
      if (right > page - SCREEN_OFFSET) {
        left -= right - page + SCREEN_OFFSET
        if (left < SCREEN_OFFSET - r.left) left = SCREEN_OFFSET - r.left
      }
      return { left: Math.round(left), width, height }
    }
    const h = attachNavigationMenuViewport(host, { ...options, side: 'bottom', anchor: trigger, bloomOrigin: trigger, target })
    handle.current = h
    setRef(goopRef, h)
    shown.current = openNow.current
    if (openNow.current) h.open()
    return () => {
      h.destroy()
      handle.current = null
      setRef(goopRef, null)
    }
  }, [!!options])
  useIsomorphicLayoutEffect(() => {
    if (options) handle.current?.update(options)
  }, [options])
  // Another trigger took over (or its content resized): the box springs to the new place.
  useIsomorphicLayoutEffect(() => {
    handle.current?.refresh()
  }, [nav?.value])

  if (!options) {
    return (
      <div className={NAVIGATION_MENU_VIEWPORT_WRAP}>
        <NavigationMenuPrimitive.Viewport ref={ref} data-slot="navigation-menu-viewport" className={cn(NAVIGATION_MENU_VIEWPORT, className)} {...props} />
      </div>
    )
  }
  return (
    <div ref={box} data-slot="navigation-menu-viewport-box" className={NAVIGATION_MENU_VIEWPORT_BOX_GOO}>
      <NavigationMenuPrimitive.Viewport ref={ref} data-slot="navigation-menu-viewport" className={cn(NAVIGATION_MENU_VIEWPORT_GOO, className)} {...props}>
        <ViewportClose handle={handle} shown={shown} open={open} />
      </NavigationMenuPrimitive.Viewport>
    </div>
  )
})
GoopNavigationMenuViewport.displayName = 'GoopNavigationMenuViewport'

/** Inside Radix's viewport (under its Presence): plays open / close as the menu opens and
 *  closes. Its layout effect runs before Presence's, so the close duration is set before
 *  Presence reads the exit (goop.css holds the viewport while the goo shrinks back). Renders
 *  nothing. */
function ViewportClose({
  handle,
  shown,
  open,
}: {
  handle: MutableRefObject<NavigationMenuViewportHandle | null>
  shown: MutableRefObject<boolean>
  open: boolean
}) {
  useIsomorphicLayoutEffect(() => {
    const h = handle.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else h.close()
  }, [open])
  return null
}

// ---- indicator --------------------------------------------------------------------------------

export type GoopNavigationMenuIndicatorProps = ComponentPropsWithoutRef<typeof NavigationMenuPrimitive.Indicator>

/** shadcn's NavigationMenuIndicator: the small arrow under the open trigger. */
export const GoopNavigationMenuIndicator = forwardRef<HTMLDivElement, GoopNavigationMenuIndicatorProps>(function GoopNavigationMenuIndicator({ className, ...props }, ref) {
  return (
    <NavigationMenuPrimitive.Indicator ref={ref} data-slot="navigation-menu-indicator" className={cn(NAVIGATION_MENU_INDICATOR, className)} {...props}>
      <div className={NAVIGATION_MENU_INDICATOR_ARROW} />
    </NavigationMenuPrimitive.Indicator>
  )
})
GoopNavigationMenuIndicator.displayName = 'GoopNavigationMenuIndicator'

export { navigationMenuTriggerStyle }

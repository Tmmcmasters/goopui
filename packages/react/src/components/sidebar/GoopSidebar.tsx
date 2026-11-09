'use client'
// GoopSidebar: shadcn/ui's Sidebar (React, style `radix-nova`: SidebarProvider with the open
// state, cookie, Ctrl/Cmd+B and the mobile switch; Sidebar with `side`, `variant` sidebar |
// floating | inset and `collapsible` offcanvas | icon | none; Trigger, Rail, Inset and the
// Header / Content / Group / Menu* parts), with @goopui/vue's goo. Each a toggle on GoopSidebar
// (see GoopSidebarProps in goop-props.ts):
//   - `highlight`: the hover / focus highlight is the dropdown's goo blob, gliding between the
//     menu buttons with momentum, its soft swell under the cursor;
//   - `pill`: the active item is a soft filled pill;
//   - `travel`: collapse / expand moves with the Drawer's momentum (core `sidebarMotionCurve`
//     as a CSS transition): expand launches fast and lands with a small overshoot, collapse
//     accelerates away and stops at speed;
//   - `slosh`: collapsing / expanding sloshes the inner edge in low, wide mounds driven by the
//     edge's real motion (core `attachSidebarEdge`), so it sloshes where `travel` brakes; on
//     `inset` the mounds start over the inset card's edge (goop.css);
//   - `submenus`: an open Collapsible sub-menu's row stays unfilled (only the active item is a
//     pill, as in shadcn): GoopSidebarMenuButton drops the trigger's flood marker;
//   - `pour`: an opening sub-menu's guide line pours down behind a goo bead (goop.css; needs a
//     goo Collapsible, which springs the sub-menu open);
//   - `drawer`: the mobile sidebar is a GoopDrawer from its side: panel and goo one body, fast
//     launch, small landing overshoot, a close that accelerates away, swipe to close. Off:
//     shadcn's Sheet.
// The goo is aria-hidden behind the real content and attaches after hydration: SSR renders
// shadcn's markup (desktop layout; the mobile switch happens after mount, as in shadcn).
// Reduced motion: no slosh, the highlight snaps, travel is shadcn's linear.
import { cn } from 'cn'
import { Dialog as DialogPrimitive, Slot, Tooltip as TooltipPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ForwardRefExoticComponent,
  type RefAttributes,
  type ReactNode,
} from 'react'
import { useGoopConfig } from '../../config'
import { SIDEBAR_PROP_KEYS, splitProps, toSidebarOptions, type GoopSidebarProps, type ResolvedSidebarGoo } from '../../goop-props'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopButton, type GoopButtonProps } from '../button/GoopButton'
import { GoopDrawer, GoopDrawerContent, GoopDrawerDescription, GoopDrawerHeader, GoopDrawerTitle } from '../drawer/GoopDrawer'
import { GoopSeparator, type GoopSeparatorProps } from '../separator/GoopSeparator'
import { useSidebarGoo, useSidebarTravel } from './use-sidebar-goo'
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_MENU_SUB_BUTTON,
  SIDEBAR_MOBILE_BREAKPOINT,
  SIDEBAR_SHEET,
  SIDEBAR_SHEET_OVERLAY,
  SIDEBAR_TOOLTIP,
  SIDEBAR_TOOLTIP_ARROW,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  SIDEBAR_WIDTH_MOBILE,
  sidebarMenuButtonVariants,
  skeletonWidth,
  withoutFlatActive,
  withoutFlatHover,
  type SidebarMenuButtonVariants,
} from './variants'

// ---- context ------------------------------------------------------------------------------

/** The sidebar's state and controls (inside a GoopSidebarProvider), like shadcn's. */
export interface SidebarContextProps {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: (open: boolean | ((open: boolean) => boolean)) => void
  isMobile: boolean
  toggleSidebar: () => void
}

const SidebarContext = createContext<SidebarContextProps | null>(null)

/** The sidebar's state and controls. Throws outside a GoopSidebarProvider, like shadcn's. */
export function useSidebar(): SidebarContextProps {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within a GoopSidebarProvider.')
  return ctx
}

/** Given by GoopSidebar to its parts: the resolved goo (null outside a GoopSidebar). */
const SidebarGooContext = createContext<ResolvedSidebarGoo | null>(null)

/** shadcn's useIsMobile: false on the server and during hydration, then the media query. */
function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false)
  useIsomorphicLayoutEffect(() => {
    const mql = window.matchMedia?.(`(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`)
    if (!mql) return
    const sync = () => setMobile(mql.matches)
    sync()
    mql.addEventListener?.('change', sync)
    return () => mql.removeEventListener?.('change', sync)
  }, [])
  return mobile
}

// ---- provider -----------------------------------------------------------------------------

export type GoopSidebarProviderProps = ComponentPropsWithoutRef<'div'> & {
  /** Initial open state when uncontrolled. Default true (shadcn: read the `sidebar_state`
   *  cookie on the server and pass it here). */
  defaultOpen?: boolean
  /** Controlled open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * shadcn/ui's SidebarProvider. Holds the open state (controlled with `open` / `onOpenChange`,
 * or from `defaultOpen`), persists it to the `sidebar_state` cookie, toggles on Ctrl/Cmd+B,
 * switches to the mobile sidebar below 768px, and provides `useSidebar()`. Wraps everything
 * in a TooltipProvider (delay 0) for the icon-mode tooltips.
 */
export const GoopSidebarProvider = forwardRef<HTMLDivElement, GoopSidebarProviderProps>(function GoopSidebarProvider(
  { defaultOpen = true, open: openProp, onOpenChange: setOpenProp, className, style, children, ...props },
  ref,
) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = useState(false)
  const [inner, setInner] = useState(defaultOpen)
  const open = openProp ?? inner
  const setOpen = useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const next = typeof value === 'function' ? value(open) : value
      if (setOpenProp) setOpenProp(next)
      else setInner(next)
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    },
    [setOpenProp, open],
  )
  const toggleSidebar = useCallback(() => (isMobile ? setOpenMobile((o) => !o) : setOpen((o) => !o)), [isMobile, setOpen])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        toggleSidebar()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleSidebar])

  const state = open ? 'expanded' : 'collapsed'
  const value = useMemo<SidebarContextProps>(
    () => ({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar }),
    [state, open, setOpen, isMobile, openMobile, toggleSidebar],
  )

  return (
    <SidebarContext.Provider value={value}>
      <TooltipPrimitive.Provider delayDuration={0}>
        <div
          ref={ref}
          data-slot="sidebar-wrapper"
          style={{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON, ...style } as CSSProperties}
          className={cn('group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar', className)}
          {...props}
        >
          {children}
        </div>
      </TooltipPrimitive.Provider>
    </SidebarContext.Provider>
  )
})
GoopSidebarProvider.displayName = 'GoopSidebarProvider'

// ---- sidebar ------------------------------------------------------------------------------

export type GoopSidebarRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopSidebarProps> &
  GoopSidebarProps & {
    side?: 'left' | 'right'
    variant?: 'sidebar' | 'floating' | 'inset'
    collapsible?: 'offcanvas' | 'icon' | 'none'
  }

export const GoopSidebar = forwardRef<HTMLDivElement, GoopSidebarRootProps>(function GoopSidebar(allProps, ref) {
  const [engine, props] = splitProps(allProps, SIDEBAR_PROP_KEYS)
  const { side = 'left', variant = 'sidebar', collapsible = 'offcanvas', className, children, dir, ...rest } = props
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  const config = useGoopConfig()
  const goo = useStableValue(toSidebarOptions(engine, config))
  const marked = goo.highlight || goo.pill ? '' : undefined

  // Panels as state: the mobile one mounts in a portal a commit later.
  const [desktopPanel, setDesktopPanel] = useState<HTMLElement | null>(null)
  const [mobilePanel, setMobilePanel] = useState<HTMLElement | null>(null)
  const [wrapper, setWrapper] = useState<HTMLElement | null>(null)
  const noneRef = useComposedRefs<HTMLDivElement>(ref, setDesktopPanel)
  const containerRef = useComposedRefs<HTMLDivElement>(ref)

  useSidebarGoo(desktopPanel, goo.highlight, collapsible === 'none' ? null : goo.edge, side, state)
  useSidebarGoo(mobilePanel, goo.highlight, null, side, 0)

  const floating = variant === 'floating' || variant === 'inset'
  const travel = useSidebarTravel({
    wrapper,
    on: goo.travel,
    state,
    collapsible,
    floating,
    preset: goo.preset,
    speed: goo.speed,
    reducedMotion: goo.reducedMotion,
  })
  // An offcanvas sidebar lands past its screen edge for a moment: the panel's own color covers
  // the gap there (off-screen at rest).
  const cover: CSSProperties | undefined = travel && variant === 'sidebar' ? { boxShadow: `${side === 'left' ? -32 : 32}px 0 0 0 var(--sidebar)` } : undefined

  let body: ReactNode
  if (collapsible === 'none') {
    body = (
      <div
        ref={noneRef}
        data-slot="sidebar"
        data-sidebar="sidebar"
        data-goop-sidebar={marked}
        className={cn('flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground', className)}
        {...rest}
      >
        {children}
      </div>
    )
  } else if (isMobile && goo.drawer) {
    body = (
      <GoopDrawer open={openMobile} onOpenChange={setOpenMobile} direction={side}>
        <GoopDrawerContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          speed={goo.speed}
          preset={goo.preset}
          className={cn(
            'gap-0 p-0 text-sidebar-foreground [--goop-color:var(--sidebar)]',
            'data-[vaul-drawer-direction=left]:w-(--sidebar-width) data-[vaul-drawer-direction=right]:w-(--sidebar-width)',
          )}
          style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as CSSProperties}
        >
          <GoopDrawerHeader className="sr-only">
            <GoopDrawerTitle>Sidebar</GoopDrawerTitle>
            <GoopDrawerDescription>Displays the mobile sidebar.</GoopDrawerDescription>
          </GoopDrawerHeader>
          <div ref={setMobilePanel} data-sidebar="sidebar" data-goop-sidebar={marked} className="flex h-full w-full flex-col">
            {children}
          </div>
        </GoopDrawerContent>
      </GoopDrawer>
    )
  } else if (isMobile) {
    body = (
      <DialogPrimitive.Root open={openMobile} onOpenChange={setOpenMobile}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay data-slot="sheet-overlay" className={SIDEBAR_SHEET_OVERLAY} />
          <DialogPrimitive.Content
            dir={dir}
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            data-side={side}
            className={cn(SIDEBAR_SHEET, 'w-(--sidebar-width) gap-0 bg-sidebar p-0 text-sidebar-foreground')}
            style={{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE } as CSSProperties}
          >
            <div className="sr-only">
              <DialogPrimitive.Title>Sidebar</DialogPrimitive.Title>
              <DialogPrimitive.Description>Displays the mobile sidebar.</DialogPrimitive.Description>
            </div>
            <div ref={setMobilePanel} data-sidebar="sidebar" data-goop-sidebar={marked} className="flex h-full w-full flex-col">
              {children}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    )
  } else {
    body = (
      <div
        ref={setWrapper}
        className="group peer hidden text-sidebar-foreground md:block"
        data-state={state}
        data-collapsible={state === 'collapsed' ? collapsible : ''}
        data-variant={variant}
        data-side={side}
        data-slot="sidebar"
      >
        {/* This is what handles the sidebar gap on desktop */}
        <div
          data-slot="sidebar-gap"
          className={cn(
            'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
            'group-data-[collapsible=offcanvas]:w-0',
            'group-data-[side=right]:rotate-180',
            floating ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]' : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
          )}
          style={travel}
        />
        <div
          ref={containerRef}
          data-slot="sidebar-container"
          data-side={side}
          className={cn(
            'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex',
            floating
              ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
              : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
            className,
          )}
          {...rest}
          style={travel || rest.style ? { ...travel, ...rest.style } : undefined}
        >
          <div
            ref={setDesktopPanel}
            data-sidebar="sidebar"
            data-slot="sidebar-inner"
            data-goop-sidebar={marked}
            style={cover}
            className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
          >
            {children}
          </div>
        </div>
      </div>
    )
  }
  return <SidebarGooContext.Provider value={goo}>{body}</SidebarGooContext.Provider>
})
GoopSidebar.displayName = 'GoopSidebar'

// ---- trigger / rail / inset ----------------------------------------------------------------

/** shadcn/ui's SidebarTrigger: a ghost icon GoopButton that toggles the sidebar (the mobile
 *  sidebar below 768px). Children replace the panel icon. */
export const GoopSidebarTrigger = forwardRef<HTMLButtonElement, GoopButtonProps>(function GoopSidebarTrigger({ className, onClick, children, ...props }, ref) {
  const { toggleSidebar } = useSidebar()
  return (
    <GoopButton
      ref={ref}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon-sm"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      {children ?? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="cn-rtl-flip">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
      )}
      <span className="sr-only">Toggle Sidebar</span>
    </GoopButton>
  )
})
GoopSidebarTrigger.displayName = 'GoopSidebarTrigger'

/** shadcn/ui's SidebarRail: the thin hit area on the sidebar's inner edge that toggles it. */
export const GoopSidebarRail = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function GoopSidebarRail({ className, ...props }, ref) {
  const { toggleSidebar } = useSidebar()
  return (
    <button
      ref={ref}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        'absolute inset-y-0 z-20 hidden w-4 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex ltr:-translate-x-1/2 rtl:-translate-x-1/2',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarRail.displayName = 'GoopSidebarRail'

/** shadcn/ui's SidebarInset: the page's main area beside the sidebar (a rounded card next to
 *  an `inset` sidebar). */
export const GoopSidebarInset = forwardRef<HTMLElement, ComponentPropsWithoutRef<'main'>>(function GoopSidebarInset({ className, ...props }, ref) {
  return (
    <main
      ref={ref}
      data-slot="sidebar-inset"
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarInset.displayName = 'GoopSidebarInset'

/** shadcn/ui's SidebarInput: a compact shadcn input for a search field in the sidebar. */
export const GoopSidebarInput = forwardRef<HTMLInputElement, ComponentPropsWithoutRef<'input'>>(function GoopSidebarInput({ className, type, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-input bg-background px-2.5 py-1 text-base shadow-none transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarInput.displayName = 'GoopSidebarInput'

// ---- layout parts -------------------------------------------------------------------------

/** A plain shadcn layout div (`data-slot`, `data-sidebar`, `className` merge). */
const part = (slot: string, sidebar: string, base: string) =>
  forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function Part({ className, ...props }, ref) {
    return <div ref={ref} data-slot={slot} data-sidebar={sidebar} className={cn(base, className)} {...props} />
  })

/** shadcn/ui's SidebarHeader. */
export const GoopSidebarHeader = part('sidebar-header', 'header', 'flex flex-col gap-2 p-2')
GoopSidebarHeader.displayName = 'GoopSidebarHeader'
/** shadcn/ui's SidebarFooter. */
export const GoopSidebarFooter = part('sidebar-footer', 'footer', 'flex flex-col gap-2 p-2')
GoopSidebarFooter.displayName = 'GoopSidebarFooter'
/** shadcn/ui's SidebarContent (the scrolling middle of the sidebar). */
export const GoopSidebarContent = part(
  'sidebar-content',
  'content',
  'no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
)
GoopSidebarContent.displayName = 'GoopSidebarContent'
/** shadcn/ui's SidebarGroup. */
export const GoopSidebarGroup = part('sidebar-group', 'group', 'relative flex w-full min-w-0 flex-col p-2')
GoopSidebarGroup.displayName = 'GoopSidebarGroup'
/** shadcn/ui's SidebarGroupContent. */
export const GoopSidebarGroupContent = part('sidebar-group-content', 'group-content', 'w-full text-sm')
GoopSidebarGroupContent.displayName = 'GoopSidebarGroupContent'

/** shadcn/ui's SidebarSeparator (a GoopSeparator in the sidebar's border color). */
export const GoopSidebarSeparator: ForwardRefExoticComponent<GoopSeparatorProps & RefAttributes<HTMLDivElement>> = forwardRef<HTMLDivElement, GoopSeparatorProps>(function GoopSidebarSeparator(
  { className, ...props },
  ref,
) {
  return <GoopSeparator ref={ref} data-slot="sidebar-separator" data-sidebar="separator" className={cn('mx-2 w-auto bg-sidebar-border', className)} {...props} />
})
GoopSidebarSeparator.displayName = 'GoopSidebarSeparator'

type AsChild = { asChild?: boolean }

/** shadcn/ui's SidebarGroupLabel (`asChild`). */
export const GoopSidebarGroupLabel = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & AsChild>(function GoopSidebarGroupLabel(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      ref={ref}
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      className={cn(
        'flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarGroupLabel.displayName = 'GoopSidebarGroupLabel'

/** shadcn/ui's SidebarGroupAction (`asChild`). */
export const GoopSidebarGroupAction = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'> & AsChild>(function GoopSidebarGroupAction(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      ref={ref}
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      className={cn(
        'absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarGroupAction.displayName = 'GoopSidebarGroupAction'

// ---- menu ---------------------------------------------------------------------------------

/** shadcn/ui's SidebarMenu. */
export const GoopSidebarMenu = forwardRef<HTMLUListElement, ComponentPropsWithoutRef<'ul'>>(function GoopSidebarMenu({ className, ...props }, ref) {
  return <ul ref={ref} data-slot="sidebar-menu" data-sidebar="menu" className={cn('flex w-full min-w-0 flex-col gap-0', className)} {...props} />
})
GoopSidebarMenu.displayName = 'GoopSidebarMenu'

/** shadcn/ui's SidebarMenuItem. */
export const GoopSidebarMenuItem = forwardRef<HTMLLIElement, ComponentPropsWithoutRef<'li'>>(function GoopSidebarMenuItem({ className, ...props }, ref) {
  return <li ref={ref} data-slot="sidebar-menu-item" data-sidebar="menu-item" className={cn('group/menu-item relative', className)} {...props} />
})
GoopSidebarMenuItem.displayName = 'GoopSidebarMenuItem'

/** Classes and goo attributes of a menu button inside a (goo) GoopSidebar. Inside one, an
 *  open Collapsible sub-menu never floods its trigger row (`submenus`): the trigger's
 *  `data-goop-accordion-trigger` (merged on by a Collapsible trigger's asChild) is dropped. */
function useMenuButtonGoo(base: string) {
  const goo = useContext(SidebarGooContext)
  let classes = base
  if (goo?.highlight) classes = withoutFlatHover(classes)
  if (goo?.pill) classes = withoutFlatActive(classes)
  const attrs: Record<string, string | undefined> = { 'data-goop-pill': goo?.pill ? '' : undefined }
  if (goo?.submenus) attrs['data-goop-accordion-trigger'] = undefined
  return { classes, attrs }
}

export type GoopSidebarMenuButtonProps = ComponentPropsWithoutRef<'button'> &
  AsChild & {
    isActive?: boolean
    /** Shown to the right of the button while the sidebar is collapsed to icons (desktop):
     *  text, or TooltipContent props. */
    tooltip?: string | ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
    variant?: SidebarMenuButtonVariants['variant']
    size?: SidebarMenuButtonVariants['size']
  }

/** shadcn/ui's SidebarMenuButton (`variant` default | outline, `size` default | sm | lg,
 *  `isActive`, `tooltip`, `asChild`). In a goo sidebar the highlight blob paints its hover
 *  background and, with `pill`, the active item is a soft filled pill (goop.css). */
export const GoopSidebarMenuButton = forwardRef<HTMLButtonElement, GoopSidebarMenuButtonProps>(function GoopSidebarMenuButton(
  { asChild = false, isActive = false, variant = 'default', size = 'default', tooltip, className, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button'
  const { isMobile, state } = useSidebar()
  const { classes, attrs } = useMenuButtonGoo(sidebarMenuButtonVariants({ variant, size }))
  const button = (
    <Comp
      ref={ref}
      data-slot="sidebar-menu-button"
      data-sidebar="menu-button"
      data-size={size}
      data-active={isActive}
      className={cn(classes, className)}
      {...props}
      {...attrs}
    />
  )
  if (!tooltip) return button
  const content = typeof tooltip === 'string' ? { children: tooltip } : tooltip
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{button}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip-content"
          side="right"
          align="center"
          sideOffset={4}
          hidden={state !== 'collapsed' || isMobile}
          {...content}
          className={cn(SIDEBAR_TOOLTIP, content.className)}
        >
          {content.children}
          <TooltipPrimitive.Arrow className={SIDEBAR_TOOLTIP_ARROW} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
})
GoopSidebarMenuButton.displayName = 'GoopSidebarMenuButton'

/** shadcn/ui's SidebarMenuAction: a small button at the end of a menu row (`showOnHover`,
 *  `asChild`). */
export const GoopSidebarMenuAction = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'> & AsChild & { showOnHover?: boolean }>(
  function GoopSidebarMenuAction({ className, asChild = false, showOnHover = false, ...props }, ref) {
    const Comp = asChild ? Slot.Root : 'button'
    return (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-action"
        data-sidebar="menu-action"
        className={cn(
          'absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 after:absolute after:-inset-2 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 md:after:hidden [&>svg]:size-4 [&>svg]:shrink-0',
          showOnHover &&
            'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0',
          className,
        )}
        {...props}
      />
    )
  },
)
GoopSidebarMenuAction.displayName = 'GoopSidebarMenuAction'

/** shadcn/ui's SidebarMenuBadge. */
export const GoopSidebarMenuBadge = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(function GoopSidebarMenuBadge({ className, ...props }, ref) {
  return (
    <div
      ref={ref}
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        'pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[size=default]/menu-button:top-1.5 peer-data-[size=lg]/menu-button:top-2.5 peer-data-[size=sm]/menu-button:top-1 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        className,
      )}
      {...props}
    />
  )
})
GoopSidebarMenuBadge.displayName = 'GoopSidebarMenuBadge'

/** shadcn/ui's SidebarMenuSkeleton (`showIcon`). The text bar's width (50..90%) comes from a
 *  stable id, so SSR and hydration agree (shadcn's Math.random() would mismatch). */
export const GoopSidebarMenuSkeleton = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'> & { showIcon?: boolean }>(function GoopSidebarMenuSkeleton(
  { className, showIcon = false, ...props },
  ref,
) {
  const width = skeletonWidth(useId())
  return (
    <div ref={ref} data-slot="sidebar-menu-skeleton" data-sidebar="menu-skeleton" className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)} {...props}>
      {showIcon && <div data-slot="skeleton" data-sidebar="menu-skeleton-icon" className="size-4 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />}
      <div
        data-slot="skeleton"
        data-sidebar="menu-skeleton-text"
        className="h-4 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
        style={{ '--skeleton-width': width } as CSSProperties}
      />
    </div>
  )
})
GoopSidebarMenuSkeleton.displayName = 'GoopSidebarMenuSkeleton'

/** shadcn/ui's SidebarMenuSub (a nested sub-menu). With GoopSidebar's `pour` on, its guide
 *  line pours down as a goo Collapsible springs it open: a goo bead rides the opening edge,
 *  the line thick and glossy behind it, both melting into shadcn's hairline as the jelly
 *  settles; closing draws the bead back up (goop.css). */
export const GoopSidebarMenuSub = forwardRef<HTMLUListElement, ComponentPropsWithoutRef<'ul'>>(function GoopSidebarMenuSub({ className, ...props }, ref) {
  const goo = useContext(SidebarGooContext)
  return (
    <ul
      ref={ref}
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      data-goop-pour={goo?.pour ? '' : undefined}
      className={cn('mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5 group-data-[collapsible=icon]:hidden', className)}
      {...props}
    />
  )
})
GoopSidebarMenuSub.displayName = 'GoopSidebarMenuSub'

/** shadcn/ui's SidebarMenuSubItem. */
export const GoopSidebarMenuSubItem = forwardRef<HTMLLIElement, ComponentPropsWithoutRef<'li'>>(function GoopSidebarMenuSubItem({ className, ...props }, ref) {
  return <li ref={ref} data-slot="sidebar-menu-sub-item" data-sidebar="menu-sub-item" className={cn('group/menu-sub-item relative', className)} {...props} />
})
GoopSidebarMenuSubItem.displayName = 'GoopSidebarMenuSubItem'

/** shadcn/ui's SidebarMenuSubButton (`size` sm | md, `isActive`, `asChild`, an `<a>`). In a
 *  goo sidebar the highlight blob rides it too, and the active one gets the soft pill. */
export const GoopSidebarMenuSubButton = forwardRef<HTMLAnchorElement, ComponentPropsWithoutRef<'a'> & AsChild & { size?: 'sm' | 'md'; isActive?: boolean }>(
  function GoopSidebarMenuSubButton({ asChild = false, size = 'md', isActive = false, className, ...props }, ref) {
    const Comp = asChild ? Slot.Root : 'a'
    const { classes, attrs } = useMenuButtonGoo(SIDEBAR_MENU_SUB_BUTTON)
    return (
      <Comp
        ref={ref}
        data-slot="sidebar-menu-sub-button"
        data-sidebar="menu-sub-button"
        data-size={size}
        data-active={isActive}
        className={cn(classes, className)}
        {...props}
        {...attrs}
      />
    )
  },
)
GoopSidebarMenuSubButton.displayName = 'GoopSidebarMenuSubButton'

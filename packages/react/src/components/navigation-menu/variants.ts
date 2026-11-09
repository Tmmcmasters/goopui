import { cva } from 'class-variance-authority'

/**
 * shadcn/ui's navigationMenuTriggerStyle (React, style `radix-nova`), verbatim, so it is a
 * drop-in. Inside a goo GoopNavigationMenu the item's own background is painted by the goo
 * highlight instead (goop.css clears it on `[data-goop-nav-item]`).
 */
export const navigationMenuTriggerStyle = cva(
  'group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted data-open:bg-muted/50 data-open:hover:bg-muted data-open:focus:bg-muted',
)

/** shadcn's open-state background, spelled out: Radix marks an open trigger
 *  `data-state="open"` (not `data-open`). */
export const NAVIGATION_MENU_TRIGGER_OPEN = 'data-[state=open]:bg-muted/50 data-[state=open]:hover:bg-muted data-[state=open]:focus:bg-muted'

export const NAVIGATION_MENU_ROOT = 'group/navigation-menu relative flex max-w-max flex-1 items-center justify-center'
export const NAVIGATION_MENU_LIST = 'group flex flex-1 list-none items-center justify-center gap-0'
export const NAVIGATION_MENU_CHEVRON =
  'relative top-px ml-1 size-3 transition duration-300 group-data-[state=open]/navigation-menu-trigger:rotate-180'

/** shadcn's NavigationMenuLink classes (verbatim). */
export const NAVIGATION_MENU_LINK =
  "flex items-center gap-2 rounded-lg p-2 text-sm transition-all outline-none hover:bg-muted focus:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-1 in-data-[slot=navigation-menu-content]:rounded-md data-active:bg-muted/50 data-active:hover:bg-muted data-active:focus:bg-muted [&_svg:not([class*='size-'])]:size-4"

/** shadcn's NavigationMenuContent classes (`data-open:` / `data-closed:` spelled out). */
export const NAVIGATION_MENU_CONTENT =
  'top-0 left-0 w-full p-1 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-lg group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:ring-foreground/10 group-data-[viewport=false]/navigation-menu:duration-300 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none md:absolute md:w-auto group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95'

/** Content inside the goo viewport: shadcn's slide between panels, always absolutely placed
 *  (Radix measures it to size the viewport, at every width). */
export const NAVIGATION_MENU_CONTENT_GOO =
  'absolute top-0 left-0 w-max max-w-[calc(100vw-1.25rem)] p-1 ease-[cubic-bezier(0.22,1,0.36,1)] data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none'

/** A goo `viewport={false}` panel: the bloom paints its background, ring and shadow. */
export const NAVIGATION_MENU_CONTENT_GOO_INLINE =
  'absolute top-full left-0 z-50 mt-1.5 w-max max-w-[calc(100vw-1.25rem)] rounded-lg p-1 text-popover-foreground [--goop-color:var(--popover)] **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none'

/** shadcn's viewport classes (verbatim, `data-open:` spelled out) and its wrapper. */
export const NAVIGATION_MENU_VIEWPORT_WRAP = 'absolute top-full left-0 isolate z-50 flex justify-center'
export const NAVIGATION_MENU_VIEWPORT =
  'origin-top-center relative mt-1.5 h-(--radix-navigation-menu-viewport-height) w-full overflow-hidden rounded-lg bg-popover text-popover-foreground shadow ring-1 ring-foreground/10 duration-100 md:w-(--radix-navigation-menu-viewport-width) data-[state=open]:animate-in data-[state=open]:zoom-in-90 data-[state=closed]:animate-out data-[state=closed]:zoom-out-90'
/** The goo viewport: core springs this box (NAVIGATION_MENU_VIEWPORT_VARS); the goo under it
 *  is the panel's background, ring and shadow, and Radix's viewport inside clips the sliding
 *  content to the rounded box. */
export const NAVIGATION_MENU_VIEWPORT_BOX_GOO =
  'pointer-events-none absolute top-full left-(--goop-nav-viewport-left) z-50 mt-1.5 h-(--goop-nav-viewport-height) w-(--goop-nav-viewport-width) rounded-lg [--goop-color:var(--popover)]'
export const NAVIGATION_MENU_VIEWPORT_GOO = 'pointer-events-auto relative size-full overflow-hidden rounded-lg text-popover-foreground'

export const NAVIGATION_MENU_INDICATOR =
  'top-full z-1 flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in'
export const NAVIGATION_MENU_INDICATOR_ARROW = 'relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md'

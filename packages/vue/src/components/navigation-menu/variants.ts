import { cva } from 'class-variance-authority'

/**
 * shadcn-vue's navigationMenuTriggerStyle, copied verbatim (style `reka-nova`, see
 * apps/playground/app/components/ui/navigation-menu/index.ts). Keep identical so it is a
 * drop-in. Inside a goo GoopNavigationMenu the item's own background is painted by the goo
 * highlight instead (goop.css clears it on `[data-goop-nav-item]`).
 */
export const navigationMenuTriggerStyle = cva(
  'hover:bg-muted focus:bg-muted data-open:hover:bg-muted data-open:focus:bg-muted data-open:bg-muted/50 focus-visible:ring-ring/50 data-popup-open:bg-muted/50 data-popup-open:hover:bg-muted rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all focus-visible:ring-3 focus-visible:outline-1 disabled:opacity-50 group/navigation-menu-trigger inline-flex h-9 w-max items-center justify-center outline-none disabled:pointer-events-none',
)

/** shadcn's open-state background. reka-ui marks an open trigger `data-state="open"` (not
 *  `data-open`), so the flat (goo off) trigger also gets these. */
export const NAVIGATION_MENU_TRIGGER_OPEN = 'data-[state=open]:bg-muted/50 data-[state=open]:hover:bg-muted data-[state=open]:focus:bg-muted'

/** shadcn's NavigationMenuLink classes (verbatim). */
export const NAVIGATION_MENU_LINK =
  'data-active:focus:bg-muted data-active:hover:bg-muted data-active:bg-muted/50 focus-visible:ring-ring/50 hover:bg-muted focus:bg-muted flex items-center gap-2 rounded-lg p-2 text-sm transition-all outline-none focus-visible:ring-3 focus-visible:outline-1 in-data-[slot=navigation-menu-content]:rounded-md [&_svg:not([class*=size-])]:size-4'

/** shadcn's NavigationMenuContent classes (verbatim). */
export const NAVIGATION_MENU_CONTENT =
  'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:ring-foreground/10 p-1 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-[viewport=false]/navigation-menu:rounded-lg group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:ring-1 group-data-[viewport=false]/navigation-menu:duration-300 top-0 left-0 w-full group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none md:absolute md:w-auto'

/** Content inside the goo viewport: shadcn's slide between panels, always absolutely placed
 *  (reka measures it to size the viewport, at every width). */
export const NAVIGATION_MENU_CONTENT_GOO =
  'data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 p-1 ease-[cubic-bezier(0.22,1,0.36,1)] absolute top-0 left-0 w-max max-w-[calc(100vw-1.25rem)] **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none'

/** A goo `viewport: false` panel: the bloom paints its background, ring and shadow. */
export const NAVIGATION_MENU_CONTENT_GOO_INLINE =
  'text-popover-foreground [--goop-color:var(--popover)] p-1 rounded-lg absolute top-full left-0 mt-1.5 w-max max-w-[calc(100vw-1.25rem)] z-50 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none'

/** shadcn's viewport classes (verbatim) and its wrapper. */
export const NAVIGATION_MENU_VIEWPORT_WRAP = 'absolute top-full left-0 isolate z-50 flex justify-center'
export const NAVIGATION_MENU_VIEWPORT =
  'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-90 data-[state=open]:zoom-in-90 ring-foreground/10 rounded-lg shadow ring-1 duration-100 origin-top-center relative mt-1.5 h-(--reka-navigation-menu-viewport-height) w-full overflow-hidden md:w-(--reka-navigation-menu-viewport-width)'
/** The goo viewport: core springs this box (NAVIGATION_MENU_VIEWPORT_VARS); the goo under it
 *  is the panel's background, ring and shadow, and reka's viewport inside clips the sliding
 *  content to the rounded box. */
export const NAVIGATION_MENU_VIEWPORT_BOX_GOO =
  'absolute top-full left-(--goop-nav-viewport-left) z-50 mt-1.5 w-(--goop-nav-viewport-width) h-(--goop-nav-viewport-height) rounded-lg pointer-events-none [--goop-color:var(--popover)]'
export const NAVIGATION_MENU_VIEWPORT_GOO = 'text-popover-foreground relative size-full overflow-hidden rounded-lg pointer-events-auto'

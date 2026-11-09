// shadcn/ui's Drawer classes (React, style `radix-nova`; the same as @goopui/vue's
// GoopDrawer*). shadcn's vaul drawer keys its layout off `data-vaul-drawer-direction`, which
// GoopDrawerContent sets the same way.

const DIRECTIONS =
  'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-xl ' +
  'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl ' +
  'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-xl data-[vaul-drawer-direction=right]:sm:max-w-sm ' +
  'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:rounded-r-xl data-[vaul-drawer-direction=left]:sm:max-w-sm'
const BORDERS =
  'data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=left]:border-r'

/** shadcn's DrawerContent (`goo={false}`). */
export const DRAWER_CONTENT_SHADCN = `group/drawer-content fixed z-50 flex h-auto flex-col bg-popover text-sm text-popover-foreground ${DIRECTIONS} ${BORDERS}`

/** Goo on: the goo paints the background and the edge (a drop-shadow ring instead of the border). */
export const DRAWER_CONTENT_GOO = `group/drawer-content fixed z-50 flex h-auto flex-col text-sm text-popover-foreground [--goop-color:var(--popover)] ${DIRECTIONS}`

/** shadcn's DrawerOverlay. Its opacity follows the drawer every frame (the engine), so no CSS fade. */
export const DRAWER_OVERLAY = 'fixed inset-0 z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs'

/** shadcn's drag handle (bottom drawers). On dark, shadcn's bg-muted all but vanishes on the
 *  popover, so it's the muted text color mixed into the panel instead. */
const HANDLE = 'mx-auto mt-4 hidden h-1 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block'
// (Spelled out in full so Tailwind's scanner sees each class.)
/** The handle as a goo blob (`handle` on): the goo paints it from --goop-color. */
export const DRAWER_HANDLE_GOO = `${HANDLE} [--goop-color:var(--muted)] dark:[--goop-color:color-mix(in_oklab,var(--muted-foreground)_50%,var(--popover))]`
/** The plain handle (`goo={false}` or `handle={false}`). */
export const DRAWER_HANDLE = `${HANDLE} bg-muted dark:bg-[color-mix(in_oklab,var(--muted-foreground)_50%,var(--popover))]`

export const DRAWER_HEADER =
  'flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-0.5 md:text-left'
export const DRAWER_FOOTER = 'mt-auto flex flex-col gap-2 p-4'
export const DRAWER_TITLE = 'cn-font-heading text-base font-medium text-foreground'
export const DRAWER_DESCRIPTION = 'text-sm text-muted-foreground'

// GoopSidebar's server-safe pieces: shadcn/ui's sidebar constants and classes (React, style
// `radix-nova`; shadcn's `data-active:` / `data-open:` are spelled out as the
// `data-[active=true]` / `data-[state=open]` the parts render), and the class filters the goo
// uses. No React imports, so Server Components can import them.
import { cva, type VariantProps } from 'class-variance-authority'

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
export const SIDEBAR_WIDTH_ICON = '3rem'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'
/** Below this width (px) the sidebar is a sheet (shadcn's 768px). */
export const SIDEBAR_MOBILE_BREAKPOINT = 768

export const sidebarMenuButtonVariants = cva(
  'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type SidebarMenuButtonVariants = VariantProps<typeof sidebarMenuButtonVariants>

export const SIDEBAR_MENU_SUB_BUTTON =
  'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[size=md]:text-sm data-[size=sm]:text-xs data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground'

/** With the goo highlight on, the blob paints the hover background: drop the flat hover /
 *  press backgrounds (text colors and the active fill stay). */
export function withoutFlatHover(classes: string): string {
  return classes
    .split(/\s+/)
    .filter((c) => !/^(?:data-\[state=open\]:)?(?:hover|active):bg-/.test(c))
    .join(' ')
}

/** With the soft pill on, goop.css paints the active fill: drop the flat active bg utility. */
export function withoutFlatActive(classes: string): string {
  return classes
    .split(/\s+/)
    .filter((c) => !c.startsWith('data-[active=true]:bg-'))
    .join(' ')
}

/** Skeleton width (50..90%) from a stable id: SSR and hydration agree, unlike Math.random(). */
export function skeletonWidth(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return `${(h % 41) + 50}%`
}

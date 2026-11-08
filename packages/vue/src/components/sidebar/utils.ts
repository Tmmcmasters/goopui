// GoopSidebar shared pieces: shadcn-vue's sidebar constants, `useSidebar` context and the menu
// button variants, plus the goo context GoopSidebar gives its parts.
import { cva, type VariantProps } from 'class-variance-authority'
import type { PrimitiveProps } from 'reka-ui'
import { inject, provide, type ComputedRef, type HTMLAttributes, type InjectionKey, type Ref } from 'vue'
import type { ResolvedSidebarGoo } from '../../goop-props'

export const SIDEBAR_COOKIE_NAME = 'sidebar_state'
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = '16rem'
export const SIDEBAR_WIDTH_MOBILE = '18rem'
export const SIDEBAR_WIDTH_ICON = '3rem'
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b'
/** Below this width (px) the sidebar is a sheet (shadcn's 768px). */
export const SIDEBAR_MOBILE_BREAKPOINT = 768

export interface SidebarContext {
  state: ComputedRef<'expanded' | 'collapsed'>
  open: Ref<boolean>
  setOpen: (value: boolean) => void
  isMobile: Ref<boolean>
  openMobile: Ref<boolean>
  setOpenMobile: (value: boolean) => void
  toggleSidebar: () => void
}

const SIDEBAR: InjectionKey<SidebarContext> = Symbol('goopui.sidebar')

export function provideSidebarContext(ctx: SidebarContext): SidebarContext {
  provide(SIDEBAR, ctx)
  return ctx
}

/** The sidebar's state and controls (inside a GoopSidebarProvider), like shadcn-vue's. */
export function useSidebar(): SidebarContext {
  const ctx = inject(SIDEBAR, null)
  if (!ctx) throw new Error('useSidebar must be used within a GoopSidebarProvider.')
  return ctx
}

/** Provided by GoopSidebar to its parts: the resolved goo (null outside a GoopSidebar). */
export type GoopSidebarGooContext = ComputedRef<ResolvedSidebarGoo>
const GOO: InjectionKey<GoopSidebarGooContext> = Symbol('goopui.sidebar.goo')

export function provideSidebarGoo(ctx: GoopSidebarGooContext): void {
  provide(GOO, ctx)
}
export function injectSidebarGoo(): GoopSidebarGooContext | null {
  return inject(GOO, null)
}

export const sidebarMenuButtonVariants = cva(
  'peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate',
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

export interface SidebarMenuButtonProps extends PrimitiveProps {
  variant?: SidebarMenuButtonVariants['variant']
  size?: SidebarMenuButtonVariants['size']
  isActive?: boolean
  class?: HTMLAttributes['class']
}

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

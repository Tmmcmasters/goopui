// GoopDrawer's shared state (root -> parts). The root owns `open` / `activeSnapPoint` and
// presence (the panel stays mounted through the engine's close); GoopDrawerContent owns the
// core `createDrawer` controller and registers it here.
import type { DrawerController, DrawerDirection, DrawerSnapPoint } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'

/** vaul-vue's DrawerRoot props (same names, types and defaults). */
export interface GoopDrawerRootProps {
  /** Controlled open state (`v-model:open`). */
  open?: boolean
  /** Opened by default (uncontrolled); skips the initial enter animation. */
  defaultOpen?: boolean
  /** The screen edge it is attached to. Default 'bottom'. */
  direction?: DrawerDirection
  /** Viewport fractions (0..1) or px strings ('300px'), least visible first. */
  snapPoints?: (number | string)[]
  /** Current snap point (`v-model:activeSnapPoint`). Default the first. */
  activeSnapPoint?: number | string | null
  /** Snap index from which the overlay is fully shown. Default the last snap point. */
  fadeFromIndex?: number
  /** 0..1 share of the panel dragged past which a release closes. Default 0.25. */
  closeThreshold?: number
  /** Scale the page wrapper (`[data-vaul-drawer-wrapper]` or `[data-goop-drawer-wrapper]`) back while open. Default true (shadcn). */
  shouldScaleBackground?: boolean
  /** With `shouldScaleBackground`: paint <body> black behind the scaled page. Default true. */
  setBackgroundColorOnScale?: boolean
  /** false: dragging, clicking outside and Escape don't close it. Default true. */
  dismissible?: boolean
  /** false: the page stays interactive and outside clicks don't close it. Default true. */
  modal?: boolean
  /** Opened on top of another GoopDrawer: the parent recedes. */
  nested?: boolean
  /** Only the handle starts a drag. Default false. */
  handleOnly?: boolean
  /** When true, <body> gets no styles (no black background on scale). */
  noBodyStyles?: boolean
  /** Accepted for vaul compatibility (scroll locking is reka-ui's). */
  scrollLockTimeout?: number
  /** Accepted for vaul compatibility (no keyboard repositioning yet). */
  fixed?: boolean
  /** Accepted for vaul compatibility. */
  preventScrollRestoration?: boolean
}

/** vaul-vue's DrawerRoot emits. */
export interface GoopDrawerRootEmits {
  (e: 'update:open', open: boolean): void
  (e: 'update:activeSnapPoint', value: number | string): void
  /** While dragging: share of the panel dragged. */
  (e: 'drag', percentageDragged: number): void
  /** A drag was let go: whether it stays open. */
  (e: 'release', open: boolean): void
  /** The drawer started closing. */
  (e: 'close'): void
  /** An open / close animation finished. */
  (e: 'animationEnd', open: boolean): void
}

export interface DrawerRootContext {
  props: Readonly<GoopDrawerRootProps>
  open: ComputedRef<boolean>
  /** Mounted: open, or still animating its close. */
  present: Ref<boolean>
  /** Whether the first open should skip its enter animation (defaultOpen). */
  instantOpen: Ref<boolean>
  direction: ComputedRef<DrawerDirection>
  activeSnapPoint: ComputedRef<DrawerSnapPoint | null>
  overlay: ShallowRef<HTMLElement | null>
  controller: ShallowRef<DrawerController | null>
  setOpen(open: boolean): void
  setActiveSnapPoint(value: DrawerSnapPoint): void
  onDrag(pct: number): void
  onRelease(open: boolean): void
  onSettle(open: boolean): void
  /** A nested child drawer reports how far it is open (0..1). */
  setNested(t: number, instant?: boolean): void
}

const KEY: InjectionKey<DrawerRootContext> = Symbol('GoopDrawer')

export function provideDrawerRootContext(ctx: DrawerRootContext): void {
  provide(KEY, ctx)
}

export function injectDrawerRootContext(): DrawerRootContext {
  const ctx = inject(KEY, null)
  if (!ctx) throw new Error('[goopui] GoopDrawer parts must be used inside <GoopDrawer>.')
  return ctx
}

/** The enclosing drawer, if any (for nested drawers). */
export function injectParentDrawerContext(): DrawerRootContext | null {
  return inject(KEY, null)
}

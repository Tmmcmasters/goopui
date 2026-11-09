'use client'
// GoopDrawer: shadcn/ui's Drawer (same parts, classes and `data-vaul-*` attributes) with vaul's
// root API (same props and callbacks, `shouldScaleBackground` on by default), built on Radix
// Dialog (focus trap, scroll lock, a11y, Escape / outside dismissal). No vaul: core's
// `createDrawer` owns the drag, snap points, springs and the goo, all in one frame, exactly as
// in @goopui/vue's GoopDrawer. The panel and its goo move as one body: opens and snaps launch
// fast and land with a small overshoot, closes accelerate away, and the edge slosh is driven by
// the panel's real braking.
//
// GoopDrawerContent's background IS the goo (an aria-hidden surface behind the unfiltered
// content), moved by the same engine from the panel's measured motion:
//   lag      the leading edge trails fast moves;
//   slosh    it overshoots and wobbles when the panel brakes (landing, snap, release);
//   rise     an opening panel's landing adds a jelly overshoot;
//   stretch  pulling past full open draws a globby bump toward the finger;
//   handle   the handle is a goo blob: swells, stretches, trails a droplet;
//   splash   a fling-dismiss throws a splash of drops off the edge that fall and fade.
// `goo={false}` is exactly shadcn's DrawerContent look (still driven by the engine).
// Reduced motion: dragging works, no goo sim, snaps without slosh.
//
// Presence: the root keeps the panel mounted (Radix `forceMount`) until the engine reports the
// close finished (`onSettle(false)`), so the close plays at the engine's own pace.
import { createDrawer, type DrawerController, type DrawerDirection, type DrawerOptions, type DrawerSnapPoint } from '@goopui/core'
import { cn } from 'cn'
import { Dialog as DialogPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import { DRAWER_PROP_KEYS, splitProps, toDrawerOptions, type GoopDrawerProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { setRef, useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import {
  DRAWER_CONTENT_GOO,
  DRAWER_CONTENT_SHADCN,
  DRAWER_DESCRIPTION,
  DRAWER_FOOTER,
  DRAWER_HANDLE,
  DRAWER_HANDLE_GOO,
  DRAWER_HEADER,
  DRAWER_OVERLAY,
  DRAWER_TITLE,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

/** vaul's Drawer.Root props (same names, types and defaults). */
export interface GoopDrawerRootProps extends GoopSoundProps {
  children?: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Opened by default (uncontrolled); skips the initial enter animation. */
  defaultOpen?: boolean
  /** Called when the open state changes. */
  onOpenChange?: (open: boolean) => void
  /** The screen edge it is attached to. Default 'bottom'. */
  direction?: DrawerDirection
  /** Viewport fractions (0..1) or px strings ('300px'), least visible first. */
  snapPoints?: (number | string)[]
  /** Current snap point (controlled, with `setActiveSnapPoint`). Default the first. */
  activeSnapPoint?: number | string | null
  /** Called when the resting snap point changes. */
  setActiveSnapPoint?: (snapPoint: number | string | null) => void
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
  /** While dragging: share of the panel dragged. vaul passes the pointer event first; the engine
   *  tracks the pointer itself, so it is `null` here. */
  onDrag?: (event: null, percentageDragged: number) => void
  /** A drag was let go: whether it stays open (event: `null`, as in `onDrag`). */
  onRelease?: (event: null, open: boolean) => void
  /** The drawer started closing. */
  onClose?: () => void
  /** An open / close animation finished. */
  onAnimationEnd?: (open: boolean) => void
  /** Accepted for vaul compatibility (scroll locking is Radix's). */
  scrollLockTimeout?: number
  /** Accepted for vaul compatibility (no keyboard repositioning yet). */
  fixed?: boolean
  /** Accepted for vaul compatibility. */
  preventScrollRestoration?: boolean
  /** Accepted for vaul compatibility. */
  repositionInputs?: boolean
  /** Accepted for vaul compatibility. */
  disablePreventScroll?: boolean
  /** Accepted for vaul compatibility. */
  autoFocus?: boolean
  /** Accepted for vaul compatibility (the panel is portalled into <body>). */
  container?: HTMLElement | null
}

interface DrawerState {
  root: GoopDrawerRootProps
  open: boolean
  /** Mounted: open, or still animating its close. */
  present: boolean
  /** Whether the first open should skip its enter animation (defaultOpen). */
  instantOpen: MutableRefObject<boolean>
  direction: DrawerDirection
  activeSnapPoint: DrawerSnapPoint | null
  overlay: MutableRefObject<HTMLElement | null>
  controller: MutableRefObject<DrawerController | null>
  setOpen(open: boolean): void
  setActiveSnapPoint(value: DrawerSnapPoint): void
  onDrag(pct: number): void
  onRelease(open: boolean): void
  onSettle(open: boolean): void
  /** A nested child drawer reports how far it is open (0..1). */
  setNested(t: number, instant?: boolean): void
}
const DrawerContext = createContext<DrawerState | null>(null)

function useDrawerState(): DrawerState {
  const ctx = useContext(DrawerContext)
  if (!ctx) throw new Error('[goopui] GoopDrawer parts must be used inside <GoopDrawer>.')
  return ctx
}

/** Radix Dialog.Root with vaul's API. Owns `open`, the active snap point and presence. */
export function GoopDrawer(props: GoopDrawerRootProps) {
  const {
    children,
    open: openProp,
    defaultOpen,
    direction = 'bottom',
    snapPoints,
    activeSnapPoint: snapProp,
    modal = true,
    nested = false,
    sound,
  } = props
  useGoopSound(sound)

  // ---- open (controlled or not) ----
  const [inner, setInner] = useState(!!defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : inner
  const [present, setPresent] = useState(open)
  const instantOpen = useRef(open && defaultOpen === true && !controlled)
  const controller = useRef<DrawerController | null>(null)
  const overlay = useRef<HTMLElement | null>(null)

  const latest = useRef({ open, props })
  latest.current = { open, props }
  const setOpen = useCallback(
    (v: boolean) => {
      if (v === latest.current.open) return
      if (latest.current.props.open === undefined) setInner(v)
      latest.current.props.onOpenChange?.(v)
    },
    [],
  )

  // ---- snap points (activeSnapPoint + setActiveSnapPoint) ----
  const [localSnap, setLocalSnap] = useState<DrawerSnapPoint | null>(snapProp ?? snapPoints?.[0] ?? null)
  // A new snapPoints list whose points don't include the current one: back to its first.
  if (snapProp === undefined && snapPoints?.length && (localSnap === null || !snapPoints.includes(localSnap))) setLocalSnap(snapPoints[0]!)
  const activeSnapPoint = snapProp !== undefined && snapProp !== null ? snapProp : localSnap
  const snapNow = useRef(activeSnapPoint)
  snapNow.current = activeSnapPoint
  const setActiveSnapPoint = useCallback((v: DrawerSnapPoint) => {
    if (v === snapNow.current) return
    snapNow.current = v
    setLocalSnap(v)
    latest.current.props.setActiveSnapPoint?.(v)
  }, [])

  // ---- nested: tell the parent drawer how far this one is open ----
  const parentCtx = useContext(DrawerContext)
  const parent = nested ? parentCtx : null
  const parentRef = useRef(parent)
  parentRef.current = parent

  // ---- open / close ----
  const shown = useRef(open)
  useIsomorphicLayoutEffect(() => {
    const was = shown.current
    if (was === open) return
    shown.current = open
    if (open) {
      setPresent(true)
      parentRef.current?.setNested(1)
      controller.current?.open()
      return
    }
    latest.current.props.onClose?.()
    parentRef.current?.setNested(0)
    const c = controller.current
    if (c && c.state !== 'closed') c.close()
    else setPresent(false)
  }, [open])

  const state: DrawerState = {
    root: props,
    open,
    present,
    instantOpen,
    direction,
    activeSnapPoint,
    overlay,
    controller,
    setOpen,
    setActiveSnapPoint,
    onDrag(pct) {
      latest.current.props.onDrag?.(null, pct)
      parentRef.current?.setNested(Math.max(0, 1 - pct), true)
    },
    onRelease(stays) {
      latest.current.props.onRelease?.(null, stays)
      if (stays) parentRef.current?.setNested(1)
    },
    onSettle(isOpen) {
      latest.current.props.onAnimationEnd?.(isOpen)
      if (isOpen) return
      setPresent(false)
      // vaul: a closed drawer reopens at its first snap point.
      const first = latest.current.props.snapPoints?.[0]
      if (first !== undefined) setActiveSnapPoint(first)
    },
    setNested(t, instant) {
      controller.current?.setNested(t, instant)
    },
  }
  return (
    <DrawerContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <DialogPrimitive.Root data-slot="drawer" open={open} onOpenChange={setOpen} modal={modal}>
          {children}
        </DialogPrimitive.Root>
      </GoopSoundScope>
    </DrawerContext.Provider>
  )
}

// ---- trigger / close / portal ------------------------------------------------------------------

export type GoopDrawerTriggerProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>

export const GoopDrawerTrigger = forwardRef<HTMLButtonElement, GoopDrawerTriggerProps>(function GoopDrawerTrigger(props, ref) {
  const cue = useGoopCue('drawerTrigger')
  return (
    <GoopCueClaim>
      <DialogPrimitive.Trigger ref={ref} data-slot="drawer-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopDrawerTrigger.displayName = 'GoopDrawerTrigger'

export type GoopDrawerCloseProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Close>

export const GoopDrawerClose = forwardRef<HTMLButtonElement, GoopDrawerCloseProps>(function GoopDrawerClose(props, ref) {
  const cue = useGoopCue('drawerClose')
  return (
    <GoopCueClaim>
      <DialogPrimitive.Close ref={ref} data-slot="drawer-close" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopDrawerClose.displayName = 'GoopDrawerClose'

export type GoopDrawerPortalProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>

export function GoopDrawerPortal(props: GoopDrawerPortalProps) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />
}

// ---- overlay ------------------------------------------------------------------------------

export type GoopDrawerOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>

/**
 * shadcn's DrawerOverlay (the dimmed backdrop). Its opacity follows the drawer's position every
 * frame (the engine fades it as you drag, and only from `fadeFromIndex` with snap points), so it
 * has no CSS fade. GoopDrawerContent renders one for you.
 */
export const GoopDrawerOverlay = forwardRef<HTMLDivElement, GoopDrawerOverlayProps>(function GoopDrawerOverlay({ className, style, ...props }, ref) {
  const ctx = useDrawerState()
  const own = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) ctx.overlay.current = el
      else if (ctx.overlay.current && !ctx.overlay.current.isConnected) ctx.overlay.current = null
    },
    [ctx.overlay],
  )
  const composed = useComposedRefs<HTMLDivElement>(ref, own)
  if (!ctx.present) return null
  return (
    <DialogPrimitive.Overlay
      ref={composed}
      data-slot="drawer-overlay"
      data-vaul-overlay=""
      forceMount
      className={cn(DRAWER_OVERLAY, className)}
      style={{ opacity: 0, ...style }}
      {...props}
    />
  )
})
GoopDrawerOverlay.displayName = 'GoopDrawerOverlay'

// ---- content ------------------------------------------------------------------------------

export type GoopDrawerContentProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, keyof GoopDrawerProps | 'forceMount'> &
  GoopDrawerProps & {
    /** Receives the live drawer controller (null while closed). */
    goopRef?: Ref<DrawerController>
  }

const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }

export const GoopDrawerContent = forwardRef<HTMLDivElement, GoopDrawerContentProps>(function GoopDrawerContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, DRAWER_PROP_KEYS)
  const { className, children, goopRef, onEscapeKeyDown, onPointerDownOutside, onInteractOutside, ...rest } = props
  const goo = engine.goo !== false

  const ctx = useDrawerState()
  const root = ctx.root
  const config = useGoopConfig()
  const options = useStableValue<DrawerOptions>({
    ...toDrawerOptions(engine, config),
    direction: ctx.direction,
    snapPoints: root.snapPoints,
    activeSnapPoint: ctx.activeSnapPoint,
    fadeFromIndex: root.fadeFromIndex,
    dismissible: root.dismissible !== false,
    closeThreshold: root.closeThreshold ?? 0.25,
    handleOnly: root.handleOnly === true,
    scaleBackground: root.shouldScaleBackground !== false,
    setBackgroundColorOnScale: root.setBackgroundColorOnScale !== false && root.noBodyStyles !== true,
  })

  // The panel element as state: Radix's Portal mounts its children a commit after it mounts, so
  // the engine attaches when the element shows up, not when `present` flips.
  const [panel, setPanel] = useState<HTMLDivElement | null>(null)
  const surface = useRef<HTMLSpanElement | null>(null)
  const composed = useComposedRefs<HTMLDivElement>(ref, setPanel)
  const ctxNow = useRef(ctx)
  ctxNow.current = ctx
  const optionsNow = useRef(options)
  optionsNow.current = options
  const goopRefNow = useRef(goopRef)
  goopRefNow.current = goopRef

  // The panel mounts on every open (and stays mounted through the engine's close). Attach after
  // hydration / mount, before paint.
  useIsomorphicLayoutEffect(() => {
    const el = panel
    if (!el) return
    const c0 = ctxNow.current
    const c = createDrawer(
      el,
      { ...optionsNow.current, overlay: c0.overlay.current, surface: surface.current ?? undefined },
      {
        onDrag: (pct) => ctxNow.current.onDrag(pct),
        onRelease: (stays) => ctxNow.current.onRelease(stays),
        onDismiss: () => ctxNow.current.setOpen(false),
        onSnap: (i) => {
          const p = ctxNow.current.root.snapPoints?.[i]
          if (p !== undefined) ctxNow.current.setActiveSnapPoint(p)
        },
        onSettle: (open) => ctxNow.current.onSettle(open),
      },
    )
    c0.controller.current = c
    setRef(goopRefNow.current, c)
    if (c0.open) {
      c.open({ instant: c0.instantOpen.current })
      c0.instantOpen.current = false
    }
    return () => {
      if (c0.controller.current === c) c0.controller.current = null
      setRef(goopRefNow.current, null)
      c.destroy()
    }
  }, [panel])

  // Options changed (props, snap point, goo on / off): the engine animates to them.
  const applied = useRef(options)
  useIsomorphicLayoutEffect(() => {
    if (applied.current === options) return
    applied.current = options
    ctx.controller.current?.update({ ...options, overlay: ctx.overlay.current, surface: surface.current ?? undefined })
  }, [options])

  // vaul: with `dismissible: false` Escape and outside clicks don't close it; non-modal drawers
  // never close on outside interaction.
  const blockOutside = root.dismissible === false || root.modal === false

  return (
    ctx.present ? (
    <GoopDrawerPortal forceMount>
      <GoopDrawerOverlay />
        <DialogPrimitive.Content
          ref={composed}
          data-slot="drawer-content"
          data-vaul-drawer=""
          data-vaul-drawer-direction={ctx.direction}
          data-vaul-snap-points={root.snapPoints?.length ? 'true' : 'false'}
          forceMount
          className={cn(goo ? DRAWER_CONTENT_GOO : DRAWER_CONTENT_SHADCN, className)}
          onEscapeKeyDown={(e) => {
            onEscapeKeyDown?.(e)
            if (root.dismissible === false) e.preventDefault()
          }}
          onPointerDownOutside={(e) => {
            onPointerDownOutside?.(e)
            if (blockOutside) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            onInteractOutside?.(e)
            if (blockOutside) e.preventDefault()
          }}
          {...rest}
        >
          {goo ? <span ref={surface} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} /> : null}
          <div data-goop-drawer-handle="" data-vaul-handle="" aria-hidden="true" className={goo && engine.handle !== false ? DRAWER_HANDLE_GOO : DRAWER_HANDLE} />
          {children}
        </DialogPrimitive.Content>
    </GoopDrawerPortal>
    ) : null
  )
})
GoopDrawerContent.displayName = 'GoopDrawerContent'

// ---- text parts ---------------------------------------------------------------------------

export function GoopDrawerHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="drawer-header" className={cn(DRAWER_HEADER, className)} {...props} />
}

export function GoopDrawerFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="drawer-footer" className={cn(DRAWER_FOOTER, className)} {...props} />
}

export const GoopDrawerTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(function GoopDrawerTitle(
  { className, ...props },
  ref,
) {
  return <DialogPrimitive.Title ref={ref} data-slot="drawer-title" className={cn(DRAWER_TITLE, className)} {...props} />
})
GoopDrawerTitle.displayName = 'GoopDrawerTitle'

export const GoopDrawerDescription = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  function GoopDrawerDescription({ className, ...props }, ref) {
    return <DialogPrimitive.Description ref={ref} data-slot="drawer-description" className={cn(DRAWER_DESCRIPTION, className)} {...props} />
  },
)
GoopDrawerDescription.displayName = 'GoopDrawerDescription'

'use client'
// GoopDialog: shadcn/ui's Dialog (Radix Dialog, same parts and props) whose panel blooms like
// the Vue GoopDialogContent: detached, a dialog has no trigger to grow from, so it pools from
// its own center, spreads with a lobed edge, overshoots every side and splashes all around;
// close pulls in, wobbles and shrinks back to the center (core `attachEmerge`,
// `detached: true`, DIALOG_FEEL). The overlay is shadcn's fade; `overlay` opts into the goo
// sheet that pours down and drains off (core `attachBackdrop`).
//
// The panel's shadcn background and ring move onto the goo (`--goop-color: var(--popover)`).
// Content opacity follows `--goop-emerge-content`, and goop.css's hold animation keeps Radix's
// Presence mounted while the close plays: the surface calls core's close() in a layout effect,
// which runs before Presence's own (children first), so Presence sees the hold animation.
// With `goo={false}` it is exactly shadcn's DialogContent and overlay. Reduced motion: plain
// open/close.
import {
  attachBackdrop,
  attachEmerge,
  type BackdropHandle,
  type BackdropOptions,
  type EmergeHandle,
  type EmergeOptions,
} from '@goopui/core'
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
import { DIALOG_PROP_KEYS, splitProps, toBackdropOptions, toDialogOptions, type GoopDialogProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { setRef, useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopButton } from '../button/GoopButton'
import {
  DIALOG_CLOSE,
  DIALOG_CONTENT_GOO,
  DIALOG_CONTENT_SHADCN,
  DIALOG_DESCRIPTION,
  DIALOG_FOOTER,
  DIALOG_HEADER,
  DIALOG_OVERLAY_GOO,
  DIALOG_OVERLAY_SHADCN,
  DIALOG_TITLE,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

interface DialogState {
  open: boolean
  /** The trigger element (for `surface="trigger"`). */
  trigger: MutableRefObject<HTMLElement | null>
}
const DialogContext = createContext<DialogState | null>(null)

export type GoopDialogRootProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Root> & GoopSoundProps

/** Radix Dialog.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopDialog({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopDialogRootProps) {
  const [inner, setInner] = useState(!!defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : inner
  const onChange = useCallback(
    (v: boolean) => {
      if (!controlled) setInner(v)
      onOpenChange?.(v)
    },
    [controlled, onOpenChange],
  )
  const trigger = useRef<HTMLElement | null>(null)
  useGoopSound(sound)
  return (
    <DialogContext.Provider value={{ open, trigger }}>
      <GoopSoundScope sound={sound}>
        <DialogPrimitive.Root data-slot="dialog" open={open} onOpenChange={onChange} {...props} />
      </GoopSoundScope>
    </DialogContext.Provider>
  )
}

const useDialogState = (): DialogState => useContext(DialogContext) ?? FALLBACK
const FALLBACK: DialogState = { open: false, trigger: { current: null } }

// ---- trigger / close / portal ------------------------------------------------------------------

export type GoopDialogTriggerProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>

export const GoopDialogTrigger = forwardRef<HTMLButtonElement, GoopDialogTriggerProps>(function GoopDialogTrigger(props, ref) {
  const { trigger } = useDialogState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('dialogTrigger')
  return (
    <GoopCueClaim>
      <DialogPrimitive.Trigger ref={composed} data-slot="dialog-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopDialogTrigger.displayName = 'GoopDialogTrigger'

export type GoopDialogCloseProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Close>

export const GoopDialogClose = forwardRef<HTMLButtonElement, GoopDialogCloseProps>(function GoopDialogClose(props, ref) {
  const cue = useGoopCue('dialogClose')
  return (
    <GoopCueClaim>
      <DialogPrimitive.Close ref={ref} data-slot="dialog-close" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopDialogClose.displayName = 'GoopDialogClose'

export type GoopDialogPortalProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Portal>

export function GoopDialogPortal(props: GoopDialogPortalProps) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

// ---- goo surfaces ---------------------------------------------------------------------------

interface Attachable<O> {
  open(): void
  close(): number
  update(o: O): void
  destroy(): void
}

const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }

/**
 * The aria-hidden goo surface inside a panel or overlay. Attaches to its parent (the Radix
 * Content / Overlay, which Presence remounts on every open) when it mounts, and plays open /
 * close as `open` flips. Layout effects run child-first, so close() (which sets the hold
 * animation's duration) lands before Radix Presence reads the exit animation.
 */
function GooSurface<O, H extends Attachable<O>>({
  options,
  open,
  create,
  handleRef,
}: {
  options: O
  open: boolean
  create: (host: HTMLElement, el: HTMLElement, o: O) => H
  /** Gets the live handle when the surface attaches, null when it goes. */
  handleRef?: Ref<H>
}) {
  const el = useRef<HTMLSpanElement | null>(null)
  const handle = useRef<H | null>(null)
  const shown = useRef(open)
  const latest = useRef(options)
  latest.current = options
  const openNow = useRef(open)
  openNow.current = open

  useIsomorphicLayoutEffect(() => {
    const span = el.current
    const host = span?.parentElement
    if (!span || !host) return
    const h = create(host, span, latest.current)
    handle.current = h
    setRef(handleRef, h)
    shown.current = openNow.current
    if (openNow.current) h.open()
    return () => {
      h.destroy()
      handle.current = null
      setRef(handleRef, null)
    }
    // `create` is stable per surface kind.
  }, [])

  useIsomorphicLayoutEffect(() => {
    handle.current?.update(options)
  }, [options])

  useIsomorphicLayoutEffect(() => {
    const h = handle.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else h.close()
  }, [open])

  return <span ref={el} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} />
}

const createPanel =
  (anchor: () => HTMLElement | null) =>
  (host: HTMLElement, el: HTMLElement, o: EmergeOptions): EmergeHandle =>
    attachEmerge(host, { ...o, surface: el, anchor })
const createBackdrop = (host: HTMLElement, el: HTMLElement, o: BackdropOptions): BackdropHandle => attachBackdrop(host, { ...o, surface: el })

// ---- overlay ------------------------------------------------------------------------------

export type GoopDialogOverlayProps = ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay> & {
  /** Goo pour (opt-in). Default `false`: shadcn's fading overlay. */
  goo?: boolean
  /** Drippy leading edge: `true`, `false` (a straight edge) or a 0..2 strength. */
  drips?: GoopDialogProps['overlayDrips']
  speed?: number
  preset?: GoopDialogProps['preset']
  renderer?: GoopDialogProps['renderer']
  /** Receives the live backdrop handle (null before mount / when goo is off). */
  goopRef?: Ref<BackdropHandle>
}

/**
 * shadcn's DialogOverlay. With `goo`, the dimmed backdrop is a goo sheet (core
 * `attachBackdrop`) that pours down over the page with a drippy leading edge and drains off the
 * bottom on close. Color and dim come from `--goop-backdrop-color` (default black) and
 * `--goop-backdrop-opacity` (default 0.5). GoopDialogContent renders one for you.
 */
export const GoopDialogOverlay = forwardRef<HTMLDivElement, GoopDialogOverlayProps>(function GoopDialogOverlay(
  { className, goo = false, drips, speed, preset, renderer, goopRef, children, ...props },
  ref,
) {
  const { open } = useDialogState()
  const config = useGoopConfig()
  const options = useStableValue(toBackdropOptions({ goo, overlayDrips: drips, speed, preset, renderer }, config))
  return (
    <DialogPrimitive.Overlay ref={ref} data-slot="dialog-overlay" className={cn(goo ? DIALOG_OVERLAY_GOO : DIALOG_OVERLAY_SHADCN, className)} {...props}>
      {goo && options ? <GooSurface options={options} open={open} create={createBackdrop} handleRef={goopRef} /> : null}
      {children}
    </DialogPrimitive.Overlay>
  )
})
GoopDialogOverlay.displayName = 'GoopDialogOverlay'

// ---- content ------------------------------------------------------------------------------

export type GoopDialogContentProps = Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, keyof GoopDialogProps> &
  GoopDialogProps & {
    /** Render the corner close (X) button. */
    showCloseButton?: boolean
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
  }

export const GoopDialogContent = forwardRef<HTMLDivElement, GoopDialogContentProps>(function GoopDialogContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, DIALOG_PROP_KEYS)
  const { className, children, showCloseButton = true, goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open, trigger } = useDialogState()
  const config = useGoopConfig()
  const options = useStableValue(toDialogOptions(engine, config, 'dialog'))
  const create = useRef(createPanel(() => trigger.current)).current

  return (
    <GoopDialogPortal>
      <GoopDialogOverlay
        goo={goo && engine.overlay === true}
        drips={engine.overlayDrips}
        speed={engine.speed}
        preset={engine.preset}
        renderer={engine.renderer}
      />
      <DialogPrimitive.Content ref={ref} data-slot="dialog-content" className={cn(goo ? DIALOG_CONTENT_GOO : DIALOG_CONTENT_SHADCN, className)} {...rest}>
        {goo ? <GooSurface options={options} open={open} create={create} handleRef={goopRef} /> : null}
        {children}
        {showCloseButton ? (
          <GoopDialogClose asChild>
            <GoopButton variant="ghost" className={DIALOG_CLOSE} size="icon-sm">
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
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </GoopButton>
          </GoopDialogClose>
        ) : null}
      </DialogPrimitive.Content>
    </GoopDialogPortal>
  )
})
GoopDialogContent.displayName = 'GoopDialogContent'

// ---- text parts ---------------------------------------------------------------------------

export function GoopDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="dialog-header" className={cn(DIALOG_HEADER, className)} {...props} />
}

export function GoopDialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  /** Append an outline "Close" button. */
  showCloseButton?: boolean
  children?: ReactNode
}) {
  return (
    <div data-slot="dialog-footer" className={cn(DIALOG_FOOTER, className)} {...props}>
      {children}
      {showCloseButton ? (
        <GoopDialogClose asChild>
          <GoopButton variant="outline">Close</GoopButton>
        </GoopDialogClose>
      ) : null}
    </div>
  )
}

export const GoopDialogTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(function GoopDialogTitle(
  { className, ...props },
  ref,
) {
  return <DialogPrimitive.Title ref={ref} data-slot="dialog-title" className={cn(DIALOG_TITLE, className)} {...props} />
})
GoopDialogTitle.displayName = 'GoopDialogTitle'

export const GoopDialogDescription = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Description>>(
  function GoopDialogDescription({ className, ...props }, ref) {
    return <DialogPrimitive.Description ref={ref} data-slot="dialog-description" className={cn(DIALOG_DESCRIPTION, className)} {...props} />
  },
)
GoopDialogDescription.displayName = 'GoopDialogDescription'

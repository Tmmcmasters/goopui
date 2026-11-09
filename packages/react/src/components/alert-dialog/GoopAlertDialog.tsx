'use client'
// GoopAlertDialog: shadcn/ui's AlertDialog (Radix AlertDialog, same parts, props and classes,
// `size` on the content, AlertDialogMedia) whose panel blooms from its own center like
// GoopDialogContent, but an alert is the serious one: a lighter splash (a few small drops, core
// ALERT_DIALOG_SPLASH) and a lighter slosh (ALERT_DIALOG_MOMENTUM); every toggle and knob still
// turns it up or off. The overlay is shadcn's fade; `overlay` opts into the goo sheet that
// pours down (core `attachBackdrop`). `goo={false}`: exactly shadcn's AlertDialogContent.
// Mirrors the Vue GoopAlertDialog*. Reduced motion: plain open/close.
import { attachBackdrop, attachEmerge, type BackdropHandle, type BackdropOptions, type EmergeHandle, type EmergeOptions } from '@goopui/core'
import { cn } from 'cn'
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'
import { BloomSurface, useOpenState } from '../../bloom-surface'
import { useGoopConfig } from '../../config'
import { DIALOG_PROP_KEYS, splitProps, toBackdropOptions, toDialogOptions, type GoopDialogProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useStableValue } from '../../utils'
import { GoopButton } from '../button/GoopButton'
import type { ButtonSize, ButtonVariant } from '../button/variants'
import { DIALOG_OVERLAY_GOO, DIALOG_OVERLAY_SHADCN } from '../dialog/styles'
import {
  ALERT_DIALOG_CONTENT_GOO,
  ALERT_DIALOG_CONTENT_SHADCN,
  ALERT_DIALOG_DESCRIPTION,
  ALERT_DIALOG_FOOTER,
  ALERT_DIALOG_HEADER,
  ALERT_DIALOG_MEDIA,
  ALERT_DIALOG_TITLE,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

interface AlertDialogState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
}
const AlertDialogContext = createContext<AlertDialogState | null>(null)
const FALLBACK: AlertDialogState = { open: false, trigger: { current: null } }
const useAlertDialogState = (): AlertDialogState => useContext(AlertDialogContext) ?? FALLBACK

export type GoopAlertDialogRootProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Root> & GoopSoundProps

/** Radix AlertDialog.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopAlertDialog({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopAlertDialogRootProps) {
  const [open, onChange] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  useGoopSound(sound)
  return (
    <AlertDialogContext.Provider value={{ open, trigger }}>
      <GoopSoundScope sound={sound}>
        <AlertDialogPrimitive.Root data-slot="alert-dialog" open={open} onOpenChange={onChange} {...props} />
      </GoopSoundScope>
    </AlertDialogContext.Provider>
  )
}

// ---- trigger / portal ------------------------------------------------------------------------

export type GoopAlertDialogTriggerProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Trigger>

export const GoopAlertDialogTrigger = forwardRef<HTMLButtonElement, GoopAlertDialogTriggerProps>(function GoopAlertDialogTrigger(props, ref) {
  const { trigger } = useAlertDialogState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('dialogTrigger')
  return (
    <GoopCueClaim>
      <AlertDialogPrimitive.Trigger ref={composed} data-slot="alert-dialog-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopAlertDialogTrigger.displayName = 'GoopAlertDialogTrigger'

export type GoopAlertDialogPortalProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Portal>

export function GoopAlertDialogPortal(props: GoopAlertDialogPortalProps) {
  return <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
}

// ---- overlay ---------------------------------------------------------------------------------

const createBackdrop = (host: HTMLElement, el: HTMLElement, o: BackdropOptions): BackdropHandle => attachBackdrop(host, { ...o, surface: el })

export type GoopAlertDialogOverlayProps = ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay> & {
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

/** shadcn's AlertDialogOverlay. With `goo`, the dimmed backdrop pours down as a goo sheet and
 *  drains off on close (like GoopDialogOverlay). GoopAlertDialogContent renders one for you. */
export const GoopAlertDialogOverlay = forwardRef<HTMLDivElement, GoopAlertDialogOverlayProps>(function GoopAlertDialogOverlay(
  { className, goo = false, drips, speed, preset, renderer, goopRef, children, ...props },
  ref,
) {
  const { open } = useAlertDialogState()
  const config = useGoopConfig()
  const options = useStableValue(toBackdropOptions({ goo, overlayDrips: drips, speed, preset, renderer }, config))
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      data-slot="alert-dialog-overlay"
      className={cn(goo ? DIALOG_OVERLAY_GOO : DIALOG_OVERLAY_SHADCN, className)}
      {...props}
    >
      {goo && options ? <BloomSurface options={options} open={open} create={createBackdrop} handleRef={goopRef} /> : null}
      {children}
    </AlertDialogPrimitive.Overlay>
  )
})
GoopAlertDialogOverlay.displayName = 'GoopAlertDialogOverlay'

// ---- content ---------------------------------------------------------------------------------

export type GoopAlertDialogContentProps = Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>, keyof GoopDialogProps> &
  GoopDialogProps & {
    /** shadcn's content size: `sm` is narrower, with a two-column footer. */
    size?: 'default' | 'sm'
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
  }

export const GoopAlertDialogContent = forwardRef<HTMLDivElement, GoopAlertDialogContentProps>(function GoopAlertDialogContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, DIALOG_PROP_KEYS)
  const { className, children, size = 'default', goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open, trigger } = useAlertDialogState()
  const config = useGoopConfig()
  const options = useStableValue(toDialogOptions(engine, config, 'alert'))
  const create = useRef(
    (host: HTMLElement, el: HTMLElement, o: EmergeOptions): EmergeHandle => attachEmerge(host, { ...o, surface: el, anchor: () => trigger.current }),
  ).current

  return (
    <GoopAlertDialogPortal>
      <GoopAlertDialogOverlay
        goo={goo && engine.overlay === true}
        drips={engine.overlayDrips}
        speed={engine.speed}
        preset={engine.preset}
        renderer={engine.renderer}
      />
      <AlertDialogPrimitive.Content
        ref={ref}
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(goo ? ALERT_DIALOG_CONTENT_GOO : ALERT_DIALOG_CONTENT_SHADCN, className)}
        {...rest}
      >
        {goo ? <BloomSurface options={options} open={open} create={create} handleRef={goopRef} /> : null}
        {children}
      </AlertDialogPrimitive.Content>
    </GoopAlertDialogPortal>
  )
})
GoopAlertDialogContent.displayName = 'GoopAlertDialogContent'

// ---- text parts ------------------------------------------------------------------------------

export function GoopAlertDialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-dialog-header" className={cn(ALERT_DIALOG_HEADER, className)} {...props} />
}

export function GoopAlertDialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-dialog-footer" className={cn(ALERT_DIALOG_FOOTER, className)} {...props} />
}

/** shadcn's AlertDialogMedia: an icon tile beside (or above) the title. */
export function GoopAlertDialogMedia({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="alert-dialog-media" className={cn(ALERT_DIALOG_MEDIA, className)} {...props} />
}

export const GoopAlertDialogTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>>(
  function GoopAlertDialogTitle({ className, ...props }, ref) {
    return <AlertDialogPrimitive.Title ref={ref} data-slot="alert-dialog-title" className={cn(ALERT_DIALOG_TITLE, className)} {...props} />
  },
)
GoopAlertDialogTitle.displayName = 'GoopAlertDialogTitle'

export const GoopAlertDialogDescription = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>>(
  function GoopAlertDialogDescription({ className, ...props }, ref) {
    return (
      <AlertDialogPrimitive.Description ref={ref} data-slot="alert-dialog-description" className={cn(ALERT_DIALOG_DESCRIPTION, className)} {...props} />
    )
  },
)
GoopAlertDialogDescription.displayName = 'GoopAlertDialogDescription'

// ---- action / cancel -------------------------------------------------------------------------

interface ButtonPartProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** The button's goo (GoopButton `goo`). */
  goo?: boolean
  children?: ReactNode
}

export type GoopAlertDialogActionProps = Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>, 'asChild'> & ButtonPartProps

/** shadcn's AlertDialogAction (closes the dialog), rendered as a GoopButton (default variant). */
export const GoopAlertDialogAction = forwardRef<HTMLButtonElement, GoopAlertDialogActionProps>(function GoopAlertDialogAction(
  { className, variant = 'default', size = 'default', goo, children, ...props },
  ref,
) {
  const cue = useGoopCue('alertDialogAction')
  return (
    <GoopCueClaim>
      <AlertDialogPrimitive.Action ref={ref} data-slot="alert-dialog-action" asChild {...cue} {...props}>
        <GoopButton variant={variant} size={size} goo={goo} className={className}>
          {children}
        </GoopButton>
      </AlertDialogPrimitive.Action>
    </GoopCueClaim>
  )
})
GoopAlertDialogAction.displayName = 'GoopAlertDialogAction'

export type GoopAlertDialogCancelProps = Omit<ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>, 'asChild'> & ButtonPartProps

/** shadcn's AlertDialogCancel (closes the dialog, gets the initial focus), an outline GoopButton. */
export const GoopAlertDialogCancel = forwardRef<HTMLButtonElement, GoopAlertDialogCancelProps>(function GoopAlertDialogCancel(
  { className, variant = 'outline', size = 'default', goo, children, ...props },
  ref,
) {
  const cue = useGoopCue('alertDialogCancel')
  return (
    <GoopCueClaim>
      <AlertDialogPrimitive.Cancel ref={ref} data-slot="alert-dialog-cancel" asChild {...cue} {...props}>
        <GoopButton variant={variant} size={size} goo={goo} className={className}>
          {children}
        </GoopButton>
      </AlertDialogPrimitive.Cancel>
    </GoopCueClaim>
  )
})
GoopAlertDialogCancel.displayName = 'GoopAlertDialogCancel'

'use client'
// GoopSheet: shadcn/ui's Sheet (Radix Dialog, same parts, props and classes, `side` top |
// right | bottom | left, close button) whose panel blooms in from its screen edge, like the Vue
// GoopSheetContent. Core's `attachSheet` (the dialog's detached bloom with its origin at the
// middle of the screen edge) draws the sheet's background as goo on an aria-hidden surface
// behind the real, unfiltered content: a blob appears at the edge's middle, spreads in lobes to
// fill the sheet, overshoots the inner edge and wobbles, then throws the big splash off the
// inner edge and sides (never off-screen); the drops fall and fade and then nothing moves.
// Close: the goo pulls in and shrinks back into the edge.
//
// The sheet's shadcn background, border and shadow move onto the goo (`--goop-color:
// var(--popover)`, a drop-shadow on the surface). goop.css's hold animation keeps Radix's
// Presence mounted while the close plays (the overlay fades over the same time). Canvas
// renderer by default (a big surface). With `goo={false}` it is exactly shadcn's SheetContent.
// Reduced motion: plain open/close, no goo motion.
import { attachSheet, type SheetHandle, type SheetOptions } from '@goopui/core'
import { cn } from 'cn'
import { Dialog as SheetPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react'
import { BloomSurface, SQUARE_SURFACE_STYLE, useOpenState } from '../../bloom-surface'
import { useGoopConfig } from '../../config'
import { SHEET_PROP_KEYS, splitProps, toSheetOptions, type GoopSheetProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopButton } from '../button/GoopButton'

type Side = 'top' | 'right' | 'bottom' | 'left'

// shadcn/ui's Sheet classes (style `radix-nova`; `data-open:` / `data-closed:` spelled out as
// the `data-[state=...]` Radix emits, the `data-[side=...]` positions as per-side classes).
const OVERLAY =
  'fixed inset-0 z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
const BASE = 'fixed z-50 flex flex-col gap-4 text-sm text-popover-foreground outline-none'
const SHADCN_BASE =
  'bg-popover bg-clip-padding shadow-lg transition duration-200 ease-in-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
const SIDES: Record<Side, string> = {
  right: 'inset-y-0 right-0 h-full w-3/4 sm:max-w-sm',
  left: 'inset-y-0 left-0 h-full w-3/4 sm:max-w-sm',
  top: 'inset-x-0 top-0 h-auto',
  bottom: 'inset-x-0 bottom-0 h-auto',
}
const SHADCN_SIDES: Record<Side, string> = {
  right: 'border-l data-[state=open]:slide-in-from-right-10 data-[state=closed]:slide-out-to-right-10',
  left: 'border-r data-[state=open]:slide-in-from-left-10 data-[state=closed]:slide-out-to-left-10',
  top: 'border-b data-[state=open]:slide-in-from-top-10 data-[state=closed]:slide-out-to-top-10',
  bottom: 'border-t data-[state=open]:slide-in-from-bottom-10 data-[state=closed]:slide-out-to-bottom-10',
}
/** The goo paints the background, border and shadow; no CSS slide. */
const GOO = '[--goop-color:var(--popover)]'

// ---- root ------------------------------------------------------------------------------------

interface SheetState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
}
const SheetContext = createContext<SheetState | null>(null)
const FALLBACK: SheetState = { open: false, trigger: { current: null } }
const useSheetState = (): SheetState => useContext(SheetContext) ?? FALLBACK

export type GoopSheetRootProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Root> & GoopSoundProps

/** Radix Dialog.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopSheet({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopSheetRootProps) {
  const [open, onChange] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  useGoopSound(sound)
  return (
    <SheetContext.Provider value={{ open, trigger }}>
      <GoopSoundScope sound={sound}>
        <SheetPrimitive.Root data-slot="sheet" open={open} onOpenChange={onChange} {...props} />
      </GoopSoundScope>
    </SheetContext.Provider>
  )
}

// ---- trigger / close / portal ----------------------------------------------------------------

export type GoopSheetTriggerProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Trigger>

export const GoopSheetTrigger = forwardRef<HTMLButtonElement, GoopSheetTriggerProps>(function GoopSheetTrigger(props, ref) {
  const { trigger } = useSheetState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('sheetTrigger')
  return (
    <GoopCueClaim>
      <SheetPrimitive.Trigger ref={composed} data-slot="sheet-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopSheetTrigger.displayName = 'GoopSheetTrigger'

export type GoopSheetCloseProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Close>

export const GoopSheetClose = forwardRef<HTMLButtonElement, GoopSheetCloseProps>(function GoopSheetClose(props, ref) {
  const cue = useGoopCue('sheetClose')
  return (
    <GoopCueClaim>
      <SheetPrimitive.Close ref={ref} data-slot="sheet-close" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopSheetClose.displayName = 'GoopSheetClose'

export type GoopSheetPortalProps = ComponentPropsWithoutRef<typeof SheetPrimitive.Portal>

export function GoopSheetPortal(props: GoopSheetPortalProps) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

// ---- content ---------------------------------------------------------------------------------

export type GoopSheetContentProps = Omit<ComponentPropsWithoutRef<typeof SheetPrimitive.Content>, keyof GoopSheetProps> &
  GoopSheetProps & {
    /** Edge the sheet comes in from. */
    side?: Side
    /** Show the X close button in the top-right corner. */
    showCloseButton?: boolean
    /** Receives the live sheet handle (null before mount / when goo is off). */
    goopRef?: Ref<SheetHandle>
  }

export const GoopSheetContent = forwardRef<HTMLDivElement, GoopSheetContentProps>(function GoopSheetContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, SHEET_PROP_KEYS)
  const { className, children, side = 'right', showCloseButton = true, goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open } = useSheetState()
  const config = useGoopConfig()
  const options = useStableValue(toSheetOptions(engine, config))
  const sideRef = useRef(side)
  sideRef.current = side
  const create = useRef((host: HTMLElement, el: HTMLElement, o: SheetOptions): SheetHandle => attachSheet(host, { ...o, surface: el, side: () => sideRef.current })).current

  // Goo on: the overlay fades over the goo's close, so the backdrop doesn't vanish first.
  const [closeMs, setCloseMs] = useState(0)
  const handle = useRef<SheetHandle | null>(null)
  const handleRef = useComposedRefs<SheetHandle>(goopRef, handle)
  const onAttach = useCallback((h: SheetHandle) => setCloseMs(h.closeDuration), [])
  const firstSide = useRef(true)
  useIsomorphicLayoutEffect(() => {
    if (firstSide.current) firstSide.current = false
    else handle.current?.refresh()
  }, [side])

  return (
    <GoopSheetPortal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className={OVERLAY}
        style={goo && closeMs > 0 ? { animationDuration: `${closeMs}ms` } : undefined}
      />
      <SheetPrimitive.Content
        ref={ref}
        data-slot="sheet-content"
        data-side={side}
        className={cn(BASE, SIDES[side], goo ? GOO : [SHADCN_BASE, SHADCN_SIDES[side]], className)}
        {...rest}
      >
        {goo ? (
          <BloomSurface options={options} open={open} create={create} handleRef={handleRef} onAttach={onAttach} style={SQUARE_SURFACE_STYLE} />
        ) : null}
        {children}
        {showCloseButton ? (
          <GoopSheetClose asChild>
            <GoopButton variant="ghost" size="icon-sm" goo={goo ? undefined : false} className="absolute top-3 right-3">
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
          </GoopSheetClose>
        ) : null}
      </SheetPrimitive.Content>
    </GoopSheetPortal>
  )
})
GoopSheetContent.displayName = 'GoopSheetContent'

// ---- text parts ------------------------------------------------------------------------------

export function GoopSheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />
}

export function GoopSheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-footer" className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />
}

export const GoopSheetTitle = forwardRef<HTMLHeadingElement, ComponentPropsWithoutRef<typeof SheetPrimitive.Title>>(function GoopSheetTitle(
  { className, ...props },
  ref,
) {
  return <SheetPrimitive.Title ref={ref} data-slot="sheet-title" className={cn('cn-font-heading text-base font-medium text-foreground', className)} {...props} />
})
GoopSheetTitle.displayName = 'GoopSheetTitle'

export const GoopSheetDescription = forwardRef<HTMLParagraphElement, ComponentPropsWithoutRef<typeof SheetPrimitive.Description>>(
  function GoopSheetDescription({ className, ...props }, ref) {
    return <SheetPrimitive.Description ref={ref} data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />
  },
)
GoopSheetDescription.displayName = 'GoopSheetDescription'

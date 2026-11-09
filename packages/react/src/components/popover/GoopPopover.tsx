'use client'
// GoopPopover: shadcn/ui's Popover (Radix Popover, same parts, props and classes) whose panel
// blooms like the Vue GoopPopoverContent. Core's `attachEmerge` draws the panel's background
// as goo on an aria-hidden surface behind the real, unfiltered content. By default (`flow`,
// `flowStyle: 'bloom'`) the panel pools from its own center: a droplet (or a few fusing drops,
// `bloomStart: 'merge'`) spreads out into the panel, its edges slosh and it splashes drops off
// every side, kept off the trigger; close contracts it back to the center. `flowStyle: 'neck'`
// runs out of the trigger through a thick neck; `flow={false}` inflates from a bulb.
//
// The panel's shadcn background, ring and shadow move onto the goo (`--goop-color`, a
// drop-shadow on the surface). `surface` picks the color: by default the trigger's background
// and text color (theme primary when the trigger has none). Content opacity follows
// `--goop-emerge-content`, and goop.css's hold animation keeps Radix's Presence mounted while
// the close plays. With `goo={false}` it is exactly shadcn's PopoverContent. Reduced motion:
// plain open/close.
import { attachEmerge, type EmergeHandle, type EmergeOptions } from '@goopui/core'
import { cn } from 'cn'
import { Popover as PopoverPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useContext,
  useRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react'
import { BloomSurface, positioned, useOpenState } from '../../bloom-surface'
import { useGoopConfig } from '../../config'
import { POPOVER_PROP_KEYS, splitProps, toPopoverOptions, type GoopPopoverProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useStableValue } from '../../utils'

/** shadcn's PopoverContent (`goo={false}`). */
const POPOVER_CONTENT_SHADCN =
  'z-50 flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
/** Goo on: the goo paints the background (popover color), ring and shadow; no CSS enter/exit. */
const POPOVER_CONTENT_GOO =
  'z-50 flex w-72 flex-col gap-2.5 rounded-lg p-2.5 text-sm text-popover-foreground [--goop-color:var(--popover)] outline-hidden'

// ---- root ------------------------------------------------------------------------------------

interface PopoverState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
  /** A GoopPopoverAnchor, if any: the goo emerges from it instead of the trigger. */
  anchor: MutableRefObject<HTMLElement | null>
}
const PopoverContext = createContext<PopoverState | null>(null)
const FALLBACK: PopoverState = { open: false, trigger: { current: null }, anchor: { current: null } }
const usePopoverState = (): PopoverState => useContext(PopoverContext) ?? FALLBACK

export type GoopPopoverRootProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Root> & GoopSoundProps

/** Radix Popover.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopPopover({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopPopoverRootProps) {
  const [open, onChange] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const anchor = useRef<HTMLElement | null>(null)
  useGoopSound(sound)
  return (
    <PopoverContext.Provider value={{ open, trigger, anchor }}>
      <GoopSoundScope sound={sound}>
        <PopoverPrimitive.Root data-slot="popover" open={open} onOpenChange={onChange} {...props} />
      </GoopSoundScope>
    </PopoverContext.Provider>
  )
}

// ---- trigger / anchor ------------------------------------------------------------------------

export type GoopPopoverTriggerProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>

/** shadcn's PopoverTrigger. The goo takes its color from this element (`surface="trigger"`)
 *  unless a GoopPopoverAnchor is present. */
export const GoopPopoverTrigger = forwardRef<HTMLButtonElement, GoopPopoverTriggerProps>(function GoopPopoverTrigger(props, ref) {
  const { open, trigger } = usePopoverState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('popoverTrigger', { open })
  return (
    <GoopCueClaim>
      <PopoverPrimitive.Trigger ref={composed} data-slot="popover-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopPopoverTrigger.displayName = 'GoopPopoverTrigger'

export type GoopPopoverAnchorProps = ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>

/** shadcn's PopoverAnchor. Positions the content, and the goo emerges from it. */
export const GoopPopoverAnchor = forwardRef<HTMLDivElement, GoopPopoverAnchorProps>(function GoopPopoverAnchor(props, ref) {
  const { anchor } = usePopoverState()
  const composed = useComposedRefs<HTMLDivElement>(ref, anchor as MutableRefObject<HTMLDivElement | null>)
  return <PopoverPrimitive.Anchor ref={composed} data-slot="popover-anchor" {...props} />
})
GoopPopoverAnchor.displayName = 'GoopPopoverAnchor'

// ---- content ---------------------------------------------------------------------------------

export type GoopPopoverContentProps = Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>, keyof GoopPopoverProps> &
  GoopPopoverProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
  }

export const GoopPopoverContent = forwardRef<HTMLDivElement, GoopPopoverContentProps>(function GoopPopoverContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, POPOVER_PROP_KEYS)
  const { className, children, align = 'center', sideOffset = 4, goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open, trigger, anchor } = usePopoverState()
  const config = useGoopConfig()
  const options = useStableValue(toPopoverOptions(engine, config))
  const create = useRef((host: HTMLElement, el: HTMLElement, o: EmergeOptions): EmergeHandle =>
    attachEmerge(host, { ...o, surface: el, anchor: () => anchor.current ?? trigger.current, ready: () => positioned(host) }),
  ).current

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(goo ? POPOVER_CONTENT_GOO : POPOVER_CONTENT_SHADCN, className)}
        {...rest}
      >
        {goo ? <BloomSurface options={options} open={open} create={create} handleRef={goopRef} /> : null}
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
GoopPopoverContent.displayName = 'GoopPopoverContent'

// ---- text parts ------------------------------------------------------------------------------

export function GoopPopoverHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="popover-header" className={cn('flex flex-col gap-0.5 text-sm', className)} {...props} />
}

export function GoopPopoverTitle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="popover-title" className={cn('font-medium', className)} {...props} />
}

export function GoopPopoverDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="popover-description" className={cn('text-muted-foreground', className)} {...props} />
}

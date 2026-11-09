'use client'
// GoopHoverCard: shadcn/ui's HoverCard (Radix HoverCard, same parts, props and classes) drawn
// with GoopPopoverContent's emerge engine, like the Vue GoopHoverCardContent. By default it
// blooms from the side facing its trigger (`bloomFrom: 'trigger'`: the puddle starts on the
// card's edge in line with the trigger, spreads with a lobed edge, overshoots, splashes drops
// all around that keep off the trigger, and shrinks back into that edge on close).
// `bloomFrom="center"`: from the card's center, like the popover.
//
// The card's shadcn background, ring and shadow move onto the goo. `surface` defaults to
// 'popover' (a hover card's trigger is usually a link with no background). With `goo={false}`
// it is exactly shadcn's HoverCardContent. Reduced motion: plain open/close.
import { attachEmerge, type EmergeHandle, type EmergeOptions } from '@goopui/core'
import { cn } from 'cn'
import { HoverCard as HoverCardPrimitive } from 'radix-ui'
import { createContext, forwardRef, useContext, useRef, type ComponentPropsWithoutRef, type MutableRefObject, type Ref } from 'react'
import { BloomSurface, positioned, useOpenState } from '../../bloom-surface'
import { useGoopConfig } from '../../config'
import { HOVER_CARD_PROP_KEYS, splitProps, toHoverCardOptions, type GoopHoverCardProps } from '../../goop-props'
import { useComposedRefs, useStableValue } from '../../utils'

/** shadcn's HoverCardContent (`goo={false}`). */
const HOVER_CARD_CONTENT_SHADCN =
  'z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-lg bg-popover p-2.5 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
/** Goo on: the goo paints the background (popover color), ring and shadow; no CSS enter/exit. */
const HOVER_CARD_CONTENT_GOO = 'z-50 w-64 rounded-lg p-2.5 text-sm text-popover-foreground [--goop-color:var(--popover)] outline-hidden'

interface HoverCardState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
}
const HoverCardContext = createContext<HoverCardState | null>(null)
const FALLBACK: HoverCardState = { open: false, trigger: { current: null } }
const useHoverCardState = (): HoverCardState => useContext(HoverCardContext) ?? FALLBACK

export type GoopHoverCardRootProps = ComponentPropsWithoutRef<typeof HoverCardPrimitive.Root>

/** Radix HoverCard.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopHoverCard({ open: openProp, defaultOpen, onOpenChange, ...props }: GoopHoverCardRootProps) {
  const [open, onChange] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  return (
    <HoverCardContext.Provider value={{ open, trigger }}>
      <HoverCardPrimitive.Root data-slot="hover-card" open={open} onOpenChange={onChange} {...props} />
    </HoverCardContext.Provider>
  )
}

export type GoopHoverCardTriggerProps = ComponentPropsWithoutRef<typeof HoverCardPrimitive.Trigger>

/** shadcn's HoverCardTrigger (an `<a>`). The card's goo blooms from the side facing it. */
export const GoopHoverCardTrigger = forwardRef<HTMLAnchorElement, GoopHoverCardTriggerProps>(function GoopHoverCardTrigger(props, ref) {
  const { trigger } = useHoverCardState()
  const composed = useComposedRefs<HTMLAnchorElement>(ref, trigger as MutableRefObject<HTMLAnchorElement | null>)
  return <HoverCardPrimitive.Trigger ref={composed} data-slot="hover-card-trigger" {...props} />
})
GoopHoverCardTrigger.displayName = 'GoopHoverCardTrigger'

export type GoopHoverCardContentProps = Omit<ComponentPropsWithoutRef<typeof HoverCardPrimitive.Content>, keyof GoopHoverCardProps> &
  GoopHoverCardProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
  }

export const GoopHoverCardContent = forwardRef<HTMLDivElement, GoopHoverCardContentProps>(function GoopHoverCardContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, HOVER_CARD_PROP_KEYS)
  const { className, children, align = 'center', sideOffset = 4, goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open, trigger } = useHoverCardState()
  const config = useGoopConfig()
  const options = useStableValue(toHoverCardOptions(engine, config))
  const bloomFrom = useRef(engine.bloomFrom)
  bloomFrom.current = engine.bloomFrom
  const create = useRef((host: HTMLElement, el: HTMLElement, o: EmergeOptions): EmergeHandle =>
    attachEmerge(host, {
      ...o,
      surface: el,
      anchor: () => trigger.current,
      ready: () => positioned(host),
      bloomOrigin: () => (bloomFrom.current === 'center' ? null : trigger.current),
    }),
  ).current

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        ref={ref}
        data-slot="hover-card-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(goo ? HOVER_CARD_CONTENT_GOO : HOVER_CARD_CONTENT_SHADCN, className)}
        {...rest}
      >
        {goo ? <BloomSurface options={options} open={open} create={create} handleRef={goopRef} /> : null}
        {children}
      </HoverCardPrimitive.Content>
    </HoverCardPrimitive.Portal>
  )
})
GoopHoverCardContent.displayName = 'GoopHoverCardContent'

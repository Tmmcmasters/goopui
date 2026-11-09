'use client'
// GoopTooltip: shadcn/ui's Tooltip (Radix Tooltip, same parts, props and classes, sideOffset 0,
// arrow) drawn with the popover's emerge engine scaled down (core TOOLTIP_FEEL), like the Vue
// GoopTooltipContent. By default it blooms from its own center, spreads with a lobed edge,
// overshoots and settles, sheds a light splash (core TOOLTIP_BLOOM_SPLASH) and shrinks back to
// the center on close. `flow={false}`: the quick emerge out of a small bulb at the trigger edge.
// The arrow fades in with the content.
//
// The tooltip's shadcn background moves onto the goo (`--goop-color: var(--foreground)`).
// `surface` defaults to 'popover' (shadcn's inverted tooltip); 'trigger' or a CSS color retint
// the goo, text and arrow through core's --goop-surface / --goop-surface-foreground. With
// `goo={false}` it is exactly shadcn's TooltipContent. Reduced motion: plain open/close.
import { attachEmerge, type EmergeHandle, type EmergeOptions } from '@goopui/core'
import { cn } from 'cn'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { createContext, forwardRef, useContext, useRef, type ComponentPropsWithoutRef, type MutableRefObject, type Ref } from 'react'
import { BloomSurface, positioned, useOpenState } from '../../bloom-surface'
import { useGoopConfig } from '../../config'
import { TOOLTIP_PROP_KEYS, splitProps, toTooltipOptions, type GoopTooltipProps } from '../../goop-props'
import { useComposedRefs, useStableValue } from '../../utils'

const TOOLTIP_BODY =
  'z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm'
/** shadcn's TooltipContent (`goo={false}`). */
const TOOLTIP_CONTENT_SHADCN = `${TOOLTIP_BODY} origin-(--radix-tooltip-content-transform-origin) bg-foreground text-background data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`
/** Goo on: the goo paints the background (foreground color); no CSS enter/exit. */
const TOOLTIP_CONTENT_GOO = `${TOOLTIP_BODY} [--goop-color:var(--foreground)] text-background data-goop-tint:[--goop-color:var(--goop-surface)] data-goop-tint:text-(--goop-surface-foreground)`
const ARROW = 'z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground'
/** Goo on: the arrow follows the resolved surface color. */
const GOO_ARROW =
  'z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-(--goop-surface,var(--foreground)) fill-(--goop-surface,var(--foreground))'

// ---- provider / root -------------------------------------------------------------------------

export type GoopTooltipProviderProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>

/** shadcn's TooltipProvider (delayDuration 0). */
export function GoopTooltipProvider({ delayDuration = 0, ...props }: GoopTooltipProviderProps) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
}

interface TooltipState {
  open: boolean
  trigger: MutableRefObject<HTMLElement | null>
}
const TooltipContext = createContext<TooltipState | null>(null)
const FALLBACK: TooltipState = { open: false, trigger: { current: null } }
const useTooltipState = (): TooltipState => useContext(TooltipContext) ?? FALLBACK

export type GoopTooltipRootProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>

/** Radix Tooltip.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopTooltip({ open: openProp, defaultOpen, onOpenChange, ...props }: GoopTooltipRootProps) {
  const [open, onChange] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  return (
    <TooltipContext.Provider value={{ open, trigger }}>
      <TooltipPrimitive.Root data-slot="tooltip" open={open} onOpenChange={onChange} {...props} />
    </TooltipContext.Provider>
  )
}

// ---- trigger ---------------------------------------------------------------------------------

export type GoopTooltipTriggerProps = ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>

/** shadcn's TooltipTrigger. A `surface="trigger"` tooltip takes this element's colors. */
export const GoopTooltipTrigger = forwardRef<HTMLButtonElement, GoopTooltipTriggerProps>(function GoopTooltipTrigger(props, ref) {
  const { trigger } = useTooltipState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  return <TooltipPrimitive.Trigger ref={composed} data-slot="tooltip-trigger" {...props} />
})
GoopTooltipTrigger.displayName = 'GoopTooltipTrigger'

// ---- content ---------------------------------------------------------------------------------

export type GoopTooltipContentProps = Omit<ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>, keyof GoopTooltipProps> &
  GoopTooltipProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
  }

export const GoopTooltipContent = forwardRef<HTMLDivElement, GoopTooltipContentProps>(function GoopTooltipContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, TOOLTIP_PROP_KEYS)
  const { className, children, sideOffset = 0, goopRef, ...rest } = props
  const goo = engine.goo !== false

  const { open, trigger } = useTooltipState()
  const config = useGoopConfig()
  const options = useStableValue(toTooltipOptions(engine, config))
  const create = useRef((host: HTMLElement, el: HTMLElement, o: EmergeOptions): EmergeHandle =>
    attachEmerge(host, { ...o, surface: el, anchor: () => trigger.current, ready: () => positioned(host) }),
  ).current

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(goo ? TOOLTIP_CONTENT_GOO : TOOLTIP_CONTENT_SHADCN, className)}
        {...rest}
      >
        {goo ? (
          <>
            <BloomSurface options={options} open={open} create={create} handleRef={goopRef} hostSlot="tooltip-content" />
            {/* The label sits in an element so it fades with --goop-emerge-content (goop.css
                only reaches element children; bare text would show at once). */}
            <span data-goop="label" className="inline-flex items-center gap-[inherit]">
              {children}
            </span>
          </>
        ) : (
          children
        )}
        <TooltipPrimitive.Arrow className={goo ? GOO_ARROW : ARROW} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
})
GoopTooltipContent.displayName = 'GoopTooltipContent'

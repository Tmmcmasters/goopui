'use client'
// GoopAccordion: shadcn/ui's Accordion (Radix Accordion, same props, `className` merge) whose
// open trigger rows are flooded with goo (GoopToggle's flood: from the click point, a wobble
// once full, a few droplets; on close the goo peels off the label and drains away from it)
// while the content opens on a jelly spring. Engine props (flood, wobble, droplets, jelly,
// textFollow, speed, preset, renderer; `goo={false}` = plain shadcn) are set on GoopAccordion and
// every GoopAccordionItem follows them. In a single accordion the old row drains while the new
// one floods.
//
// GoopAccordionItem: core's `attachAccordion` (after hydration) puts the fill on the item's
// trigger row (one aria-hidden layer inside the trigger) and times the content's jelly spring
// (goop.css keyframes on Radix's --radix-accordion-content-height). Closed items look exactly
// like shadcn. SSR and first paint render plain shadcn markup. Reduced motion: the open row is
// a static fill and the content uses shadcn's plain height animation.
import { attachAccordion, type AccordionHandle } from '@goopui/core'
import { cn } from 'cn'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { forwardRef, useContext, useImperativeHandle, useMemo, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, splitProps, toAccordionOptions, type GoopAccordionProps, type GoopSoundProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { GoopAccordionContext, GoopAccordionItemOpenContext, useGoopAccordion } from './context'

const values = (v: string | string[] | undefined): string[] => (v === undefined || v === '' ? [] : Array.isArray(v) ? v : [v])

export type GoopAccordionRootProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Root> & GoopAccordionProps & GoopSoundProps

type RootDomProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>

export const GoopAccordion = forwardRef<HTMLDivElement, GoopAccordionRootProps>(function GoopAccordion(allProps, ref) {
  const [engine, props] = splitProps(allProps as GoopAccordionProps & GoopSoundProps & RootDomProps, ACCORDION_PROP_KEYS)
  const { className, sound, ...rest } = props as RootDomProps & GoopSoundProps
  const on = useGoopSound(sound)
  const options = useStableValue(toAccordionOptions(engine, useGoopConfig()))

  // Which items are open (only for the triggers' open / close sound cue): Radix's value when
  // controlled, else mirrored from onValueChange.
  const r = rest as { value?: string | string[]; defaultValue?: string | string[]; onValueChange?: (v: never) => void }
  const [inner, setInner] = useState<string[]>(() => values(r.defaultValue))
  const open = r.value !== undefined ? values(r.value) : inner
  const openKey = open.join('\u0000')
  const ctx = useMemo(() => ({ options, open }), [options, openKey])
  const onValueChange = (v: string | string[]) => {
    setInner(values(v))
    r.onValueChange?.(v as never)
  }

  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <GoopAccordionContext.Provider value={ctx}>
        <AccordionPrimitive.Root
          ref={ref}
          data-slot="accordion"
          className={cn('flex w-full flex-col', className)}
          {...(rest as RootDomProps)}
          onValueChange={onValueChange as never}
        />
      </GoopAccordionContext.Provider>
    </GoopSoundScope>
  )
})
GoopAccordion.displayName = 'GoopAccordion'

export type GoopAccordionItemProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> & {
  /** Receives the live accordion handle (null before mount / when goo is off). */
  goopRef?: Ref<AccordionHandle>
}

export const GoopAccordionItem = forwardRef<HTMLDivElement, GoopAccordionItemProps>(function GoopAccordionItem({ className, goopRef, ...props }, ref) {
  const ctx = useGoopAccordion()
  const options = ctx?.options ?? null
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachAccordion, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as AccordionHandle, [handle])
  const open = ctx?.open.includes(props.value) ?? false
  return (
    <GoopAccordionItemOpenContext.Provider value={open}>
      <AccordionPrimitive.Item
        ref={composed}
        data-slot="accordion-item"
        data-goop-accordion={options ? '' : undefined}
        className={cn('not-last:border-b', className)}
        {...props}
      />
    </GoopAccordionItemOpenContext.Provider>
  )
})
GoopAccordionItem.displayName = 'GoopAccordionItem'

const chevron = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  'data-slot': 'accordion-trigger-icon',
} as const

export const ACCORDION_TRIGGER =
  'group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground'

export type GoopAccordionTriggerProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>

/** shadcn/ui's AccordionTrigger (Header + Trigger, a down chevron and an up one when open). With
 *  goo on it is the row that floods (`data-goop-accordion-trigger`); its text follows the goo's
 *  edge (or, with `textFollow={false}`, flips once core marks it `data-goop-flooded`). */
export const GoopAccordionTrigger = forwardRef<HTMLButtonElement, GoopAccordionTriggerProps>(function GoopAccordionTrigger(
  { className, children, ...props },
  ref,
) {
  const ctx = useGoopAccordion()
  const open = useContext(GoopAccordionItemOpenContext)
  const cue = useGoopCue('accordionTrigger', { open })
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        ref={ref}
        data-slot="accordion-trigger"
        data-goop-accordion-trigger={ctx?.options ? '' : undefined}
        className={cn(ACCORDION_TRIGGER, className)}
        {...cue}
        {...props}
      >
        {children}
        <svg {...chevron} className="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden">
          <path d="m6 9 6 6 6-6" />
        </svg>
        <svg {...chevron} className="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
})
GoopAccordionTrigger.displayName = 'GoopAccordionTrigger'

export type GoopAccordionContentProps = ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>

/** shadcn/ui's AccordionContent (`className` merge on the inner div). With goo on, its height
 *  animation is goop.css's: a jelly spring on open (overshoot + settle) and a short spring on
 *  close, timed by core, instead of tw-animate's. Layout is shadcn's exactly. */
export const GoopAccordionContent = forwardRef<HTMLDivElement, GoopAccordionContentProps>(function GoopAccordionContent(
  { className, children, ...props },
  ref,
) {
  const goo = !!useGoopAccordion()?.options
  return (
    <AccordionPrimitive.Content
      ref={ref}
      data-slot="accordion-content"
      data-goop-accordion-content={goo ? '' : undefined}
      className={
        goo ? 'overflow-hidden text-sm' : 'overflow-hidden text-sm data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up'
      }
      {...props}
    >
      <div className={cn('pt-0 pb-2.5 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4', className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
})
GoopAccordionContent.displayName = 'GoopAccordionContent'

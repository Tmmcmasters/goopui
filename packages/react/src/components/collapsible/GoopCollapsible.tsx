'use client'
// GoopCollapsible: shadcn/ui's Collapsible (Radix Collapsible, same props). With goo on, core's
// `attachAccordion` (after hydration) floods the trigger (GoopCollapsibleTrigger) with goo from
// the click point while open (GoopToggle's fill; on close it drains away from the label) and
// opens the content on a jelly spring (goop.css keyframes on Radix's
// --radix-collapsible-content-height). Engine props as GoopAccordion. `goo={false}` = plain
// shadcn. SSR renders shadcn markup. Reduced motion: a static fill, a plain height animation.
import { attachAccordion, type AccordionHandle } from '@goopui/core'
import { cn } from 'cn'
import { Collapsible as CollapsiblePrimitive } from 'radix-ui'
import { forwardRef, useImperativeHandle, useMemo, useRef, useState, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, splitProps, toAccordionOptions, type GoopAccordionProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { GoopAccordionContext, useGoopAccordion, useGoopCollapsibleDefaults } from '../accordion/context'

const OPEN = [''] as const
const CLOSED = [] as const

export type GoopCollapsibleProps = Omit<ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Root>, keyof GoopAccordionProps> &
  GoopAccordionProps &
  GoopSoundProps & {
    /** Receives the live goo handle (null before mount / when goo is off). */
    goopRef?: Ref<AccordionHandle>
  }

export const GoopCollapsible = forwardRef<HTMLDivElement, GoopCollapsibleProps>(function GoopCollapsible(allProps, ref) {
  const [engine, props] = splitProps(allProps, ACCORDION_PROP_KEYS)
  const { className, sound, goopRef, open: openProp, defaultOpen, onOpenChange, ...rest } = props
  const on = useGoopSound(sound)
  // A container's defaults (GoopSidebar `submenus`) fill in `goo` and the row fill; own props win.
  const defaults = useGoopCollapsibleDefaults()
  const options = useStableValue(toAccordionOptions({ ...engine, goo: engine.goo ?? defaults?.goo }, useGoopConfig()))
  const rowFill = engine.flood !== undefined || defaults?.rowFill !== false

  // Open state (only for the trigger's open / close sound cue): Radix's when controlled, else
  // mirrored from onOpenChange.
  const [inner, setInner] = useState(defaultOpen ?? false)
  const open = openProp ?? inner
  const ctx = useMemo(() => ({ options, open: open ? OPEN : CLOSED, rowFill }), [options, open, rowFill])

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachAccordion, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as AccordionHandle, [handle])

  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <GoopAccordionContext.Provider value={ctx}>
        <CollapsiblePrimitive.Root
          ref={composed}
          data-slot="collapsible"
          data-goop-accordion={options ? '' : undefined}
          className={cn(className)}
          open={openProp}
          defaultOpen={defaultOpen}
          onOpenChange={(next) => {
            setInner(next)
            onOpenChange?.(next)
          }}
          {...rest}
        />
      </GoopAccordionContext.Provider>
    </GoopSoundScope>
  )
})
GoopCollapsible.displayName = 'GoopCollapsible'

export type GoopCollapsibleTriggerProps = ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Trigger>

/** shadcn/ui's CollapsibleTrigger (Radix, unstyled, `asChild`). With goo on it floods with goo
 *  from the click point while the collapsible is open (`data-goop-accordion-trigger`; its text
 *  follows the goo's edge). Inside GoopSidebar the row stays unfilled (the `rowFill` default). */
export const GoopCollapsibleTrigger = forwardRef<HTMLButtonElement, GoopCollapsibleTriggerProps>(function GoopCollapsibleTrigger(props, ref) {
  const ctx = useGoopAccordion()
  const cue = useGoopCue('collapsibleTrigger', { open: (ctx?.open.length ?? 0) > 0 })
  return (
    <GoopCueClaim>
      <CollapsiblePrimitive.Trigger
        ref={ref}
        data-slot="collapsible-trigger"
        data-goop-accordion-trigger={ctx?.options && ctx.rowFill !== false ? '' : undefined}
        {...cue}
        {...props}
      />
    </GoopCueClaim>
  )
})
GoopCollapsibleTrigger.displayName = 'GoopCollapsibleTrigger'

export type GoopCollapsibleContentProps = ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content>

/** shadcn/ui's CollapsibleContent (Radix, `className` passthrough). With goo on it gets
 *  goop.css's spring height animation (timed by core) and clips while it grows. */
export const GoopCollapsibleContent = forwardRef<HTMLDivElement, GoopCollapsibleContentProps>(function GoopCollapsibleContent({ className, ...props }, ref) {
  const on = !!useGoopAccordion()?.options
  return (
    <CollapsiblePrimitive.Content
      ref={ref}
      data-slot="collapsible-content"
      data-goop-accordion-content={on ? '' : undefined}
      className={cn(on && 'overflow-hidden', className)}
      {...props}
    />
  )
})
GoopCollapsibleContent.displayName = 'GoopCollapsibleContent'

import type { AccordionOptions } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** Provided by GoopAccordion / GoopCollapsible to their parts: the engine options every item
 *  uses, or null when the goo is off. */
export type GoopAccordionContext = ComputedRef<AccordionOptions | null>

const KEY: InjectionKey<GoopAccordionContext> = Symbol('goopui.accordion')

export function provideGoopAccordion(ctx: GoopAccordionContext): void {
  provide(KEY, ctx)
}
export function injectGoopAccordion(): GoopAccordionContext | null {
  return inject(KEY, null)
}

/** Defaults a container gives the GoopCollapsibles inside it (GoopSidebar's `submenus`
 *  toggle: sub-menus spring open, or plain). `rowFill: false` leaves the trigger row unfilled
 *  while open (GoopSidebar: only the active item is a pill, an open parent just turns its
 *  chevron, as in shadcn); it applies unless the collapsible sets `flood` itself. The
 *  collapsible's own props win. */
export type GoopCollapsibleDefaults = ComputedRef<{ goo?: boolean; rowFill?: boolean }>

const DEFAULTS: InjectionKey<GoopCollapsibleDefaults> = Symbol('goopui.collapsible.defaults')

export function provideGoopCollapsibleDefaults(ctx: GoopCollapsibleDefaults): void {
  provide(DEFAULTS, ctx)
}
export function injectGoopCollapsibleDefaults(): GoopCollapsibleDefaults | null {
  return inject(DEFAULTS, null)
}

/** Provided by GoopCollapsible to its trigger: whether the trigger row fills with goo while
 *  open (false: GoopCollapsibleTrigger skips `data-goop-accordion-trigger`, so core attaches
 *  no fill; the content's jelly spring still runs). */
export type GoopCollapsibleRowFill = ComputedRef<boolean>

const ROW_FILL: InjectionKey<GoopCollapsibleRowFill> = Symbol('goopui.collapsible.rowFill')

export function provideGoopCollapsibleRowFill(ctx: GoopCollapsibleRowFill): void {
  provide(ROW_FILL, ctx)
}
export function injectGoopCollapsibleRowFill(): GoopCollapsibleRowFill | null {
  return inject(ROW_FILL, null)
}

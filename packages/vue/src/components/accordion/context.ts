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
 *  toggle: sub-menus flood + jelly, or plain). The collapsible's own props win. */
export type GoopCollapsibleDefaults = ComputedRef<{ goo?: boolean }>

const DEFAULTS: InjectionKey<GoopCollapsibleDefaults> = Symbol('goopui.collapsible.defaults')

export function provideGoopCollapsibleDefaults(ctx: GoopCollapsibleDefaults): void {
  provide(DEFAULTS, ctx)
}
export function injectGoopCollapsibleDefaults(): GoopCollapsibleDefaults | null {
  return inject(DEFAULTS, null)
}

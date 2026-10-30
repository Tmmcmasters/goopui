import type { AccordionFlow, AccordionOptions } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** Provided by GoopAccordion to its items, triggers and contents. */
export interface GoopAccordionContext {
  /** Engine options every item uses, or null when the goo is off. */
  options: ComputedRef<AccordionOptions | null>
  /** Is the item with this value open (mirrors reka's model)? Reactive. */
  isOpen(value: string): boolean
  /** Items register their element so a handoff knows which way the liquid travels. */
  register(value: string, el: HTMLElement | null): void
  /** How the liquid travels for this item's latest toggle (a handoff, or 'source'). */
  flowFor(value: string, open: boolean): AccordionFlow
}

const KEY: InjectionKey<GoopAccordionContext> = Symbol('goopui.accordion')

export function provideGoopAccordion(ctx: GoopAccordionContext): void {
  provide(KEY, ctx)
}
export function injectGoopAccordion(): GoopAccordionContext | null {
  return inject(KEY, null)
}

/** Provided by GoopCollapsible to its trigger and content: is the goo on? */
const COLLAPSIBLE_KEY: InjectionKey<ComputedRef<boolean>> = Symbol('goopui.collapsible')

export function provideGoopCollapsible(goo: ComputedRef<boolean>): void {
  provide(COLLAPSIBLE_KEY, goo)
}
export function injectGoopCollapsible(): ComputedRef<boolean> | null {
  return inject(COLLAPSIBLE_KEY, null)
}

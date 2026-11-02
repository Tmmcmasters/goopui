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

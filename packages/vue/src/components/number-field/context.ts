import type { NumberFieldOptions } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey, type Ref } from 'vue'

/** What GoopNumberField tells its parts: the engine options, the master switch, the value (the
 *  content nudges on each change) and whether the goo is attached (the input then drops
 *  shadcn's focus ring: the goo ring is the indicator). */
export interface GoopNumberFieldContext {
  options: ComputedRef<NumberFieldOptions>
  goo: ComputedRef<boolean>
  value: ComputedRef<number | null | undefined>
  active: Ref<boolean>
}

const KEY: InjectionKey<GoopNumberFieldContext> = Symbol('GoopNumberField')

export const provideGoopNumberField = (ctx: GoopNumberFieldContext): void => provide(KEY, ctx)
export const injectGoopNumberField = (): GoopNumberFieldContext | null => inject(KEY, null)

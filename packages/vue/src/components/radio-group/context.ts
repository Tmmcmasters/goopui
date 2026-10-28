import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** What GoopRadioGroup tells its items: is the goo blob attached (items then drop their fill)? */
export interface GoopRadioGroupContext {
  active: ComputedRef<boolean>
}

const KEY: InjectionKey<GoopRadioGroupContext> = Symbol('GoopRadioGroup')

export const provideGoopRadioGroup = (ctx: GoopRadioGroupContext): void => provide(KEY, ctx)
export const injectGoopRadioGroup = (): GoopRadioGroupContext | null => inject(KEY, null)

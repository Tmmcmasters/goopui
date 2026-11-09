import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** Provided by GoopInputGroup: whether its goo ring is attached (the controls drop outlines). */
const GROUP: InjectionKey<ComputedRef<boolean>> = Symbol('goopui.input-group')

export const provideGoopInputGroup = (active: ComputedRef<boolean>): void => provide(GROUP, active)
export const injectGoopInputGroup = (): ComputedRef<boolean> | null => inject(GROUP, null)

import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopFieldProps } from '../../goop-props'

/** Provided by GoopField: its engine props, inherited by GoopFieldError. */
const ROOT: InjectionKey<ComputedRef<GoopFieldProps>> = Symbol('goopui.field')

export const provideGoopField = (props: ComputedRef<GoopFieldProps>): void => provide(ROOT, props)
export const injectGoopField = (): ComputedRef<GoopFieldProps> | null => inject(ROOT, null)

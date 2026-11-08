import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopEmptyProps } from '../../goop-props'

/** Provided by GoopEmpty: its engine props, inherited by GoopEmptyMedia. */
const ROOT: InjectionKey<ComputedRef<GoopEmptyProps>> = Symbol('goopui.empty')

export const provideGoopEmpty = (props: ComputedRef<GoopEmptyProps>): void => provide(ROOT, props)
export const injectGoopEmpty = (): ComputedRef<GoopEmptyProps> | null => inject(ROOT, null)

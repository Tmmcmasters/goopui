import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopItemGroupProps } from '../../goop-props'

/** Provided by GoopItemGroup: its engine props, inherited by its items (`goo`, `press`, ...). */
const GROUP: InjectionKey<ComputedRef<GoopItemGroupProps>> = Symbol('goopui.item-group')

export const provideGoopItemGroup = (props: ComputedRef<GoopItemGroupProps>): void => provide(GROUP, props)
export const injectGoopItemGroup = (): ComputedRef<GoopItemGroupProps> | null => inject(GROUP, null)

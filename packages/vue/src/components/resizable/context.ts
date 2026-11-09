import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopResizableProps } from '../../goop-props'

/** Provided by GoopResizablePanelGroup: its engine props, inherited by its handles. */
const ROOT: InjectionKey<ComputedRef<GoopResizableProps>> = Symbol('goopui.resizable')

export const provideGoopResizable = (props: ComputedRef<GoopResizableProps>): void => provide(ROOT, props)
export const injectGoopResizable = (): ComputedRef<GoopResizableProps> | null => inject(ROOT, null)

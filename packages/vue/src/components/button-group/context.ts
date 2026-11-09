import { inject, provide, type InjectionKey } from 'vue'

/** Provided by GoopButtonGroup: a getter for the group's `goo` switch. GoopButtons inside keep
 *  their own goo body (cut clean at the seams the group marks); the group's `goo: false`
 *  makes them plain unless they set `goo` themselves. */
const GROUP: InjectionKey<() => boolean> = Symbol('goopui.button-group')

export const provideGoopButtonGroup = (goo: () => boolean): void => provide(GROUP, goo)
/** The enclosing group's goo switch, or null outside a GoopButtonGroup. */
export const useGoopButtonGroup = (): (() => boolean) | null => inject(GROUP, null)

import { inject, provide, type InjectionKey } from 'vue'

/** Provided by GoopButtonGroup: GoopButtons inside leave their own goo off unless they set
 *  `goo` (the group's joined corners and borders are shadcn's; the group flexes them). */
const GROUP: InjectionKey<true> = Symbol('goopui.button-group')

export const provideGoopButtonGroup = (): void => provide(GROUP, true)
export const inGoopButtonGroup = (): boolean => inject(GROUP, false) === true

import { computed, inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** Provided by GoopScrollArea: whether its thumbs get a goo body (decided by props alone, so
 *  server and client render the same markup). */
const ROOT: InjectionKey<ComputedRef<boolean>> = Symbol('goopui.scroll-area')

export const provideGoopScrollArea = (goo: ComputedRef<boolean>): void => provide(ROOT, goo)
export const injectGoopScrollArea = (): ComputedRef<boolean> => inject(ROOT, null) ?? computed(() => false)

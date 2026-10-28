import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'

/** Provided by GoopTabsList to its triggers. */
export interface GoopTabsListContext {
  /** The goo indicator paints the active tab: triggers drop their flat active bg + shadow. */
  blob: ComputedRef<boolean>
}

const KEY: InjectionKey<GoopTabsListContext> = Symbol('goopui.tabs.list')

export function provideGoopTabsList(ctx: GoopTabsListContext): void {
  provide(KEY, ctx)
}
export function injectGoopTabsList(): GoopTabsListContext | null {
  return inject(KEY, null)
}

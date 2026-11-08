import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopMenubarProps } from '../../goop-props'

/** Provided by GoopMenubar to its triggers and menus. */
export interface GoopMenubarContext {
  /** The bar's engine props (menus inherit goo / wobble / momentum / speed / preset / renderer). */
  bar: ComputedRef<GoopMenubarProps>
  /** The goo body paints the trigger highlight: triggers drop their flat hover / open bg. */
  blob: ComputedRef<boolean>
}

const KEY: InjectionKey<GoopMenubarContext> = Symbol('goopui.menubar')

export function provideGoopMenubar(ctx: GoopMenubarContext): void {
  provide(KEY, ctx)
}
export function injectGoopMenubar(): GoopMenubarContext | null {
  return inject(KEY, null)
}

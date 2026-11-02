import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { ToggleVariants } from '../toggle/variants'

/** What GoopToggleGroup tells its items: shared variant / size / spacing, and whether the goo
 *  is attached (pressed items then drop their own background). */
export interface GoopToggleGroupContext {
  variant: ComputedRef<ToggleVariants['variant']>
  size: ComputedRef<ToggleVariants['size']>
  spacing: ComputedRef<number>
  active: ComputedRef<boolean>
}

const KEY: InjectionKey<GoopToggleGroupContext> = Symbol('GoopToggleGroup')

export const provideGoopToggleGroup = (ctx: GoopToggleGroupContext): void => provide(KEY, ctx)
export const injectGoopToggleGroup = (): GoopToggleGroupContext | null => inject(KEY, null)

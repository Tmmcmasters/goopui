import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { GoopPaginationProps } from '../../goop-props'

/** Provided by GoopPagination: its engine props, inherited by every part. */
const ROOT: InjectionKey<ComputedRef<GoopPaginationProps>> = Symbol('goopui.pagination')

/** Provided by GoopPaginationContent to its items. */
export interface GoopPaginationContentContext {
  /** The goo blob paints the current page: items drop shadcn's outline look. */
  blob: ComputedRef<boolean>
}
const CONTENT: InjectionKey<GoopPaginationContentContext> = Symbol('goopui.pagination.content')

export function provideGoopPagination(props: ComputedRef<GoopPaginationProps>): void {
  provide(ROOT, props)
}
export function injectGoopPagination(): ComputedRef<GoopPaginationProps> | null {
  return inject(ROOT, null)
}
export function provideGoopPaginationContent(ctx: GoopPaginationContentContext): void {
  provide(CONTENT, ctx)
}
export function injectGoopPaginationContent(): GoopPaginationContentContext | null {
  return inject(CONTENT, null)
}

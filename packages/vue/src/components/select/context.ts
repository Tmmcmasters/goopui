import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { SelectPlopOptions } from '@goopui/core'

/** Provided by GoopSelectContent to its items. */
export interface GoopSelectContentContext {
  /** The goo highlight blob is drawing the highlight: items drop their flat focus bg. */
  blob: ComputedRef<boolean>
  /** Plop options for a chosen item's check mark (null: plop off). */
  plop: ComputedRef<SelectPlopOptions | null>
  /** An item was chosen: play the pop, set the value now (`commit`), and hold the close until
   *  the pop has played. A consumer's `event.preventDefault()` still cancels it. */
  select(event: Event, opts: { commit: () => void; close: boolean }): void
}

const CONTENT: InjectionKey<GoopSelectContentContext> = Symbol('goopui.select.content')

export function provideGoopSelectContent(ctx: GoopSelectContentContext): void {
  provide(CONTENT, ctx)
}
export function injectGoopSelectContent(): GoopSelectContentContext | null {
  return inject(CONTENT, null)
}

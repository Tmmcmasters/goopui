import type { SelectPlopOptions } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue'

/** Provided by GoopCombobox: the element the list blooms next to (GoopComboboxAnchor). */
export interface GoopComboboxRootContext {
  anchor: ShallowRef<HTMLElement | null>
}

const ROOT: InjectionKey<GoopComboboxRootContext> = Symbol('goopui.combobox.root')

export function provideGoopComboboxRoot(ctx: GoopComboboxRootContext): void {
  provide(ROOT, ctx)
}
export function injectGoopComboboxRoot(): GoopComboboxRootContext | null {
  return inject(ROOT, null)
}

/** Provided by GoopComboboxList to its items. */
export interface GoopComboboxListContext {
  /** The goo highlight blob is drawing the highlight: items drop their flat bg. */
  blob: ComputedRef<boolean>
  /** Plop options for a chosen item's check mark (null: plop off). */
  plop: ComputedRef<SelectPlopOptions | null>
  /** An item was chosen: play the pop, set the value now (`commit`), and hold the close until
   *  the pop has played. A consumer's `event.preventDefault()` still cancels it. */
  select(event: Event, opts: { commit: () => void; close: boolean }): void
}

const LIST: InjectionKey<GoopComboboxListContext> = Symbol('goopui.combobox.list')

export function provideGoopComboboxList(ctx: GoopComboboxListContext): void {
  provide(LIST, ctx)
}
export function injectGoopComboboxList(): GoopComboboxListContext | null {
  return inject(LIST, null)
}

/** Provided by GoopComboboxItem to its indicator: true once, right after the item was chosen
 *  while the list is open (so the check mark plops in then, not on every open). */
export interface GoopComboboxItemContext {
  takeChosen(): boolean
}

const ITEM: InjectionKey<GoopComboboxItemContext> = Symbol('goopui.combobox.item')

export function provideGoopComboboxItem(ctx: GoopComboboxItemContext): void {
  provide(ITEM, ctx)
}
export function injectGoopComboboxItem(): GoopComboboxItemContext | null {
  return inject(ITEM, null)
}

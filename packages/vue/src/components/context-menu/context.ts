import type { EmergePoint } from '@goopui/core'
import { inject, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'

/** Shared by a GoopContextMenu's parts: the point the menu was last opened at (recorded by
 *  GoopContextMenuTrigger with core's `attachContextPoint`), where the panel blooms from. */
export interface GoopContextMenuContext {
  point: ShallowRef<(() => EmergePoint | null) | null>
}

const KEY: InjectionKey<GoopContextMenuContext> = Symbol('goopui.context-menu')

export function provideGoopContextMenu(): GoopContextMenuContext {
  const ctx: GoopContextMenuContext = { point: shallowRef(null) }
  provide(KEY, ctx)
  return ctx
}

export function injectGoopContextMenu(): GoopContextMenuContext | null {
  return inject(KEY, null)
}

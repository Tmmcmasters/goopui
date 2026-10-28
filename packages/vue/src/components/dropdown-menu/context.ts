import { inject, provide, shallowRef, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import type { EmergeSurfaceColors } from '@goopui/core'
import type { ResolvedMenuProps } from '../../goop-props'

/** Provided by GoopDropdownMenuContent / SubContent to their items (and nested submenus). */
export interface GoopMenuContentContext {
  /** Resolved settings of this panel (submenus inherit them). */
  menu: ComputedRef<ResolvedMenuProps>
  /** The goo highlight blob is drawing the highlight: items drop their flat focus bg. */
  blob: ComputedRef<boolean>
  /** An item was selected: play the pop, and hold the close until it has played. */
  select(event: Event): void
  /** This panel's resolved surface colors (submenus reuse them); null: popover tokens. */
  colors(): EmergeSurfaceColors | null
}

const CONTENT: InjectionKey<GoopMenuContentContext> = Symbol('goopui.menu.content')

export function provideGoopMenuContent(ctx: GoopMenuContentContext): void {
  provide(CONTENT, ctx)
}
export function injectGoopMenuContent(): GoopMenuContentContext | null {
  return inject(CONTENT, null)
}

/** Shared by a GoopDropdownMenuSub's parts: its open state and the row it emerges from. */
export interface GoopMenuSubContext {
  open: Ref<boolean>
  trigger: ShallowRef<HTMLElement | null>
}

const SUB: InjectionKey<GoopMenuSubContext> = Symbol('goopui.menu.sub')

export function provideGoopMenuSub(open: Ref<boolean>): GoopMenuSubContext {
  const ctx: GoopMenuSubContext = { open, trigger: shallowRef(null) }
  provide(SUB, ctx)
  return ctx
}
export function injectGoopMenuSub(): GoopMenuSubContext | null {
  return inject(SUB, null)
}

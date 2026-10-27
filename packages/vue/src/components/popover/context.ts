import { inject, provide, shallowRef, type InjectionKey, type ShallowRef } from 'vue'

/** Shared between GoopPopover parts: the custom anchor (GoopPopoverAnchor), if any, so the
 *  goo emerges from it instead of the trigger. */
export interface GoopPopoverContext {
  anchor: ShallowRef<HTMLElement | null>
}

const KEY: InjectionKey<GoopPopoverContext> = Symbol('goopui.popover')

export function provideGoopPopover(): GoopPopoverContext {
  const ctx: GoopPopoverContext = { anchor: shallowRef(null) }
  provide(KEY, ctx)
  return ctx
}

export function injectGoopPopover(): GoopPopoverContext | null {
  return inject(KEY, null)
}

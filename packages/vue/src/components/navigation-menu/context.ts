import { inject, provide, type ComputedRef, type InjectionKey } from 'vue'
import type { ResolvedNavigationMenuGoo } from '../../goop-props'

/** Provided by GoopNavigationMenu to its parts. */
export interface GoopNavigationMenuContext {
  /** What each part's goo does (null entries: that part is plain shadcn). */
  goo: ComputedRef<ResolvedNavigationMenuGoo>
  /** The root renders the shared viewport (shadcn's `viewport` prop, default true). */
  viewport: ComputedRef<boolean>
}

const KEY: InjectionKey<GoopNavigationMenuContext> = Symbol('goopui.navigation-menu')
const CONTENT_KEY: InjectionKey<boolean> = Symbol('goopui.navigation-menu.content')

export function provideGoopNavigationMenu(ctx: GoopNavigationMenuContext): void {
  provide(KEY, ctx)
}
export function injectGoopNavigationMenu(): GoopNavigationMenuContext | null {
  return inject(KEY, null)
}
/** Marks the parts inside a content panel (its links are panel links, not top-level items). */
export function provideGoopNavigationMenuContent(): void {
  provide(CONTENT_KEY, true)
}
export function injectInGoopNavigationMenuContent(): boolean {
  return inject(CONTENT_KEY, false)
}

import type { InputOptions, MenuHighlightHandle, MenuHighlightOptions } from '@goopui/core'
import { inject, provide, type ComputedRef, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import type { ResolvedCommandProps } from '../../goop-props'

/** shadcn-vue's command filter state: the search text and which items / groups match. */
export interface GoopCommandFilterState {
  search: string
  filtered: {
    count: number
    items: Map<string, number>
    groups: Set<string>
  }
}

/** Provided by GoopCommand to its parts. */
export interface GoopCommandContext {
  allItems: Ref<Map<string, string>>
  allGroups: Ref<Map<string, Set<string>>>
  filterState: GoopCommandFilterState
  /** True when the built-in filter is off (`ignoreFilter`): every item and group renders as
   *  given, and the parent filters and orders them itself. */
  ignoreFilter: ComputedRef<boolean>
  /** Resolved goo settings. */
  cmd: ComputedRef<ResolvedCommandProps>
  /** Core options: the highlight blob and the input ring (null when off). */
  options: ComputedRef<{ highlight: MenuHighlightOptions | null; ring: InputOptions | null }>
  /** The live highlight blob (set by GoopCommandList). */
  highlight: ShallowRef<MenuHighlightHandle | null>
}

const COMMAND: InjectionKey<GoopCommandContext> = Symbol('goopui.command')

export function provideGoopCommand(ctx: GoopCommandContext): void {
  provide(COMMAND, ctx)
}
export function injectGoopCommand(): GoopCommandContext {
  const ctx = inject(COMMAND, null)
  if (!ctx) throw new Error('GoopCommand parts must be used inside <GoopCommand>.')
  return ctx
}

/** Provided by GoopCommandGroup to its items. */
export interface GoopCommandGroupContext {
  id: string
}

const GROUP: InjectionKey<GoopCommandGroupContext> = Symbol('goopui.command.group')

export function provideGoopCommandGroup(ctx: GoopCommandGroupContext): void {
  provide(GROUP, ctx)
}
export function injectGoopCommandGroup(): GoopCommandGroupContext | null {
  return inject(GROUP, null)
}

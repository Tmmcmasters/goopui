import { Fragment, inject, isVNode, provide, type ComputedRef, type InjectionKey, type Ref, type VNode } from 'vue'
import type { GoopItemGroupProps } from '../../goop-props'

/** Provided by GoopItemGroup: its engine props, inherited by its items (`goo`, `press`, ...). */
const GROUP: InjectionKey<ComputedRef<GoopItemGroupProps>> = Symbol('goopui.item-group')

export const provideGoopItemGroup = (props: ComputedRef<GoopItemGroupProps>): void => provide(GROUP, props)
export const injectGoopItemGroup = (): ComputedRef<GoopItemGroupProps> | null => inject(GROUP, null)

// List semantics. shadcn's ItemGroup is a `role="list"` whose children aren't `listitem`s (axe
// `aria-required-children`), and an interactive item can't be one: `role="listitem"` on an <a>
// or <button> would replace its link / button role. So the group is a list only when none of
// its items is interactive, and then each item is a `listitem`. A group with a link or button
// item is a plain <div> of real links / buttons (no list role, no item roles). The group decides
// while it renders, from its slot's vnodes (an item's `as` / `as-child` props, or a bare <a> /
// <button>), so the server and the client agree (no hydration mismatch). A `role` on the group
// (or an item) wins. Separators are decorative (`role="none"`), the blob is `aria-hidden`.

/** Provided by GoopItemGroup: true while the group is a `role="list"` (set as it renders). */
const LIST: InjectionKey<Ref<boolean>> = Symbol('goopui.item-group-list')

export const provideGoopItemList = (list: Ref<boolean>): void => provide(LIST, list)
export const injectGoopItemList = (): Ref<boolean> | null => inject(LIST, null)

const INTERACTIVE_TAGS = new Set(['a', 'button'])

/** An item rendering a link / button: `as-child` (the child is usually a link or router link),
 * `as="a" | "button"`, or a component `as` (e.g. NuxtLink). */
export const isInteractiveItem = (as: unknown, asChild: unknown): boolean =>
  (asChild !== undefined && asChild !== false && asChild !== null) || (as != null && (typeof as !== 'string' || INTERACTIVE_TAGS.has(as)))

/** Whether any direct child (through fragments, e.g. `v-for`) is an interactive item. */
export const hasInteractiveItem = (nodes: unknown): boolean => {
  if (!Array.isArray(nodes)) return false
  for (const n of nodes as unknown[]) {
    if (!isVNode(n)) continue
    const v = n as VNode
    if (v.type === Fragment) {
      if (hasInteractiveItem(v.children)) return true
      continue
    }
    if (typeof v.type === 'string') {
      if (INTERACTIVE_TAGS.has(v.type)) return true
      continue
    }
    const p = v.props
    if (p && isInteractiveItem(p.as, p.asChild ?? p['as-child'])) return true
  }
  return false
}

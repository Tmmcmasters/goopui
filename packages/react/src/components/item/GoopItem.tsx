'use client'
// GoopItemGroup: shadcn/ui's ItemGroup (a `role="list"` <div>, `className` merge) whose
// interactive items' hover / keyboard-focus background is ONE goo blob (core
// `attachItemGroupHighlight` after hydration, the menu highlight engine with a calm feel and a
// pointer swell). It glides from item to item and fades out when the pointer leaves; only
// links / buttons are lit (shadcn only gives `a` items a hover fill). While it is attached the
// items drop their flat hover fill (goop.css). Items inherit `goo`, `press`, `speed` and
// `preset` from the group (their own win).
//
// GoopItem: shadcn/ui's Item (a <div>, `asChild` via Radix Slot, e.g. with an <a> or Next.js
// Link; `variant`, `size`, `className` merge). An interactive item (a link or button)
// squishes a little when pressed and settles with a small jelly bounce, like a GoopButton body
// (core `attachItemPress`; the CSS `scale` property, never past full size, so nothing shifts).
// A plain <div> item never squishes.
//
// Touch never lights an item. Reduced motion: the blob snaps, no squish. SSR renders shadcn
// markup; the goo attaches after hydration. The other parts are server-safe (./parts).
//
// List semantics. shadcn's ItemGroup is a `role="list"` whose children aren't `listitem`s (axe
// `aria-required-children`), and an interactive item can't be one: `role="listitem"` on an <a>
// or <button> would replace its link / button role. So the group is a list only when none of
// its items is interactive, and then each item is a `listitem`. A group with a link or button
// item (`asChild`, or a bare <a> / <button> child) is a plain <div> of real links / buttons (no
// list role, no item roles). The group decides while it renders, from its children's props, so
// the server and the client agree (no hydration mismatch). A `role` on the group (or an item)
// wins. Separators are decorative (`role="none"`), the blob is `aria-hidden`.
import { attachItemGroupHighlight, attachItemPress, type ItemPressHandle, type ListHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { Children, createContext, forwardRef, Fragment, isValidElement, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type ReactNode, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import {
  ITEM_GROUP_PROP_KEYS,
  ITEM_PROP_KEYS,
  resolveItemProps,
  splitProps,
  toItemGroupOptions,
  toItemPressOptions,
  type GoopItemGroupProps,
  type GoopItemProps,
} from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { ITEM_GROUP, itemVariants, type ItemSize, type ItemVariant } from './styles'

/** Provided by GoopItemGroup: its engine props, inherited by its items. */
const GroupContext = createContext<GoopItemGroupProps | null>(null)
/** Provided by GoopItemGroup: true while the group is a `role="list"` (its plain items are listitems). */
const ListContext = createContext(false)

/** Whether any direct child (through fragments and arrays) is a link / button item. */
function hasInteractiveItem(children: ReactNode): boolean {
  let found = false
  Children.forEach(children, (c) => {
    if (found || !isValidElement<{ asChild?: unknown; children?: ReactNode }>(c)) return
    if (c.type === Fragment) found = hasInteractiveItem(c.props.children)
    else if (c.type === 'a' || c.type === 'button') found = true
    else if (typeof c.type !== 'string' && c.props.asChild) found = true
  })
  return found
}

export type GoopItemGroupRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopItemGroupProps> &
  GoopItemGroupProps & {
    /** Receives the live highlight handle (null before mount / when the blob is off). */
    goopRef?: Ref<ListHighlightHandle>
  }

export const GoopItemGroup = forwardRef<HTMLDivElement, GoopItemGroupRootProps>(function GoopItemGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, ITEM_GROUP_PROP_KEYS)
  const { className, goopRef, role, ...rest } = props
  const list = role != null ? role === 'list' : !hasInteractiveItem(rest.children)
  const own = useStableValue(engine as GoopItemGroupProps)
  const options = useStableValue(toItemGroupOptions(own, useGoopConfig()))
  const blob = options !== null

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useRef<ListHighlightHandle | null>(null)

  useIsomorphicLayoutEffect(() => {
    const group = el.current
    if (!group || !options) {
      handle.current?.destroy()
      handle.current = null
      return
    }
    if (handle.current) handle.current.update(options)
    else handle.current = attachItemGroupHighlight(group, options)
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  useImperativeHandle(goopRef, () => handle.current as ListHighlightHandle)

  return (
    <GroupContext.Provider value={own}>
      <ListContext.Provider value={list}>
        <div ref={composed} role={role ?? (list ? 'list' : undefined)} data-slot="item-group" data-goop-item-group={blob ? '' : undefined} className={cn(ITEM_GROUP, className)} {...rest} />
      </ListContext.Provider>
    </GroupContext.Provider>
  )
})
GoopItemGroup.displayName = 'GoopItemGroup'

export type GoopItemRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopItemProps> &
  GoopItemProps & {
    variant?: ItemVariant | null
    size?: ItemSize | null
    /** Render the single child instead (e.g. an <a> or your router's Link), merging classes and props onto it (Radix Slot). */
    asChild?: boolean
    /** Receives the live press handle (null before mount / when the squish is off). */
    goopRef?: Ref<ItemPressHandle>
  }

export const GoopItem = forwardRef<HTMLDivElement, GoopItemRootProps>(function GoopItem(allProps, ref) {
  const [engine, props] = splitProps(allProps, ITEM_PROP_KEYS)
  const { className, variant = 'default', size = 'default', asChild = false, goopRef, ...rest } = props
  const group = useContext(GroupContext)
  // In a list group a plain item is a listitem; an `asChild` (link / button) item keeps its role.
  const list = useContext(ListContext)
  const options = useStableValue(toItemPressOptions(resolveItemProps(engine, group), useGoopConfig()))

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachItemPress, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as ItemPressHandle, [handle])

  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      ref={composed}
      role={list && !asChild ? 'listitem' : undefined}
      data-slot="item"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      className={cn(itemVariants({ variant, size }), className)}
      {...rest}
    />
  )
})
GoopItem.displayName = 'GoopItem'

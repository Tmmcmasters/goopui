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
import { attachItemGroupHighlight, attachItemPress, type ItemPressHandle, type ListHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
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

export type GoopItemGroupRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopItemGroupProps> &
  GoopItemGroupProps & {
    /** Receives the live highlight handle (null before mount / when the blob is off). */
    goopRef?: Ref<ListHighlightHandle>
  }

export const GoopItemGroup = forwardRef<HTMLDivElement, GoopItemGroupRootProps>(function GoopItemGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, ITEM_GROUP_PROP_KEYS)
  const { className, goopRef, ...rest } = props
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
      <div ref={composed} role="list" data-slot="item-group" data-goop-item-group={blob ? '' : undefined} className={cn(ITEM_GROUP, className)} {...rest} />
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
  const options = useStableValue(toItemPressOptions(resolveItemProps(engine, group), useGoopConfig()))

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachItemPress, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as ItemPressHandle, [handle])

  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      ref={composed}
      data-slot="item"
      data-variant={variant ?? 'default'}
      data-size={size ?? 'default'}
      className={cn(itemVariants({ variant, size }), className)}
      {...rest}
    />
  )
})
GoopItem.displayName = 'GoopItem'

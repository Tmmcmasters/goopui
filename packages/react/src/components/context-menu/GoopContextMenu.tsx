'use client'
// GoopContextMenu: shadcn/ui's ContextMenu (Radix ContextMenu, same parts and props) with
// GoopDropdownMenu's goo: an emerge panel and a goo highlight blob that glides between items,
// trails a low mound under the pointer, follows keyboard focus and squishes on select. A
// context menu has no trigger box, so the panel blooms detached (core `detached`) out of the
// right-click / long-press point (`bloomFrom: 'pointer'`, recorded by GoopContextMenuTrigger
// with core's `attachContextPoint`): the puddle grows from the spot you clicked, spreads,
// overshoots, splashes all around and shrinks back to that spot on close.
// `bloomFrom="center"`: from the panel's center. Surface defaults to 'popover'. Submenus bloom
// out of their parent item.
//
// Goo layout as in GoopDropdownMenuContent (surface + scroller + item list). With
// `goo={false}` it is exactly shadcn's ContextMenu. Reduced motion: plain open/close, the
// blob snaps, no pop. Same as the Vue GoopContextMenu.
import { attachContextPoint, contextMenuBloomOrigin, type EmergeHandle, type EmergePoint, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  useRef,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import {
  CONTEXT_MENU_PROP_KEYS,
  resolveContextMenuProps,
  splitProps,
  toContextMenuOptions,
  type GoopContextMenuProps,
  type GoopSoundProps,
  type ResolvedContextMenuProps,
} from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import {
  CheckIcon,
  ChevronRightIcon,
  MENU_LIST,
  MENU_SCROLL,
  MENU_SUB_SCROLL,
  MenuContentContext,
  MenuList,
  MenuSubContext,
  MenuSurface,
  subMenu,
  useInheritedColors,
  useMenuContent,
  useMenuGoo,
  quietFocus,
  useMenuSelect,
  useMenuSub,
  useOpenState,
  type MenuContentState,
} from '../dropdown-menu/menu-goo'
import {
  CONTEXT_MENU_CHOICE,
  CONTEXT_MENU_CHOICE_FLAT,
  CONTEXT_MENU_CONTENT_GOO,
  CONTEXT_MENU_CONTENT_SHADCN,
  CONTEXT_MENU_INDICATOR,
  CONTEXT_MENU_ITEM,
  CONTEXT_MENU_ITEM_FLAT,
  CONTEXT_MENU_LABEL,
  CONTEXT_MENU_SEPARATOR,
  CONTEXT_MENU_SHORTCUT,
  CONTEXT_MENU_SUB_CONTENT_GOO,
  CONTEXT_MENU_SUB_CONTENT_SHADCN,
  CONTEXT_MENU_SUB_TRIGGER,
  CONTEXT_MENU_SUB_TRIGGER_FLAT,
  CONTEXT_MENU_TRIGGER,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

interface ContextState {
  open: boolean
  setOpen: (open: boolean) => void
  /** The trigger area (for `surface="trigger"`). */
  trigger: MutableRefObject<HTMLElement | null>
  /** The last right-click / long-press point (core `attachContextPoint`). */
  point: MutableRefObject<(() => EmergePoint | null) | null>
}
const ContextMenuContext = createContext<ContextState | null>(null)

export type GoopContextMenuRootProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root> & GoopSoundProps

/** Radix ContextMenu.Root. Tracks `open` and shares the open point with the content. */
export function GoopContextMenu({ open: openProp, onOpenChange, sound, ...props }: GoopContextMenuRootProps) {
  const [open, setOpen] = useOpenState(openProp, false, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const point = useRef<(() => EmergePoint | null) | null>(null)
  const state = useMemo(() => ({ open, setOpen, trigger, point }), [open, setOpen])
  useGoopSound(sound)
  return (
    <ContextMenuContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <ContextMenuPrimitive.Root data-slot="context-menu" open={open} onOpenChange={setOpen} {...props} />
      </GoopSoundScope>
    </ContextMenuContext.Provider>
  )
}

const FALLBACK: ContextState = { open: false, setOpen: () => {}, trigger: { current: null }, point: { current: null } }
const useContextMenu = (): ContextState => useContext(ContextMenuContext) ?? FALLBACK

// ---- trigger / portal / group ------------------------------------------------------------------

export type GoopContextMenuTriggerProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>

/** shadcn's ContextMenuTrigger. Records where the menu is opened (right-click, long-press) so
 *  the panel blooms out of that point. */
export const GoopContextMenuTrigger = forwardRef<HTMLSpanElement, GoopContextMenuTriggerProps>(function GoopContextMenuTrigger({ className, ...props }, ref) {
  const ctx = useContextMenu()
  const el = useRef<HTMLSpanElement | null>(null)
  const composed = useComposedRefs<HTMLSpanElement>(ref, el, ctx.trigger as MutableRefObject<HTMLSpanElement | null>)
  useIsomorphicLayoutEffect(() => {
    const tracker = attachContextPoint(el.current)
    ctx.point.current = tracker.point
    return () => {
      tracker.destroy()
      ctx.point.current = null
    }
  }, [ctx.point])
  return <ContextMenuPrimitive.Trigger ref={composed} data-slot="context-menu-trigger" className={cn(CONTEXT_MENU_TRIGGER, className)} {...props} />
})
GoopContextMenuTrigger.displayName = 'GoopContextMenuTrigger'

export type GoopContextMenuPortalProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Portal>

export function GoopContextMenuPortal(props: GoopContextMenuPortalProps) {
  return <ContextMenuPrimitive.Portal data-slot="context-menu-portal" {...props} />
}

export type GoopContextMenuGroupProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>

export const GoopContextMenuGroup = forwardRef<HTMLDivElement, GoopContextMenuGroupProps>(function GoopContextMenuGroup(props, ref) {
  return <ContextMenuPrimitive.Group ref={ref} data-slot="context-menu-group" {...props} />
})
GoopContextMenuGroup.displayName = 'GoopContextMenuGroup'

// ---- content --------------------------------------------------------------------------------

export type GoopContextMenuContentProps = Omit<ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>, keyof GoopContextMenuProps> &
  GoopContextMenuProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
    /** Receives the live highlight handle (null when goo or highlight is off). */
    highlightRef?: Ref<MenuHighlightHandle>
  }

export const GoopContextMenuContent = forwardRef<HTMLDivElement, GoopContextMenuContentProps>(function GoopContextMenuContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, CONTEXT_MENU_PROP_KEYS)
  const { className, children, goopRef, highlightRef, ...rest } = props
  const root = useContextMenu()
  const config = useGoopConfig()
  const menu = useStableValue(resolveContextMenuProps(engine))
  const options = useStableValue(toContextMenuOptions(menu, config))
  const emerge = useMemo(() => ({ ...options.emerge, detached: true }), [options.emerge])
  const goo = useMenuGoo({
    open: root.open,
    // Only read for `surface="trigger"` (the panel is detached: no trigger box to emerge from).
    anchor: () => root.trigger.current,
    emerge,
    highlight: options.highlight,
    close: () => root.setOpen(false),
    origin: () => contextMenuBloomOrigin(menu.bloomFrom, root.point.current?.() ?? null),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        data-slot="context-menu-content"
        className={cn(menu.goo ? CONTEXT_MENU_CONTENT_GOO : CONTEXT_MENU_CONTENT_SHADCN, className)}
        {...rest}
      >
        <MenuContentContext.Provider value={ctx}>
          {menu.goo ? (
            <>
              <MenuSurface goo={goo} />
              <div data-slot="context-menu-scroll" className={MENU_SCROLL}>
                <MenuList goo={goo} slot="context-menu-list" className={MENU_LIST}>
                  {children}
                </MenuList>
              </div>
            </>
          ) : (
            children
          )}
        </MenuContentContext.Provider>
      </ContextMenuPrimitive.Content>
    </ContextMenuPrimitive.Portal>
  )
})
GoopContextMenuContent.displayName = 'GoopContextMenuContent'

// ---- items ----------------------------------------------------------------------------------

export type GoopContextMenuItemProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}

/** shadcn's ContextMenuItem (`inset`, `variant="destructive"`). In a goo menu the highlight is
 *  the blob and selecting plays its pop before the menu closes (`preventDefault()` keeps it open). */
export const GoopContextMenuItem = forwardRef<HTMLDivElement, GoopContextMenuItemProps>(function GoopContextMenuItem(
  { className, inset, variant = 'default', onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuItem')
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      data-slot="context-menu-item"
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(sel.blob ? '' : CONTEXT_MENU_ITEM_FLAT, CONTEXT_MENU_ITEM, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    />
  )
})
GoopContextMenuItem.displayName = 'GoopContextMenuItem'

export type GoopContextMenuCheckboxItemProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem> & { inset?: boolean }

export const GoopContextMenuCheckboxItem = forwardRef<HTMLDivElement, GoopContextMenuCheckboxItemProps>(function GoopContextMenuCheckboxItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuCheckboxItem')
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="context-menu-checkbox-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : CONTEXT_MENU_CHOICE_FLAT, CONTEXT_MENU_CHOICE, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={CONTEXT_MENU_INDICATOR} data-slot="context-menu-checkbox-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  )
})
GoopContextMenuCheckboxItem.displayName = 'GoopContextMenuCheckboxItem'

export type GoopContextMenuRadioGroupProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioGroup>

export const GoopContextMenuRadioGroup = forwardRef<HTMLDivElement, GoopContextMenuRadioGroupProps>(function GoopContextMenuRadioGroup(props, ref) {
  return <ContextMenuPrimitive.RadioGroup ref={ref} data-slot="context-menu-radio-group" {...props} />
})
GoopContextMenuRadioGroup.displayName = 'GoopContextMenuRadioGroup'

export type GoopContextMenuRadioItemProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem> & { inset?: boolean }

export const GoopContextMenuRadioItem = forwardRef<HTMLDivElement, GoopContextMenuRadioItemProps>(function GoopContextMenuRadioItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuRadioItem')
  return (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      data-slot="context-menu-radio-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : CONTEXT_MENU_CHOICE_FLAT, CONTEXT_MENU_CHOICE, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={CONTEXT_MENU_INDICATOR} data-slot="context-menu-radio-item-indicator">
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  )
})
GoopContextMenuRadioItem.displayName = 'GoopContextMenuRadioItem'

// ---- text parts -----------------------------------------------------------------------------

export type GoopContextMenuLabelProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & { inset?: boolean }

export const GoopContextMenuLabel = forwardRef<HTMLDivElement, GoopContextMenuLabelProps>(function GoopContextMenuLabel({ className, inset, ...props }, ref) {
  return <ContextMenuPrimitive.Label ref={ref} data-slot="context-menu-label" data-inset={inset ? '' : undefined} className={cn(CONTEXT_MENU_LABEL, className)} {...props} />
})
GoopContextMenuLabel.displayName = 'GoopContextMenuLabel'

export type GoopContextMenuSeparatorProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>

export const GoopContextMenuSeparator = forwardRef<HTMLDivElement, GoopContextMenuSeparatorProps>(function GoopContextMenuSeparator({ className, ...props }, ref) {
  return <ContextMenuPrimitive.Separator ref={ref} data-slot="context-menu-separator" className={cn(CONTEXT_MENU_SEPARATOR, className)} {...props} />
})
GoopContextMenuSeparator.displayName = 'GoopContextMenuSeparator'

export function GoopContextMenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="context-menu-shortcut" className={cn(CONTEXT_MENU_SHORTCUT, className)} {...props} />
}

// ---- submenus -------------------------------------------------------------------------------

export type GoopContextMenuSubProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub>

/** Radix ContextMenu.Sub. Tracks the open state for its SubContent's goo. */
export function GoopContextMenuSub({ open: openProp, defaultOpen, onOpenChange, ...props }: GoopContextMenuSubProps) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ open, trigger }), [open])
  return (
    <MenuSubContext.Provider value={state}>
      <ContextMenuPrimitive.Sub data-slot="context-menu-sub" open={open} onOpenChange={setOpen} {...props} />
    </MenuSubContext.Provider>
  )
}

export type GoopContextMenuSubTriggerProps = ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }

export const GoopContextMenuSubTrigger = forwardRef<HTMLDivElement, GoopContextMenuSubTriggerProps>(function GoopContextMenuSubTrigger(
  { className, inset, children, ...props },
  ref,
) {
  const menu = useMenuContent()
  const sub = useMenuSub()
  const composed = useComposedRefs<HTMLDivElement>(ref, sub?.trigger as MutableRefObject<HTMLDivElement | null> | undefined)
  const cue = useGoopCue('menuSubTrigger')
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={composed}
      data-slot="context-menu-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(menu?.blob ? '' : CONTEXT_MENU_SUB_TRIGGER_FLAT, CONTEXT_MENU_SUB_TRIGGER, className)}
      {...cue}
      {...props}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      {children}
      <ChevronRightIcon />
    </ContextMenuPrimitive.SubTrigger>
  )
})
GoopContextMenuSubTrigger.displayName = 'GoopContextMenuSubTrigger'

export type GoopContextMenuSubContentProps = Omit<ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>, keyof GoopContextMenuProps> &
  GoopContextMenuProps & {
    goopRef?: Ref<EmergeHandle>
    highlightRef?: Ref<MenuHighlightHandle>
  }

/** shadcn's ContextMenuSubContent. Blooms out of its row (core clamps the row's center onto
 *  the submenu's near edge) and shrinks back into it, with its own blob. Engine props left
 *  unset inherit from the parent menu. `bloomFrom="center"`: from its center. */
export const GoopContextMenuSubContent = forwardRef<HTMLDivElement, GoopContextMenuSubContentProps>(function GoopContextMenuSubContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, CONTEXT_MENU_PROP_KEYS)
  const { className, children, goopRef, highlightRef, ...rest } = props
  const root = useContextMenu()
  const parent = useMenuContent()
  const sub = useMenuSub()
  const config = useGoopConfig()
  const inherited = parent?.menu as ResolvedContextMenuProps | undefined
  const menu = useStableValue(subMenu(resolveContextMenuProps(engine, inherited), engine.goo, inherited?.submenus))
  const options = useStableValue(toContextMenuOptions(menu, config))
  const emerge = useInheritedColors(options.emerge, engine.surface === undefined ? parent : null)
  const goo = useMenuGoo({
    open: sub?.open ?? true,
    anchor: () => sub?.trigger.current,
    emerge,
    highlight: options.highlight,
    close: () => root.setOpen(false),
    origin: () => (menu.bloomFrom === 'center' ? null : sub?.trigger.current),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      data-slot="context-menu-sub-content"
      className={cn(menu.goo ? CONTEXT_MENU_SUB_CONTENT_GOO : CONTEXT_MENU_SUB_CONTENT_SHADCN, className)}
      {...rest}
    >
      <MenuContentContext.Provider value={ctx}>
        {menu.goo ? (
          <>
            <MenuSurface goo={goo} />
            <div data-slot="context-menu-scroll" className={MENU_SUB_SCROLL}>
              <MenuList goo={goo} slot="context-menu-list" className={MENU_LIST}>
                {children}
              </MenuList>
            </div>
          </>
        ) : (
          children
        )}
      </MenuContentContext.Provider>
    </ContextMenuPrimitive.SubContent>
  )
})
GoopContextMenuSubContent.displayName = 'GoopContextMenuSubContent'

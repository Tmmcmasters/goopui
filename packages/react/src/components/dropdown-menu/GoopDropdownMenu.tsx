'use client'
// GoopDropdownMenu: shadcn/ui's DropdownMenu (Radix DropdownMenu, same parts and props) with
// the Vue GoopDropdownMenu's goo:
//   - the panel blooms (core `attachEmerge`, flowStyle 'bloom'): it pools from its own center,
//     spreads with a lobed edge, overshoots and splashes all around (drops kept off the
//     trigger); close pulls in, wobbles and shrinks back to the center;
//   - the item highlight is a goo blob (core `attachMenuHighlight`) that glides between items,
//     trails a low mound under the pointer (`followPointer`), follows keyboard focus and
//     squishes when an item is selected (the menu closes once the pop has played);
//   - submenus bloom out of their row with their own blob.
//
// Goo layout (as in Vue): the panel (Radix content) holds the aria-hidden emerge surface and a
// scroller (shadcn's max-height and overflow move onto it) around the item list (shadcn's
// padding; it holds the highlight and clips its goo), so the background never scrolls away and
// the blob never adds scroll overflow. With `goo={false}` every part is exactly shadcn's.
// Reduced motion: plain open/close, the blob snaps, no pop.
import type { EmergeHandle, MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
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
import { MENU_PROP_KEYS, resolveMenuProps, splitProps, toMenuOptions, type GoopMenuProps, type GoopSoundProps } from '../../goop-props'
import { GoopCueClaim, GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useStableValue } from '../../utils'
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
  useMenuContent,
  subMenu,
  useInheritedColors,
  useMenuGoo,
  quietFocus,
  useMenuSelect,
  useMenuSub,
  useOpenState,
  type MenuContentState,
} from './menu-goo'
import {
  DROPDOWN_MENU_CHOICE,
  DROPDOWN_MENU_CHOICE_FLAT,
  DROPDOWN_MENU_CONTENT_GOO,
  DROPDOWN_MENU_CONTENT_SHADCN,
  DROPDOWN_MENU_INDICATOR,
  DROPDOWN_MENU_ITEM,
  DROPDOWN_MENU_ITEM_FLAT,
  DROPDOWN_MENU_LABEL,
  DROPDOWN_MENU_SEPARATOR,
  DROPDOWN_MENU_SHORTCUT,
  DROPDOWN_MENU_SUB_CONTENT_GOO,
  DROPDOWN_MENU_SUB_CONTENT_SHADCN,
  DROPDOWN_MENU_SUB_TRIGGER,
  DROPDOWN_MENU_SUB_TRIGGER_FLAT,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

interface DropdownState {
  open: boolean
  setOpen: (open: boolean) => void
  /** The trigger element (the neck / `surface="trigger"` reads it). */
  trigger: MutableRefObject<HTMLElement | null>
}
const DropdownContext = createContext<DropdownState | null>(null)

export type GoopDropdownMenuProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root> & GoopSoundProps

/** Radix DropdownMenu.Root. Tracks `open` (controlled or not) so the goo can play open / close. */
export function GoopDropdownMenu({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopDropdownMenuProps) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ open, setOpen, trigger }), [open, setOpen])
  useGoopSound(sound)
  return (
    <DropdownContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <DropdownMenuPrimitive.Root data-slot="dropdown-menu" open={open} onOpenChange={setOpen} {...props} />
      </GoopSoundScope>
    </DropdownContext.Provider>
  )
}

const FALLBACK: DropdownState = { open: false, setOpen: () => {}, trigger: { current: null } }
const useDropdown = (): DropdownState => useContext(DropdownContext) ?? FALLBACK

// ---- trigger / portal / group ------------------------------------------------------------------

export type GoopDropdownMenuTriggerProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>

/** shadcn's DropdownMenuTrigger. The panel blooms below it. */
export const GoopDropdownMenuTrigger = forwardRef<HTMLButtonElement, GoopDropdownMenuTriggerProps>(function GoopDropdownMenuTrigger(props, ref) {
  const { trigger } = useDropdown()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('menuTrigger')
  return (
    <GoopCueClaim>
      <DropdownMenuPrimitive.Trigger ref={composed} data-slot="dropdown-menu-trigger" {...cue} {...props} />
    </GoopCueClaim>
  )
})
GoopDropdownMenuTrigger.displayName = 'GoopDropdownMenuTrigger'

export type GoopDropdownMenuPortalProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Portal>

export function GoopDropdownMenuPortal(props: GoopDropdownMenuPortalProps) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
}

export type GoopDropdownMenuGroupProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>

export const GoopDropdownMenuGroup = forwardRef<HTMLDivElement, GoopDropdownMenuGroupProps>(function GoopDropdownMenuGroup(props, ref) {
  return <DropdownMenuPrimitive.Group ref={ref} data-slot="dropdown-menu-group" {...props} />
})
GoopDropdownMenuGroup.displayName = 'GoopDropdownMenuGroup'

// ---- content --------------------------------------------------------------------------------

export type GoopDropdownMenuContentProps = Omit<ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>, keyof GoopMenuProps> &
  GoopMenuProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
    /** Receives the live highlight handle (null when goo or highlight is off). */
    highlightRef?: Ref<MenuHighlightHandle>
  }

export const GoopDropdownMenuContent = forwardRef<HTMLDivElement, GoopDropdownMenuContentProps>(function GoopDropdownMenuContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, MENU_PROP_KEYS)
  const { className, children, align = 'start', sideOffset = 4, goopRef, highlightRef, ...rest } = props
  const root = useDropdown()
  const config = useGoopConfig()
  const menu = useStableValue(resolveMenuProps(engine))
  const options = useStableValue(toMenuOptions(menu, config))
  const goo = useMenuGoo({
    open: root.open,
    anchor: () => root.trigger.current,
    emerge: options.emerge,
    highlight: options.highlight,
    close: () => root.setOpen(false),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        data-slot="dropdown-menu-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(menu.goo ? DROPDOWN_MENU_CONTENT_GOO : DROPDOWN_MENU_CONTENT_SHADCN, className)}
        {...rest}
      >
        <MenuContentContext.Provider value={ctx}>
          {menu.goo ? (
            <>
              <MenuSurface goo={goo} />
              <div data-slot="dropdown-menu-scroll" className={MENU_SCROLL}>
                <MenuList goo={goo} slot="dropdown-menu-list" className={MENU_LIST}>
                  {children}
                </MenuList>
              </div>
            </>
          ) : (
            children
          )}
        </MenuContentContext.Provider>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
})
GoopDropdownMenuContent.displayName = 'GoopDropdownMenuContent'

// ---- items ----------------------------------------------------------------------------------

export type GoopDropdownMenuItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}

/** shadcn's DropdownMenuItem (`inset`, `variant="destructive"`). Inside a goo menu the
 *  highlight is the goo blob (the flat focus bg is dropped), and selecting plays its pop
 *  before the menu closes (`event.preventDefault()` in your onSelect keeps it open). */
export const GoopDropdownMenuItem = forwardRef<HTMLDivElement, GoopDropdownMenuItemProps>(function GoopDropdownMenuItem(
  { className, inset, variant = 'default', onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuItem')
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-slot="dropdown-menu-item"
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(sel.blob ? '' : DROPDOWN_MENU_ITEM_FLAT, DROPDOWN_MENU_ITEM, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    />
  )
})
GoopDropdownMenuItem.displayName = 'GoopDropdownMenuItem'

export type GoopDropdownMenuCheckboxItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem> & { inset?: boolean }

/** shadcn's DropdownMenuCheckboxItem. In a goo menu, toggling pops the blob before the menu closes. */
export const GoopDropdownMenuCheckboxItem = forwardRef<HTMLDivElement, GoopDropdownMenuCheckboxItemProps>(function GoopDropdownMenuCheckboxItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuCheckboxItem')
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : DROPDOWN_MENU_CHOICE_FLAT, DROPDOWN_MENU_CHOICE, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={DROPDOWN_MENU_INDICATOR} data-slot="dropdown-menu-checkbox-item-indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  )
})
GoopDropdownMenuCheckboxItem.displayName = 'GoopDropdownMenuCheckboxItem'

export type GoopDropdownMenuRadioGroupProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>

export const GoopDropdownMenuRadioGroup = forwardRef<HTMLDivElement, GoopDropdownMenuRadioGroupProps>(function GoopDropdownMenuRadioGroup(props, ref) {
  return <DropdownMenuPrimitive.RadioGroup ref={ref} data-slot="dropdown-menu-radio-group" {...props} />
})
GoopDropdownMenuRadioGroup.displayName = 'GoopDropdownMenuRadioGroup'

export type GoopDropdownMenuRadioItemProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & { inset?: boolean }

/** shadcn's DropdownMenuRadioItem. In a goo menu, choosing pops the blob before the menu closes. */
export const GoopDropdownMenuRadioItem = forwardRef<HTMLDivElement, GoopDropdownMenuRadioItemProps>(function GoopDropdownMenuRadioItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuRadioItem')
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      data-slot="dropdown-menu-radio-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : DROPDOWN_MENU_CHOICE_FLAT, DROPDOWN_MENU_CHOICE, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={DROPDOWN_MENU_INDICATOR} data-slot="dropdown-menu-radio-item-indicator">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  )
})
GoopDropdownMenuRadioItem.displayName = 'GoopDropdownMenuRadioItem'

// ---- text parts -----------------------------------------------------------------------------

export type GoopDropdownMenuLabelProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }

export const GoopDropdownMenuLabel = forwardRef<HTMLDivElement, GoopDropdownMenuLabelProps>(function GoopDropdownMenuLabel({ className, inset, ...props }, ref) {
  return <DropdownMenuPrimitive.Label ref={ref} data-slot="dropdown-menu-label" data-inset={inset ? '' : undefined} className={cn(DROPDOWN_MENU_LABEL, className)} {...props} />
})
GoopDropdownMenuLabel.displayName = 'GoopDropdownMenuLabel'

export type GoopDropdownMenuSeparatorProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>

export const GoopDropdownMenuSeparator = forwardRef<HTMLDivElement, GoopDropdownMenuSeparatorProps>(function GoopDropdownMenuSeparator({ className, ...props }, ref) {
  return <DropdownMenuPrimitive.Separator ref={ref} data-slot="dropdown-menu-separator" className={cn(DROPDOWN_MENU_SEPARATOR, className)} {...props} />
})
GoopDropdownMenuSeparator.displayName = 'GoopDropdownMenuSeparator'

export function GoopDropdownMenuShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="dropdown-menu-shortcut" className={cn(DROPDOWN_MENU_SHORTCUT, className)} {...props} />
}

// ---- submenus -------------------------------------------------------------------------------

export type GoopDropdownMenuSubProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub>

/** Radix DropdownMenu.Sub. Tracks the open state for its SubContent's goo. */
export function GoopDropdownMenuSub({ open: openProp, defaultOpen, onOpenChange, ...props }: GoopDropdownMenuSubProps) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ open, trigger }), [open])
  return (
    <MenuSubContext.Provider value={state}>
      <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" open={open} onOpenChange={setOpen} {...props} />
    </MenuSubContext.Provider>
  )
}

export type GoopDropdownMenuSubTriggerProps = ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }

/** shadcn's DropdownMenuSubTrigger. Its submenu blooms from this row; the blob stays on it
 *  while the submenu is open. */
export const GoopDropdownMenuSubTrigger = forwardRef<HTMLDivElement, GoopDropdownMenuSubTriggerProps>(function GoopDropdownMenuSubTrigger(
  { className, inset, children, ...props },
  ref,
) {
  const menu = useMenuContent()
  const sub = useMenuSub()
  const composed = useComposedRefs<HTMLDivElement>(ref, sub?.trigger as MutableRefObject<HTMLDivElement | null> | undefined)
  const cue = useGoopCue('menuSubTrigger')
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={composed}
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(menu?.blob ? '' : DROPDOWN_MENU_SUB_TRIGGER_FLAT, DROPDOWN_MENU_SUB_TRIGGER, className)}
      {...cue}
      {...props}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      {children}
      <ChevronRightIcon />
    </DropdownMenuPrimitive.SubTrigger>
  )
})
GoopDropdownMenuSubTrigger.displayName = 'GoopDropdownMenuSubTrigger'

export type GoopDropdownMenuSubContentProps = Omit<ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>, keyof GoopMenuProps> &
  GoopMenuProps & {
    goopRef?: Ref<EmergeHandle>
    highlightRef?: Ref<MenuHighlightHandle>
  }

/** shadcn's DropdownMenuSubContent. Blooms out of its row with its own goo blob. Engine props
 *  left unset inherit from the parent menu; the parent's `submenus={false}` (or `goo={false}`)
 *  makes it a plain shadcn submenu. */
export const GoopDropdownMenuSubContent = forwardRef<HTMLDivElement, GoopDropdownMenuSubContentProps>(function GoopDropdownMenuSubContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, MENU_PROP_KEYS)
  const { className, children, goopRef, highlightRef, ...rest } = props
  const root = useDropdown()
  const parent = useMenuContent()
  const sub = useMenuSub()
  const config = useGoopConfig()
  const menu = useStableValue(subMenu(resolveMenuProps(engine, parent?.menu), engine.goo, parent?.menu.submenus))
  const options = useStableValue(toMenuOptions(menu, config))
  const emerge = useInheritedColors(options.emerge, engine.surface === undefined ? parent : null)
  const goo = useMenuGoo({
    open: sub?.open ?? true,
    anchor: () => sub?.trigger.current,
    emerge,
    highlight: options.highlight,
    close: () => root.setOpen(false),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      data-slot="dropdown-menu-sub-content"
      className={cn(menu.goo ? DROPDOWN_MENU_SUB_CONTENT_GOO : DROPDOWN_MENU_SUB_CONTENT_SHADCN, className)}
      {...rest}
    >
      <MenuContentContext.Provider value={ctx}>
        {menu.goo ? (
          <>
            <MenuSurface goo={goo} />
            <div data-slot="dropdown-menu-scroll" className={MENU_SUB_SCROLL}>
              <MenuList goo={goo} slot="dropdown-menu-list" className={MENU_LIST}>
                {children}
              </MenuList>
            </div>
          </>
        ) : (
          children
        )}
      </MenuContentContext.Provider>
    </DropdownMenuPrimitive.SubContent>
  )
})
GoopDropdownMenuSubContent.displayName = 'GoopDropdownMenuSubContent'

'use client'
// GoopMenubar: shadcn/ui's Menubar (Radix Menubar, same parts and props) with the Vue
// GoopMenubar's goo:
//   - the bar's trigger highlight is ONE goo body (core `attachMenubarHighlight`, the menu
//     highlight engine fed the tabs feel). It sits on the trigger you hover or arrow to, flows
//     to the next one with momentum (stretching, with fat neck lumps, landing with a jelly
//     overshoot), and stays on the open trigger while its menu is open. aria-hidden, behind the
//     real triggers. Toggles: `highlight`, `wobble`, `momentum`.
//   - each menu is GoopDropdownMenuContent's goo: it blooms open (pools from its center,
//     spreads with a lobed edge, overshoots and splashes, drops kept off the bar), and its item
//     highlight is a goo blob that glides between items, trails a low mound under the pointer
//     and squishes when an item is selected. Menu props left unset inherit the bar's `goo`,
//     `wobble`, `momentum`, `speed`, `preset` and `renderer`. Surface defaults to 'popover'.
// `goo={false}` is plain shadcn. Reduced motion: the body and blob snap, plain open/close.
// Browser-only: SSR renders shadcn markup, and goop.css paints the hovered / open trigger
// until the body attaches.
import { attachMenubarHighlight, type EmergeHandle, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { Menubar as MenubarPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type HTMLAttributes,
  type MutableRefObject,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import {
  MENUBAR_MENU_PROP_KEYS,
  MENUBAR_PROP_KEYS,
  resolveMenubarMenuProps,
  splitProps,
  toMenubarMenuOptions,
  toMenubarOptions,
  type GoopMenubarMenuEngineProps,
  type GoopMenubarProps,
  type GoopSoundProps,
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
  MENUBAR,
  MENUBAR_CHECKBOX_ITEM,
  MENUBAR_CHOICE_FLAT,
  MENUBAR_CONTENT_GOO,
  MENUBAR_CONTENT_SHADCN,
  MENUBAR_INDICATOR,
  MENUBAR_ITEM,
  MENUBAR_ITEM_FLAT,
  MENUBAR_LABEL,
  MENUBAR_RADIO_ITEM,
  MENUBAR_SEPARATOR,
  MENUBAR_SHORTCUT,
  MENUBAR_SUB_CONTENT_GOO,
  MENUBAR_SUB_CONTENT_SHADCN,
  MENUBAR_SUB_TRIGGER,
  MENUBAR_SUB_TRIGGER_FLAT,
  MENUBAR_TRIGGER,
  MENUBAR_TRIGGER_FLAT,
} from './styles'

// ---- bar ------------------------------------------------------------------------------------

interface BarState {
  /** The bar's engine props (menus inherit goo / wobble / momentum / speed / preset / renderer). */
  bar: GoopMenubarProps
  /** The goo body paints the trigger highlight: triggers drop their flat hover / open bg. */
  blob: boolean
  /** The open menu's value ('' when none). */
  value: string
  setValue: (value: string) => void
}
const BarContext = createContext<BarState | null>(null)

export type GoopMenubarRootProps = Omit<ComponentPropsWithoutRef<typeof MenubarPrimitive.Root>, keyof GoopMenubarProps> &
  GoopMenubarProps &
  GoopSoundProps & {
    /** Receives the live trigger highlight handle (null before mount / when it is off). */
    goopRef?: Ref<MenuHighlightHandle>
  }

export const GoopMenubar = forwardRef<HTMLDivElement, GoopMenubarRootProps>(function GoopMenubar(allProps, ref) {
  const [engine, props] = splitProps(allProps, MENUBAR_PROP_KEYS)
  const { className, value: valueProp, defaultValue, onValueChange, sound, goopRef, ...rest } = props
  const [inner, setInner] = useState(defaultValue ?? '')
  const controlled = valueProp !== undefined
  const value = controlled ? valueProp : inner
  const latest = useRef(onValueChange)
  latest.current = onValueChange
  const setValue = useCallback(
    (v: string) => {
      if (!controlled) setInner(v)
      latest.current?.(v)
    },
    [controlled],
  )
  useGoopSound(sound)

  const config = useGoopConfig()
  const bar = useStableValue<GoopMenubarProps>(engine)
  const options = useStableValue(toMenubarOptions(bar, config))
  const blob = options !== null
  const state = useMemo(() => ({ bar, blob, value, setValue }), [bar, blob, value, setValue])

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useRef<MenuHighlightHandle | null>(null)
  useIsomorphicLayoutEffect(() => {
    const node = el.current
    if (!node || !options) {
      handle.current?.destroy()
      handle.current = null
      return
    }
    if (handle.current) handle.current.update(options)
    else handle.current = attachMenubarHighlight(node, options)
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  useImperativeHandle(goopRef, () => handle.current as MenuHighlightHandle)

  return (
    <BarContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <MenubarPrimitive.Root
          ref={composed}
          data-slot="menubar"
          data-goop-menubar={blob ? '' : undefined}
          className={cn(MENUBAR, className)}
          value={value}
          onValueChange={setValue}
          {...rest}
        />
      </GoopSoundScope>
    </BarContext.Provider>
  )
})
GoopMenubar.displayName = 'GoopMenubar'

const FALLBACK_BAR: BarState = { bar: {}, blob: false, value: '', setValue: () => {} }
const useBar = (): BarState => useContext(BarContext) ?? FALLBACK_BAR

// ---- menu / trigger / portal / group --------------------------------------------------------

interface MenuState {
  value: string
  trigger: MutableRefObject<HTMLElement | null>
}
const MenuContext = createContext<MenuState | null>(null)

export type GoopMenubarMenuProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Menu>

/** Radix Menubar.Menu. Gets a value of its own (when you don't pass one) so its content knows
 *  when it is the open menu. */
export function GoopMenubarMenu({ value: valueProp, ...props }: GoopMenubarMenuProps) {
  const auto = useId()
  const value = valueProp ?? auto
  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ value, trigger }), [value])
  return (
    <MenuContext.Provider value={state}>
      <MenubarPrimitive.Menu data-slot="menubar-menu" value={value} {...props} />
    </MenuContext.Provider>
  )
}

const FALLBACK_MENU: MenuState = { value: '', trigger: { current: null } }
const useMenu = (): MenuState => useContext(MenuContext) ?? FALLBACK_MENU

export type GoopMenubarTriggerProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Trigger>

/** shadcn's MenubarTrigger. With the bar's goo highlight on, its hover / open background is the
 *  goo body behind it. */
export const GoopMenubarTrigger = forwardRef<HTMLButtonElement, GoopMenubarTriggerProps>(function GoopMenubarTrigger({ className, ...props }, ref) {
  const bar = useBar()
  const menu = useMenu()
  const composed = useComposedRefs<HTMLButtonElement>(ref, menu.trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('menuTrigger')
  return (
    <MenubarPrimitive.Trigger
      ref={composed}
      data-slot="menubar-trigger"
      className={cn(bar.blob ? '' : MENUBAR_TRIGGER_FLAT, MENUBAR_TRIGGER, className)}
      {...cue}
      {...props}
    />
  )
})
GoopMenubarTrigger.displayName = 'GoopMenubarTrigger'

export type GoopMenubarPortalProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Portal>

export function GoopMenubarPortal(props: GoopMenubarPortalProps) {
  return <MenubarPrimitive.Portal data-slot="menubar-portal" {...props} />
}

export type GoopMenubarGroupProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Group>

export const GoopMenubarGroup = forwardRef<HTMLDivElement, GoopMenubarGroupProps>(function GoopMenubarGroup(props, ref) {
  return <MenubarPrimitive.Group ref={ref} data-slot="menubar-group" {...props} />
})
GoopMenubarGroup.displayName = 'GoopMenubarGroup'

// ---- content --------------------------------------------------------------------------------

export type GoopMenubarContentProps = Omit<ComponentPropsWithoutRef<typeof MenubarPrimitive.Content>, keyof GoopMenubarMenuEngineProps> &
  GoopMenubarMenuEngineProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
    /** Receives the live highlight handle (null when goo or highlight is off). */
    highlightRef?: Ref<MenuHighlightHandle>
  }

export const GoopMenubarContent = forwardRef<HTMLDivElement, GoopMenubarContentProps>(function GoopMenubarContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, MENUBAR_MENU_PROP_KEYS)
  const { className, children, align = 'start', alignOffset = -4, sideOffset = 8, goopRef, highlightRef, ...rest } = props
  const bar = useBar()
  const owner = useMenu()
  const config = useGoopConfig()
  const menu = useStableValue(resolveMenubarMenuProps(engine, null, bar.bar))
  const options = useStableValue(toMenubarMenuOptions(menu, config))
  const goo = useMenuGoo({
    open: !!bar.value && bar.value === owner.value,
    anchor: () => owner.trigger.current,
    emerge: options.emerge,
    highlight: options.highlight,
    close: () => bar.setValue(''),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <MenubarPrimitive.Portal>
      <MenubarPrimitive.Content
        ref={ref}
        data-slot="menubar-content"
        align={align}
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        className={cn(menu.goo ? MENUBAR_CONTENT_GOO : MENUBAR_CONTENT_SHADCN, className)}
        {...rest}
      >
        <MenuContentContext.Provider value={ctx}>
          {menu.goo ? (
            <>
              <MenuSurface goo={goo} />
              <div data-slot="menubar-scroll" className={MENU_SCROLL}>
                <MenuList goo={goo} slot="menubar-list" className={MENU_LIST}>
                  {children}
                </MenuList>
              </div>
            </>
          ) : (
            children
          )}
        </MenuContentContext.Provider>
      </MenubarPrimitive.Content>
    </MenubarPrimitive.Portal>
  )
})
GoopMenubarContent.displayName = 'GoopMenubarContent'

// ---- items ----------------------------------------------------------------------------------

export type GoopMenubarItemProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Item> & {
  inset?: boolean
  variant?: 'default' | 'destructive'
}

/** shadcn's MenubarItem (`inset`, `variant="destructive"`). In a goo menu the highlight is the
 *  blob and selecting plays its pop before the menu closes (`preventDefault()` keeps it open). */
export const GoopMenubarItem = forwardRef<HTMLDivElement, GoopMenubarItemProps>(function GoopMenubarItem(
  { className, inset, variant = 'default', onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuItem')
  return (
    <MenubarPrimitive.Item
      ref={ref}
      data-slot="menubar-item"
      data-inset={inset ? '' : undefined}
      data-variant={variant}
      className={cn(sel.blob ? '' : MENUBAR_ITEM_FLAT, MENUBAR_ITEM, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    />
  )
})
GoopMenubarItem.displayName = 'GoopMenubarItem'

export type GoopMenubarCheckboxItemProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.CheckboxItem> & { inset?: boolean }

export const GoopMenubarCheckboxItem = forwardRef<HTMLDivElement, GoopMenubarCheckboxItemProps>(function GoopMenubarCheckboxItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuCheckboxItem')
  return (
    <MenubarPrimitive.CheckboxItem
      ref={ref}
      data-slot="menubar-checkbox-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : MENUBAR_CHOICE_FLAT, MENUBAR_CHECKBOX_ITEM, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={MENUBAR_INDICATOR}>
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.CheckboxItem>
  )
})
GoopMenubarCheckboxItem.displayName = 'GoopMenubarCheckboxItem'

export type GoopMenubarRadioGroupProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioGroup>

export const GoopMenubarRadioGroup = forwardRef<HTMLDivElement, GoopMenubarRadioGroupProps>(function GoopMenubarRadioGroup(props, ref) {
  return <MenubarPrimitive.RadioGroup ref={ref} data-slot="menubar-radio-group" {...props} />
})
GoopMenubarRadioGroup.displayName = 'GoopMenubarRadioGroup'

export type GoopMenubarRadioItemProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.RadioItem> & { inset?: boolean }

export const GoopMenubarRadioItem = forwardRef<HTMLDivElement, GoopMenubarRadioItemProps>(function GoopMenubarRadioItem(
  { className, children, inset, onSelect, ...props },
  ref,
) {
  const sel = useMenuSelect(onSelect)
  const cue = useGoopCue('menuRadioItem')
  return (
    <MenubarPrimitive.RadioItem
      ref={ref}
      data-slot="menubar-radio-item"
      data-inset={inset ? '' : undefined}
      className={cn(sel.blob ? '' : MENUBAR_CHOICE_FLAT, MENUBAR_RADIO_ITEM, className)}
      {...cue}
      {...props}
      onSelect={sel.onSelect}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      <span className={MENUBAR_INDICATOR}>
        <MenubarPrimitive.ItemIndicator>
          <CheckIcon />
        </MenubarPrimitive.ItemIndicator>
      </span>
      {children}
    </MenubarPrimitive.RadioItem>
  )
})
GoopMenubarRadioItem.displayName = 'GoopMenubarRadioItem'

// ---- text parts -----------------------------------------------------------------------------

export type GoopMenubarLabelProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Label> & { inset?: boolean }

export const GoopMenubarLabel = forwardRef<HTMLDivElement, GoopMenubarLabelProps>(function GoopMenubarLabel({ className, inset, ...props }, ref) {
  return <MenubarPrimitive.Label ref={ref} data-slot="menubar-label" data-inset={inset ? '' : undefined} className={cn(MENUBAR_LABEL, className)} {...props} />
})
GoopMenubarLabel.displayName = 'GoopMenubarLabel'

export type GoopMenubarSeparatorProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Separator>

export const GoopMenubarSeparator = forwardRef<HTMLDivElement, GoopMenubarSeparatorProps>(function GoopMenubarSeparator({ className, ...props }, ref) {
  return <MenubarPrimitive.Separator ref={ref} data-slot="menubar-separator" className={cn(MENUBAR_SEPARATOR, className)} {...props} />
})
GoopMenubarSeparator.displayName = 'GoopMenubarSeparator'

export function GoopMenubarShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="menubar-shortcut" className={cn(MENUBAR_SHORTCUT, className)} {...props} />
}

// ---- submenus -------------------------------------------------------------------------------

export type GoopMenubarSubProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.Sub>

/** Radix Menubar.Sub. Tracks the open state for its SubContent's goo. */
export function GoopMenubarSub({ open: openProp, defaultOpen, onOpenChange, ...props }: GoopMenubarSubProps) {
  const [open, setOpen] = useOpenState(openProp, defaultOpen, onOpenChange)
  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ open, trigger }), [open])
  return (
    <MenuSubContext.Provider value={state}>
      <MenubarPrimitive.Sub data-slot="menubar-sub" open={open} onOpenChange={setOpen} {...props} />
    </MenuSubContext.Provider>
  )
}

export type GoopMenubarSubTriggerProps = ComponentPropsWithoutRef<typeof MenubarPrimitive.SubTrigger> & { inset?: boolean }

export const GoopMenubarSubTrigger = forwardRef<HTMLDivElement, GoopMenubarSubTriggerProps>(function GoopMenubarSubTrigger({ className, inset, children, ...props }, ref) {
  const menu = useMenuContent()
  const sub = useMenuSub()
  const composed = useComposedRefs<HTMLDivElement>(ref, sub?.trigger as MutableRefObject<HTMLDivElement | null> | undefined)
  const cue = useGoopCue('menuSubTrigger')
  return (
    <MenubarPrimitive.SubTrigger
      ref={composed}
      data-slot="menubar-sub-trigger"
      data-inset={inset ? '' : undefined}
      className={cn(menu?.blob ? '' : MENUBAR_SUB_TRIGGER_FLAT, MENUBAR_SUB_TRIGGER, className)}
      {...cue}
      {...props}
      onPointerMove={quietFocus(props.onPointerMove)}
    >
      {children}
      <ChevronRightIcon className="cn-rtl-flip ml-auto size-4" />
    </MenubarPrimitive.SubTrigger>
  )
})
GoopMenubarSubTrigger.displayName = 'GoopMenubarSubTrigger'

export type GoopMenubarSubContentProps = Omit<ComponentPropsWithoutRef<typeof MenubarPrimitive.SubContent>, keyof GoopMenubarMenuEngineProps> &
  GoopMenubarMenuEngineProps & {
    goopRef?: Ref<EmergeHandle>
    highlightRef?: Ref<MenuHighlightHandle>
  }

/** shadcn's MenubarSubContent. Blooms out of its row with its own blob; engine props left
 *  unset inherit from the parent menu. */
export const GoopMenubarSubContent = forwardRef<HTMLDivElement, GoopMenubarSubContentProps>(function GoopMenubarSubContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, MENUBAR_MENU_PROP_KEYS)
  const { className, children, goopRef, highlightRef, ...rest } = props
  const bar = useBar()
  const parent = useMenuContent()
  const sub = useMenuSub()
  const config = useGoopConfig()
  const menu = useStableValue(subMenu(resolveMenubarMenuProps(engine, parent?.menu, bar.bar), engine.goo, parent?.menu.submenus))
  const options = useStableValue(toMenubarMenuOptions(menu, config))
  const emerge = useInheritedColors(options.emerge, engine.surface === undefined ? parent : null)
  const goo = useMenuGoo({
    open: sub?.open ?? true,
    anchor: () => sub?.trigger.current,
    emerge,
    highlight: options.highlight,
    close: () => bar.setValue(''),
    goopRef,
    highlightRef,
  })
  const blob = options.highlight !== null
  const ctx = useMemo<MenuContentState>(() => ({ menu, blob, select: goo.select, colors: goo.colors }), [menu, blob, goo])

  return (
    <MenubarPrimitive.SubContent
      ref={ref}
      data-slot="menubar-sub-content"
      className={cn(menu.goo ? MENUBAR_SUB_CONTENT_GOO : MENUBAR_SUB_CONTENT_SHADCN, className)}
      {...rest}
    >
      <MenuContentContext.Provider value={ctx}>
        {menu.goo ? (
          <>
            <MenuSurface goo={goo} />
            <div data-slot="menubar-scroll" className={MENU_SUB_SCROLL}>
              <MenuList goo={goo} slot="menubar-list" className={MENU_LIST}>
                {children}
              </MenuList>
            </div>
          </>
        ) : (
          children
        )}
      </MenuContentContext.Provider>
    </MenubarPrimitive.SubContent>
  )
})
GoopMenubarSubContent.displayName = 'GoopMenubarSubContent'

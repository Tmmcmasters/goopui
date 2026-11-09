'use client'
// GoopCombobox: shadcn/ui's combobox recipe (cmdk inside a Radix Popover) shipped as parts,
// with the same API shape and look as @goopui/vue's GoopCombobox:
//   <GoopCombobox value onValueChange>            the root (cmdk Command + Popover.Root)
//     <GoopComboboxAnchor>                        the list positions against it
//       <GoopComboboxInput displayValue />        cmdk's input in shadcn's Input box, goo ring
//       <GoopComboboxTrigger />                   GoopSelect's chevron, 32px hit area
//     <GoopComboboxList>                          the popover list (cmdk List)
//       <GoopComboboxEmpty /> <GoopComboboxGroup> <GoopComboboxItem value>
//         ... <GoopComboboxItemIndicator />       the check mark, plops in when chosen
// Typing opens the list and filters it (cmdk's filter; `ignoreFilter` turns it off); the
// chevron opens it unfiltered, with the chosen item highlighted. Values are strings (cmdk's
// item values); `multiple` makes the value a string array and keeps the list open.
//
// The list blooms open like GoopSelectContent's popper (core `attachEmerge`, the bloom from its
// own center, the splash kept off the input) and its item highlight is the command's goo blob
// (core `attachMenuHighlight` on cmdk's list). Choosing an item squishes the blob, sets the
// value right away (its check mark plops in, core `plopIn`) and closes once the pop has played.
// With `goo={false}` on the list it is shadcn's popover list. Reduced motion: plain open /
// close, the blob snaps, no pop, no plop.
import { attachEmerge, plopIn, type EmergeHandle, type EmergeOptions, type InputHandle, type MenuHighlightHandle, type SelectPlopOptions } from '@goopui/core'
import { cn } from 'cn'
import { Command as CommandPrimitive } from 'cmdk'
import { Popover as PopoverPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type MutableRefObject,
  type ReactNode,
  type Ref,
} from 'react'
import { useGoopConfig } from '../../config'
import {
  COMBOBOX_PROP_KEYS,
  COMMAND_INPUT_PROP_KEYS,
  resolveComboboxProps,
  splitProps,
  toCommandInputOptions,
  toComboboxOptions,
  type GoopCommandInputEngineProps,
  type GoopComboboxProps,
  type GoopSoundProps,
} from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { setRef, useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { useCommandRing } from '../command/GoopCommand'
import { useCmdkHighlight } from '../command/use-cmdk-highlight'
import {
  COMBOBOX_ANCHOR,
  COMBOBOX_EMPTY,
  COMBOBOX_FIELD_ACTIVE,
  COMBOBOX_GROUP,
  COMBOBOX_INPUT,
  COMBOBOX_INPUT_HOST,
  COMBOBOX_ITEM,
  COMBOBOX_ITEM_FLAT,
  COMBOBOX_ITEM_INDICATOR,
  COMBOBOX_LIST_GOO,
  COMBOBOX_LIST_SHADCN,
  COMBOBOX_SCROLL,
  COMBOBOX_SCROLL_GOO,
  COMBOBOX_SEPARATOR,
  COMBOBOX_TRIGGER,
} from './styles'

// ---- root -----------------------------------------------------------------------------------

interface RootState {
  open: boolean
  setOpen: (open: boolean) => void
  multiple: boolean
  /** The selected values (one at most unless `multiple`). */
  selected: string[]
  isSelected: (value: string) => boolean
  /** Choose `value`: set it (toggle it with `multiple`). */
  choose: (value: string) => void
  /** The user has typed since the list opened (the filter is on only then). */
  typed: boolean
  search: string
  setSearch: (search: string, typed: boolean) => void
  disabled: boolean
  anchor: MutableRefObject<HTMLElement | null>
  input: MutableRefObject<HTMLInputElement | null>
  trigger: MutableRefObject<HTMLElement | null>
}

const RootContext = createContext<RootState | null>(null)
const useRoot = (): RootState => {
  const ctx = useContext(RootContext)
  if (!ctx) throw new Error('GoopCombobox parts must be used inside <GoopCombobox>.')
  return ctx
}

type ComboboxValueProps =
  | {
      multiple?: false
      /** The chosen value ('' : none). */
      value?: string
      defaultValue?: string
      onValueChange?: (value: string) => void
    }
  | {
      /** Choose several values (the value is an array; the list stays open). */
      multiple: true
      value?: string[]
      defaultValue?: string[]
      onValueChange?: (value: string[]) => void
    }

export type GoopComboboxRootProps = Omit<
  ComponentPropsWithoutRef<typeof CommandPrimitive>,
  'value' | 'defaultValue' | 'onValueChange' | 'shouldFilter'
> &
  ComboboxValueProps &
  GoopSoundProps & {
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** Turn off the built-in filter: render every item as given (filter them yourself). */
    ignoreFilter?: boolean
    disabled?: boolean
    children?: ReactNode
  }

const asList = (v: string | string[] | undefined): string[] => (Array.isArray(v) ? v : v ? [v] : [])

export const GoopCombobox = forwardRef<HTMLDivElement, GoopComboboxRootProps>(function GoopCombobox(props, ref) {
  const {
    value: valueProp,
    defaultValue,
    onValueChange,
    multiple = false,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    ignoreFilter = false,
    disabled = false,
    sound,
    children,
    ...rest
  } = props

  const [innerValue, setInnerValue] = useState<string[]>(() => asList(defaultValue))
  const controlledValue = valueProp !== undefined
  const selected = controlledValue ? asList(valueProp) : innerValue
  const latest = useRef(selected)
  latest.current = selected
  const emit = useRef(onValueChange)
  emit.current = onValueChange

  const [innerOpen, setInnerOpen] = useState(defaultOpen)
  const open = openProp ?? innerOpen
  const [search, setSearchState] = useState('')
  const [typed, setTyped] = useState(false)
  // The highlighted item (cmdk's own value), set to the chosen one when the list opens.
  const [active, setActive] = useState('')

  const setOpen = useCallback(
    (next: boolean) => {
      if (next && disabled) return
      if (openProp === undefined) setInnerOpen(next)
      if (next !== open) onOpenChange?.(next)
      // Opening shows every item (the filter waits for typing), the chosen one highlighted;
      // closing forgets the typed search.
      setTyped(false)
      if (next) setActive(latest.current[0] ?? '')
      else setSearchState('')
    },
    [disabled, openProp, open, onOpenChange],
  )
  const choose = useCallback(
    (v: string) => {
      const cur = latest.current
      const next = multiple ? (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]) : [v]
      latest.current = next
      if (!controlledValue) setInnerValue(next)
      ;(emit.current as ((value: string | string[]) => void) | undefined)?.(multiple ? next : v)
      setTyped(false)
      setSearchState('')
    },
    [multiple, controlledValue],
  )
  const setSearch = useCallback((s: string, t: boolean) => {
    setSearchState(s)
    setTyped(t)
  }, [])

  const anchor = useRef<HTMLElement | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  useGoopSound(sound)

  const state: RootState = {
    open,
    setOpen,
    multiple,
    selected,
    isSelected: (v) => selected.includes(v),
    choose,
    typed,
    search,
    setSearch,
    disabled,
    anchor,
    input,
    trigger,
  }
  return (
    <RootContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
          <CommandPrimitive
            ref={ref}
            data-slot="combobox"
            shouldFilter={!ignoreFilter && typed}
            value={active}
            onValueChange={setActive}
            {...rest}
          >
            {children}
          </CommandPrimitive>
        </PopoverPrimitive.Root>
      </GoopSoundScope>
    </RootContext.Provider>
  )
})
GoopCombobox.displayName = 'GoopCombobox'

// ---- anchor / input / trigger / cancel -------------------------------------------------------

/** The element the list positions against (and keeps its splash off). Default `w-[200px]`. */
export const GoopComboboxAnchor = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>>(function GoopComboboxAnchor(
  { className, ...props },
  ref,
) {
  const root = useRoot()
  const composed = useComposedRefs<HTMLDivElement>(ref, root.anchor as MutableRefObject<HTMLDivElement | null>)
  return <PopoverPrimitive.Anchor ref={composed} data-slot="combobox-anchor" className={cn(COMBOBOX_ANCHOR, className)} {...props} />
})
GoopComboboxAnchor.displayName = 'GoopComboboxAnchor'

export type GoopComboboxInputProps = Omit<ComponentPropsWithoutRef<typeof CommandPrimitive.Input>, 'value' | 'onValueChange' | keyof GoopCommandInputEngineProps> &
  GoopCommandInputEngineProps & {
    /** The text shown for the chosen value while not typing (default: the value itself). */
    displayValue?: (value: string) => string
    /** Called with the typed search text. */
    onSearchChange?: (search: string) => void
    /** Goo focus ring (master switch). */
    goo?: boolean
    /** Receives the live ring handle (null before mount / when goo is off). */
    goopRef?: Ref<InputHandle>
  }

/** cmdk's input in shadcn's Input box, with the Input's goo focus ring: focus flows goo around
 *  the box, typing ripples it, blur drains it. Typing opens the list; Arrow Down opens it too. */
export const GoopComboboxInput = forwardRef<HTMLInputElement, GoopComboboxInputProps>(function GoopComboboxInput(allProps, ref) {
  const [engine, props] = splitProps(allProps, COMMAND_INPUT_PROP_KEYS)
  const { className, displayValue, onSearchChange, goo = true, goopRef, onKeyDown, disabled, ...rest } = props
  const root = useRoot()
  const config = useGoopConfig()
  const cue = useGoopCue('input')

  const host = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, root.input)
  const handle = useCommandRing(host, root.input, toCommandInputOptions(engine, config), goo)
  useImperativeHandle(goopRef, () => handle as InputHandle, [handle])
  const active = handle !== null

  const shown = root.typed ? root.search : root.multiple ? '' : (root.selected[0] !== undefined ? (displayValue ?? String)(root.selected[0]) : '')
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (!root.open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      root.setOpen(true)
    }
  }
  return (
    <div ref={host} data-slot="combobox-input-goo" data-goop-host="input" data-goop-active={active ? '' : undefined} className={COMBOBOX_INPUT_HOST}>
      <CommandPrimitive.Input
        ref={composed}
        data-slot="combobox-input"
        disabled={disabled ?? root.disabled}
        value={shown}
        onValueChange={(s) => {
          // Opening resets `typed`, so open first, then keep the text the user just typed.
          if (!root.open) root.setOpen(true)
          root.setSearch(s, true)
          onSearchChange?.(s)
        }}
        onKeyDown={keys}
        {...cue}
        {...rest}
        className={cn(COMBOBOX_INPUT, active && COMBOBOX_FIELD_ACTIVE, className)}
      />
    </div>
  )
})
GoopComboboxInput.displayName = 'GoopComboboxInput'

/** Opens and closes the list. With no children it shows GoopSelect's chevron (size-4) in a box
 *  at least 32px wide and 24px tall; place it with your own classes (e.g.
 *  `absolute inset-y-0 right-0`, the input's full 32px height). Give it an `aria-label`. */
export const GoopComboboxTrigger = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function GoopComboboxTrigger(
  { className, children, onClick, disabled, ...props },
  ref,
) {
  const root = useRoot()
  const composed = useComposedRefs<HTMLButtonElement>(ref, root.trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('selectTrigger', { open: root.open })
  return (
    <button
      ref={composed}
      type="button"
      data-slot="combobox-trigger"
      aria-expanded={root.open}
      aria-haspopup="listbox"
      data-state={root.open ? 'open' : 'closed'}
      disabled={disabled ?? root.disabled}
      tabIndex={-1}
      {...cue}
      {...props}
      className={cn(COMBOBOX_TRIGGER, className)}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        root.setOpen(!root.open)
        root.input.current?.focus()
      }}
    >
      {children ?? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      )}
    </button>
  )
})
GoopComboboxTrigger.displayName = 'GoopComboboxTrigger'

/** Clears the typed search (and focuses the input). */
export const GoopComboboxCancel = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(function GoopComboboxCancel({ onClick, ...props }, ref) {
  const root = useRoot()
  return (
    <button
      ref={ref}
      type="button"
      data-slot="combobox-cancel"
      tabIndex={-1}
      {...props}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        root.setSearch('', true)
        root.input.current?.focus()
      }}
    />
  )
})
GoopComboboxCancel.displayName = 'GoopComboboxCancel'

// ---- list -----------------------------------------------------------------------------------

interface ListState {
  /** The goo highlight blob is drawing the highlight: items drop their flat bg. */
  blob: boolean
  plop: SelectPlopOptions | null
  /** An item was chosen: play the pop, commit now, close once the pop has played. */
  select: (commit: () => void, close: boolean) => void
}
const ListContext = createContext<ListState | null>(null)

/** Radix parks the floating wrapper at translate(0, -200%) until floating-ui has placed it. */
const positioned = (host: HTMLElement): boolean => {
  const wrap = host.parentElement
  return !wrap?.hasAttribute('data-radix-popper-content-wrapper') || !wrap.style.transform.includes('-200%')
}

const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }

/** The aria-hidden emerge surface inside the list panel (the Radix Popover content, which
 *  Presence remounts on every open). Layout effects run child-first, so close() (which sets the
 *  hold animation's duration) lands before Radix Presence reads the exit animation. */
function EmergeSurface({ options, open, anchor, handleRef }: { options: EmergeOptions; open: boolean; anchor: () => HTMLElement | null; handleRef: Ref<EmergeHandle> }) {
  const el = useRef<HTMLSpanElement | null>(null)
  const handle = useRef<EmergeHandle | null>(null)
  const shown = useRef(open)
  const latest = useRef(options)
  latest.current = options
  const openNow = useRef(open)
  openNow.current = open
  const anchorNow = useRef(anchor)
  anchorNow.current = anchor

  useIsomorphicLayoutEffect(() => {
    const span = el.current
    const host = span?.parentElement
    if (!span || !host) return
    const h = attachEmerge(host, { ...latest.current, surface: span, anchor: () => anchorNow.current(), ready: () => positioned(host) })
    handle.current = h
    setRef(handleRef, h)
    shown.current = openNow.current
    if (openNow.current) h.open()
    return () => {
      h.destroy()
      handle.current = null
      setRef(handleRef, null)
    }
  }, [])
  useIsomorphicLayoutEffect(() => {
    handle.current?.update(options)
  }, [options])
  useIsomorphicLayoutEffect(() => {
    const h = handle.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) h.open()
    else h.close()
  }, [open])
  return <span ref={el} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} />
}

export type GoopComboboxListProps = Omit<ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>, keyof GoopComboboxProps> &
  GoopComboboxProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
    /** Receives the live highlight handle (null when goo or highlight is off). */
    highlightRef?: Ref<MenuHighlightHandle>
  }

/**
 * The list: a Radix Popover content (in a portal, below the anchor, align start, sideOffset 6)
 * around cmdk's list. It blooms open like GoopSelectContent's popper and its highlight is the
 * command's goo blob; choosing an item squishes the blob, sets the value right away and closes
 * once the pop has played. Focus stays in the input.
 */
export const GoopComboboxList = forwardRef<HTMLDivElement, GoopComboboxListProps>(function GoopComboboxList(allProps, ref) {
  const [engine, props] = splitProps(allProps, COMBOBOX_PROP_KEYS)
  const {
    className,
    children,
    goopRef,
    highlightRef,
    side = 'bottom',
    align = 'start',
    sideOffset = 6,
    onOpenAutoFocus,
    onCloseAutoFocus,
    onInteractOutside,
    onMouseDown,
    ...rest
  } = props
  const root = useRoot()
  const config = useGoopConfig()
  const combobox = resolveComboboxProps(engine)
  const options = useStableValue(toComboboxOptions(combobox, config))
  const goo = combobox.goo

  const { setList, handle: highlight } = useCmdkHighlight(options.highlight, false)
  useImperativeHandle(highlightRef, () => highlight as MenuHighlightHandle, [highlight])
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  const close = useRef(root.setOpen)
  close.current = root.setOpen

  const list: ListState = {
    blob: options.highlight !== null,
    plop: options.plop,
    select: (commit, shouldClose) => {
      const ms = highlight?.pop() ?? 0
      commit()
      if (!shouldClose) return
      clearTimeout(timer.current)
      if (ms > 0) timer.current = setTimeout(() => close.current(false), ms)
      else close.current(false)
    },
  }

  // Inside the anchor or on the trigger counts as inside: they toggle the list themselves.
  const inside = (t: EventTarget | null) => {
    const n = t as Node | null
    return !!n && [root.anchor.current, root.trigger.current, root.input.current].some((el) => el?.contains(n))
  }

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        data-slot="combobox-list"
        side={side}
        align={align}
        sideOffset={sideOffset}
        onOpenAutoFocus={(e) => {
          onOpenAutoFocus?.(e)
          e.preventDefault()
        }}
        onCloseAutoFocus={(e) => {
          onCloseAutoFocus?.(e)
          e.preventDefault()
        }}
        onInteractOutside={(e) => {
          onInteractOutside?.(e)
          if (inside(e.target)) e.preventDefault()
        }}
        // Keep focus (and the caret) in the input while the pointer works the list.
        onMouseDown={(e) => {
          onMouseDown?.(e)
          e.preventDefault()
        }}
        className={cn(goo ? COMBOBOX_LIST_GOO : COMBOBOX_LIST_SHADCN, className)}
        {...rest}
      >
        {goo ? <EmergeSurface options={options.emerge} open={root.open} anchor={() => root.anchor.current} handleRef={goopRef ?? null} /> : null}
        <CommandPrimitive.List ref={setList} data-slot="combobox-scroll" className={cn(COMBOBOX_SCROLL, options.highlight && COMBOBOX_SCROLL_GOO)}>
          <ListContext.Provider value={list}>{children}</ListContext.Provider>
        </CommandPrimitive.List>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
GoopComboboxList.displayName = 'GoopComboboxList'

// ---- empty / group / separator ----------------------------------------------------------------

/** Shown when nothing matches the typed search. */
export const GoopComboboxEmpty = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>(function GoopComboboxEmpty({ className, ...props }, ref) {
  return <CommandPrimitive.Empty ref={ref} data-slot="combobox-empty" className={cn(COMBOBOX_EMPTY, className)} {...props} />
})
GoopComboboxEmpty.displayName = 'GoopComboboxEmpty'

/** A group of items with an optional `heading`. */
export const GoopComboboxGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(function GoopComboboxGroup({ className, ...props }, ref) {
  return <CommandPrimitive.Group ref={ref} data-slot="combobox-group" className={cn(COMBOBOX_GROUP, className)} {...props} />
})
GoopComboboxGroup.displayName = 'GoopComboboxGroup'

export const GoopComboboxSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>>(function GoopComboboxSeparator(
  { className, alwaysRender = true, ...props },
  ref,
) {
  return <CommandPrimitive.Separator ref={ref} data-slot="combobox-separator" alwaysRender={alwaysRender} className={cn(COMBOBOX_SEPARATOR, className)} {...props} />
})
GoopComboboxSeparator.displayName = 'GoopComboboxSeparator'

// ---- item -----------------------------------------------------------------------------------

interface ItemState {
  selected: boolean
  /** True once, right after the item was chosen (so the check mark plops in then, not on
   *  every open). */
  takeChosen: () => boolean
}
const ItemContext = createContext<ItemState | null>(null)

export type GoopComboboxItemProps = Omit<ComponentPropsWithoutRef<typeof CommandPrimitive.Item>, 'value'> & {
  /** The item's value (what the combobox's value becomes). */
  value: string
}

/** One option. Inside a goo list the highlight is the list's goo blob (the flat bg is dropped);
 *  choosing squishes the blob, sets the value right away and closes the list once the pop has
 *  played (`multiple`: toggles it and stays open). */
export const GoopComboboxItem = forwardRef<HTMLDivElement, GoopComboboxItemProps>(function GoopComboboxItem({ className, value, onSelect, disabled, ...props }, ref) {
  const root = useRoot()
  const list = useContext(ListContext)
  const cue = useGoopCue('comboboxItem')
  const chosen = useRef(false)
  const selected = root.isSelected(value)
  const item: ItemState = {
    selected,
    takeChosen: () => {
      const was = chosen.current
      chosen.current = false
      return was
    },
  }
  return (
    <ItemContext.Provider value={item}>
      <CommandPrimitive.Item
        ref={ref}
        data-slot="combobox-item"
        data-state={selected ? 'checked' : 'unchecked'}
        value={value}
        disabled={disabled}
        {...cue}
        className={cn(list?.blob ? '' : COMBOBOX_ITEM_FLAT, COMBOBOX_ITEM, className)}
        onSelect={(v) => {
          onSelect?.(v)
          if (disabled) return
          chosen.current = !root.isSelected(value)
          const commit = () => root.choose(value)
          if (list) list.select(commit, !root.multiple)
          else {
            commit()
            if (!root.multiple) root.setOpen(false)
          }
        }}
        {...props}
      />
    </ItemContext.Provider>
  )
})
GoopComboboxItem.displayName = 'GoopComboboxItem'

/** The check mark, shown on a chosen item (`ml-auto`, right edge). Inside a goo list, when its
 *  item is chosen the mark plops in (falls in small, squashes as it lands, jiggles back). */
export const GoopComboboxItemIndicator = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<'span'>>(function GoopComboboxItemIndicator(
  { className, children, ...props },
  ref,
) {
  const item = useContext(ItemContext)
  const list = useContext(ListContext)
  const mark = useRef<HTMLSpanElement | null>(null)
  const shown = !!item?.selected
  // Mounted only while its item is chosen: plop when that's because it was just chosen.
  useIsomorphicLayoutEffect(() => {
    if (!shown) return
    const opts = list?.plop
    if (item?.takeChosen() && opts && mark.current) plopIn(mark.current, opts)
  }, [shown])
  if (!shown) return null
  return (
    <span ref={ref} data-slot="combobox-item-indicator" className={cn(COMBOBOX_ITEM_INDICATOR, className)} {...props}>
      <span ref={mark} data-slot="combobox-item-indicator-mark" className="flex items-center justify-center" style={{ transformOrigin: '50% 85%' }}>
        {children ?? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </span>
    </span>
  )
})
GoopComboboxItemIndicator.displayName = 'GoopComboboxItemIndicator'

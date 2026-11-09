'use client'
// GoopSelect: shadcn/ui's Select (Radix Select, same parts, props and classes) whose listbox
// blooms open like the Vue GoopSelectContent: core's emerge engine with the bloom flow (an
// item-aligned list blooms out of the selected item, a popper list from its own center), the
// item highlight is the menu's goo blob (core `attachMenuHighlight`), choosing an item squishes
// the blob and the list closes once that pop has played, and the chosen item's check mark
// plops in (core `plopIn`).
//
// Radix sets the value and asks to close in one go when an item is chosen. GoopSelect owns
// `open` (controlled or not, like GoopDialog) so the item can hold that close for the pop's
// duration; the value goes through Radix untouched (forms, onValueChange, reset all work).
// Goo layout: the panel (Radix Content) holds the scroll buttons, Radix's Viewport (the
// scroller) around the item list (it holds the highlight and clips its goo with
// `overflow: clip`, so the blob never adds scroll overflow), and the aria-hidden emerge surface.
// The surface calls core's close() in a layout effect, which runs before Radix Presence's own
// (children first), so Presence sees goop.css's hold animation and keeps the list mounted while
// the goo shrinks back. With `goo={false}` it is exactly shadcn's SelectContent. Reduced
// motion: plain open/close, the blob snaps, no pop, no plop.
import {
  EMERGE_CLOSE_VAR,
  attachEmerge,
  attachMenuHighlight,
  findSelectOrigin,
  playCue,
  plopIn,
  selectBloomsFromItem,
  type EmergeHandle,
  type MenuHighlightHandle,
  type SelectPlopOptions,
} from '@goopui/core'
import { cn } from 'cn'
import { Select as SelectPrimitive } from 'radix-ui'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type MutableRefObject,
  type PointerEvent,
  type Ref,
  type SyntheticEvent,
} from 'react'
import { useGoopConfig } from '../../config'
import { SELECT_PROP_KEYS, splitProps, toSelectOptions, type GoopSelectProps, type GoopSoundProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { setRef, useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import {
  SELECT_CONTENT_GOO,
  SELECT_CONTENT_POPPER,
  SELECT_CONTENT_SHADCN,
  SELECT_GROUP,
  SELECT_ITEM,
  SELECT_ITEM_FLAT_BG,
  SELECT_ITEM_INDICATOR,
  SELECT_LABEL,
  SELECT_LIST,
  SELECT_SCROLL_BUTTON,
  SELECT_SEPARATOR,
  SELECT_TRIGGER,
  SELECT_VIEWPORT,
} from './styles'

// ---- root ------------------------------------------------------------------------------------

interface SelectState {
  open: boolean
  /** The trigger element (the bloom's anchor, `surface="trigger"`). */
  trigger: MutableRefObject<HTMLElement | null>
  /** The close Radix asks for next (an item was just chosen) waits `ms` for the pop. */
  holdClose(ms: number): void
}
const SelectContext = createContext<SelectState | null>(null)
const FALLBACK: SelectState = { open: false, trigger: { current: null }, holdClose: () => {} }
const useSelectState = (): SelectState => useContext(SelectContext) ?? FALLBACK

export type GoopSelectRootProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Root> & GoopSoundProps

/** Radix Select.Root. Tracks `open` (controlled or not) so the goo can play open / close and an
 *  item's choice can hold the close until its pop has played. */
export function GoopSelect({ open: openProp, defaultOpen, onOpenChange, sound, ...props }: GoopSelectRootProps) {
  const [inner, setInner] = useState(!!defaultOpen)
  const controlled = openProp !== undefined
  const open = controlled ? openProp : inner
  const onOpenChangeRef = useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const hold = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const apply = useCallback(
    (v: boolean) => {
      if (!controlled) setInner(v)
      onOpenChangeRef.current?.(v)
    },
    [controlled],
  )
  const onChange = useCallback(
    (v: boolean) => {
      clearTimeout(timer.current)
      const ms = hold.current
      hold.current = 0
      if (!v && ms > 0) timer.current = setTimeout(() => apply(false), ms)
      else apply(v)
    },
    [apply],
  )
  // Radix closes in the same event handler as the choice; anything later is not that close.
  const holdClose = useCallback((ms: number) => {
    hold.current = ms
    queueMicrotask(() => {
      hold.current = 0
    })
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const trigger = useRef<HTMLElement | null>(null)
  const state = useMemo(() => ({ open, trigger, holdClose }), [open, holdClose])
  useGoopSound(sound)
  return (
    <SelectContext.Provider value={state}>
      <GoopSoundScope sound={sound}>
        <SelectPrimitive.Root data-slot="select" open={open} onOpenChange={onChange} {...props} />
      </GoopSoundScope>
    </SelectContext.Provider>
  )
}

// ---- simple parts -----------------------------------------------------------------------------

export type GoopSelectGroupProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Group>

export const GoopSelectGroup = forwardRef<HTMLDivElement, GoopSelectGroupProps>(function GoopSelectGroup({ className, ...props }, ref) {
  return <SelectPrimitive.Group ref={ref} data-slot="select-group" className={cn(SELECT_GROUP, className)} {...props} />
})
GoopSelectGroup.displayName = 'GoopSelectGroup'

export type GoopSelectValueProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Value>

export const GoopSelectValue = forwardRef<HTMLSpanElement, GoopSelectValueProps>(function GoopSelectValue(props, ref) {
  return <SelectPrimitive.Value ref={ref} data-slot="select-value" {...props} />
})
GoopSelectValue.displayName = 'GoopSelectValue'

export type GoopSelectTriggerProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger> & {
  size?: 'sm' | 'default'
}

const Chevron = ({ d, className }: { d: string; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
)
const DOWN = 'm6 9 6 6 6-6'
const UP = 'm18 15-6-6-6 6'

/** shadcn's SelectTrigger (`size: 'default' | 'sm'`, chevron icon). The list blooms over /
 *  below it. */
export const GoopSelectTrigger = forwardRef<HTMLButtonElement, GoopSelectTriggerProps>(function GoopSelectTrigger(
  { className, size = 'default', children, ...props },
  ref,
) {
  const { trigger } = useSelectState()
  const composed = useComposedRefs<HTMLButtonElement>(ref, trigger as MutableRefObject<HTMLButtonElement | null>)
  const cue = useGoopCue('selectTrigger')
  return (
    <SelectPrimitive.Trigger ref={composed} data-slot="select-trigger" data-size={size} className={cn(SELECT_TRIGGER, className)} {...cue} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <Chevron d={DOWN} className="pointer-events-none size-4 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
})
GoopSelectTrigger.displayName = 'GoopSelectTrigger'

export type GoopSelectLabelProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Label>

export const GoopSelectLabel = forwardRef<HTMLDivElement, GoopSelectLabelProps>(function GoopSelectLabel({ className, ...props }, ref) {
  return <SelectPrimitive.Label ref={ref} data-slot="select-label" className={cn(SELECT_LABEL, className)} {...props} />
})
GoopSelectLabel.displayName = 'GoopSelectLabel'

export type GoopSelectSeparatorProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>

export const GoopSelectSeparator = forwardRef<HTMLDivElement, GoopSelectSeparatorProps>(function GoopSelectSeparator({ className, ...props }, ref) {
  return <SelectPrimitive.Separator ref={ref} data-slot="select-separator" className={cn(SELECT_SEPARATOR, className)} {...props} />
})
GoopSelectSeparator.displayName = 'GoopSelectSeparator'

export type GoopSelectScrollUpButtonProps = ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>

export const GoopSelectScrollUpButton = forwardRef<HTMLDivElement, GoopSelectScrollUpButtonProps>(function GoopSelectScrollUpButton(
  { className, children, ...props },
  ref,
) {
  return (
    <SelectPrimitive.ScrollUpButton ref={ref} data-slot="select-scroll-up-button" className={cn(SELECT_SCROLL_BUTTON, className)} {...props}>
      {children ?? <Chevron d={UP} />}
    </SelectPrimitive.ScrollUpButton>
  )
})
GoopSelectScrollUpButton.displayName = 'GoopSelectScrollUpButton'

export type GoopSelectScrollDownButtonProps = ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>

export const GoopSelectScrollDownButton = forwardRef<HTMLDivElement, GoopSelectScrollDownButtonProps>(function GoopSelectScrollDownButton(
  { className, children, ...props },
  ref,
) {
  return (
    <SelectPrimitive.ScrollDownButton ref={ref} data-slot="select-scroll-down-button" className={cn(SELECT_SCROLL_BUTTON, className)} {...props}>
      {children ?? <Chevron d={DOWN} />}
    </SelectPrimitive.ScrollDownButton>
  )
})
GoopSelectScrollDownButton.displayName = 'GoopSelectScrollDownButton'

// ---- content ----------------------------------------------------------------------------------

/** Shared by GoopSelectContent with its items. */
interface SelectContentState {
  /** The goo highlight blob draws the highlight: items drop their flat focus bg. */
  blob: boolean
  /** Plop options for a chosen item's check mark (null: plop off). */
  plop: SelectPlopOptions | null
  /** An item was chosen: play the pop and hold the close until it has played. */
  select(event: SyntheticEvent): void
}
const SelectContentContext = createContext<SelectContentState | null>(null)

const SURFACE_STYLE: CSSProperties = { position: 'absolute', inset: 0, zIndex: -1, pointerEvents: 'none', borderRadius: 'inherit' }

/** Placed: Radix parks a popper at translate(0, -200%) until floating-ui has placed it, and
 *  sizes an item-aligned list's fixed wrapper once it has measured the trigger. */
const placed = (host: HTMLElement) => {
  const wrap = host.parentElement
  if (!wrap) return true
  if (wrap.hasAttribute('data-radix-popper-content-wrapper')) return !wrap.style.transform.includes('-200%')
  return wrap.style.height !== ''
}

/**
 * The aria-hidden emerge surface. Attaches the emerge engine to its parent (the Radix Content,
 * which Presence remounts on every open) and the highlight blob to the item list, and plays
 * open / close as `open` flips. Rendered after the viewport so the list's ref is set when its
 * layout effect runs. Radix renders a closed select's content into a detached
 * DocumentFragment (to collect the items): nothing attaches there.
 */
function SelectGoo({
  options,
  open,
  popper,
  fromItem,
  trigger,
  list,
  highlight,
  goopRef,
  highlightRef,
}: {
  options: ReturnType<typeof toSelectOptions>
  open: boolean
  popper: boolean
  fromItem: boolean
  trigger: MutableRefObject<HTMLElement | null>
  list: MutableRefObject<HTMLElement | null>
  highlight: MutableRefObject<MenuHighlightHandle | null>
  goopRef?: Ref<EmergeHandle>
  highlightRef?: Ref<MenuHighlightHandle>
}) {
  const el = useRef<HTMLSpanElement | null>(null)
  const emerge = useRef<EmergeHandle | null>(null)
  const shown = useRef(open)
  const latest = useRef({ options, open, fromItem })
  latest.current = { options, open, fromItem }

  const syncHighlight = () => {
    const container = list.current
    const opts = latest.current.options.highlight
    if (!container || !opts || !container.isConnected) {
      highlight.current?.destroy()
      highlight.current = null
      setRef(highlightRef, null)
      return
    }
    if (highlight.current) highlight.current.update(opts)
    else {
      highlight.current = attachMenuHighlight(container, opts)
      setRef(highlightRef, highlight.current)
    }
  }

  useIsomorphicLayoutEffect(() => {
    const span = el.current
    const host = span?.parentElement
    if (!span || !host || !span.isConnected) return
    const h = attachEmerge(host, {
      ...latest.current.options.emerge,
      surface: span,
      anchor: () => trigger.current,
      ready: () => placed(host),
      bloomOrigin: () => (list.current && latest.current.fromItem ? findSelectOrigin(list.current) : null),
    })
    emerge.current = h
    setRef(goopRef, h)
    syncHighlight()
    shown.current = latest.current.open
    if (latest.current.open) h.open()
    return () => {
      h.destroy()
      emerge.current = null
      setRef(goopRef, null)
      highlight.current?.destroy()
      highlight.current = null
      setRef(highlightRef, null)
    }
    // Attach once per mount (Presence remounts the content on every open).
  }, [])

  useIsomorphicLayoutEffect(() => {
    if (!emerge.current) return
    emerge.current.update(options.emerge)
    syncHighlight()
  }, [options])

  useIsomorphicLayoutEffect(() => {
    const h = emerge.current
    if (!h || shown.current === open) return
    shown.current = open
    if (open) {
      h.open()
      return
    }
    h.close()
    // goop.css also holds an item-aligned list's plain fixed wrapper (the node reka's Presence
    // watches in the Vue twin): mirror the close duration onto it, as @goopui/vue does.
    const host = el.current?.parentElement
    const wrap = host?.parentElement
    const ms = host?.style.getPropertyValue(EMERGE_CLOSE_VAR)
    if (!popper && wrap && ms) wrap.style.setProperty(EMERGE_CLOSE_VAR, ms)
  }, [open])

  return <span ref={el} data-goop="surface" aria-hidden="true" style={SURFACE_STYLE} />
}

export type GoopSelectContentProps = Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Content>, keyof GoopSelectProps> &
  GoopSelectProps & {
    /** Receives the live emerge handle (null before mount / when goo is off). */
    goopRef?: Ref<EmergeHandle>
    /** Receives the live highlight handle (null when goo or highlight is off). */
    highlightRef?: Ref<MenuHighlightHandle>
  }

/** shadcn's SelectContent (portal, `position` default 'item-aligned', `align` default 'center',
 *  scroll buttons, viewport) with the goo bloom, highlight blob, pop and plop. */
export const GoopSelectContent = forwardRef<HTMLDivElement, GoopSelectContentProps>(function GoopSelectContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, SELECT_PROP_KEYS)
  const { className, children, position = 'item-aligned', align = 'center', goopRef, highlightRef, ...rest } = props

  const { open, trigger, holdClose } = useSelectState()
  const config = useGoopConfig()
  const options = useStableValue(toSelectOptions(engine, config))
  const goo = options.goo
  const popper = position === 'popper'
  const list = useRef<HTMLDivElement | null>(null)
  const highlight = useRef<MenuHighlightHandle | null>(null)

  const blob = options.highlight !== null
  const ctx = useMemo<SelectContentState>(
    () => ({
      blob,
      plop: options.plop,
      select: (event) => {
        const ms = highlight.current?.pop() ?? 0
        if (ms > 0 && !event.isDefaultPrevented()) holdClose(ms)
      },
    }),
    [blob, options.plop, holdClose],
  )

  return (
    <SelectPrimitive.Portal>
      <SelectContentContext.Provider value={ctx}>
        <SelectPrimitive.Content
          ref={ref}
          data-slot="select-content"
          data-align-trigger={position === 'item-aligned'}
          className={cn(goo ? SELECT_CONTENT_GOO : SELECT_CONTENT_SHADCN, popper && SELECT_CONTENT_POPPER, className)}
          position={position}
          align={align}
          {...rest}
        >
          <GoopSelectScrollUpButton className={goo ? 'rounded-t-[inherit]' : undefined} />
          <SelectPrimitive.Viewport data-position={position} className={SELECT_VIEWPORT}>
            {goo ? (
              <div ref={list} data-slot="select-list" className={SELECT_LIST}>
                {children}
              </div>
            ) : (
              children
            )}
          </SelectPrimitive.Viewport>
          <GoopSelectScrollDownButton className={goo ? 'rounded-b-[inherit]' : undefined} />
          {goo ? (
            <SelectGoo
              options={options}
              open={open}
              popper={popper}
              fromItem={selectBloomsFromItem(position, engine.bloomFrom)}
              trigger={trigger}
              list={list}
              highlight={highlight}
              goopRef={goopRef}
              highlightRef={highlightRef}
            />
          ) : null}
        </SelectPrimitive.Content>
      </SelectContentContext.Provider>
    </SelectPrimitive.Portal>
  )
})
GoopSelectContent.displayName = 'GoopSelectContent'

// ---- item -------------------------------------------------------------------------------------

export type GoopSelectItemProps = ComponentPropsWithoutRef<typeof SelectPrimitive.Item>

/**
 * shadcn's SelectItem (check indicator). Inside a goo select the highlight is the list's goo
 * blob (the flat focus bg is dropped); choosing squishes the blob, and the list closes once the
 * pop has played (`event.preventDefault()` in your onClick / onPointerUp / onKeyDown still
 * cancels the choice, as in Radix). The chosen item's check mark plops in.
 */
export const GoopSelectItem = forwardRef<HTMLDivElement, GoopSelectItemProps>(function GoopSelectItem(
  { className, children, disabled, onPointerDown, onPointerMove, onPointerUp, onClick, onKeyDown, ...props },
  ref,
) {
  const content = useContext(SelectContentContext)
  const sound = useGoopSound()
  // Radix's own rule: a mouse chooses on pointerup, touch / pen on click.
  const pointer = useRef('touch')
  const chosen = useRef(false)
  const mark = useRef<HTMLSpanElement | null>(null)
  const plop = useRef(content?.plop ?? null)
  plop.current = content?.plop ?? null

  // The check mark plops in only when this item is chosen while the list is open (not every
  // time the list opens on an already-selected item).
  const markRef = useCallback((node: HTMLSpanElement | null) => {
    mark.current = node
    if (!node) return
    if (chosen.current && plop.current) plopIn(node, plop.current)
    chosen.current = false
  }, [])

  // Runs after the consumer's handler, before Radix's, so their preventDefault is seen.
  const choose = (event: SyntheticEvent) => {
    if (event.isDefaultPrevented() || disabled) return
    if (sound) playCue('select')
    // Already showing its mark: re-choosing plops nothing.
    chosen.current = !mark.current
    content?.select(event)
  }

  return (
    <SelectPrimitive.Item
      ref={ref}
      data-slot="select-item"
      disabled={disabled}
      className={cn(content?.blob ? '' : SELECT_ITEM_FLAT_BG, SELECT_ITEM, className)}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        onPointerDown?.(e)
        pointer.current = e.pointerType
      }}
      onPointerMove={(e: PointerEvent<HTMLDivElement>) => {
        onPointerMove?.(e)
        pointer.current = e.pointerType
      }}
      onPointerUp={(e: PointerEvent<HTMLDivElement>) => {
        onPointerUp?.(e)
        if (pointer.current === 'mouse') choose(e)
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        onClick?.(e)
        if (pointer.current !== 'mouse') choose(e)
      }}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        onKeyDown?.(e)
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) choose(e)
      }}
      {...props}
    >
      <span className={SELECT_ITEM_INDICATOR} data-slot="select-item-indicator">
        <SelectPrimitive.ItemIndicator>
          <span ref={markRef} data-slot="select-item-indicator-mark" className="flex items-center justify-center" style={{ transformOrigin: '50% 85%' }}>
            <Chevron d="M20 6 9 17l-5-5" className="pointer-events-none" />
          </span>
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
})
GoopSelectItem.displayName = 'GoopSelectItem'

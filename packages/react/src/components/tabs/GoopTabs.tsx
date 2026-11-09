'use client'
// GoopTabs: shadcn/ui's Tabs (Radix Tabs). GoopTabsList's active-tab background is a goo blob
// (core `attachTabsIndicator`, the menu highlight engine fed TABS_FEEL). It slides between
// triggers with momentum, stretches with fat neck lumps while travelling and lands with a
// jelly overshoot; it follows clicks and keyboard (it tracks the trigger with
// `data-state="active"`). The blob is aria-hidden, behind the real triggers. Toggles:
// `indicator`, `wobble`, `momentum`; `goo={false}` is plain shadcn. The `line` variant keeps
// shadcn's underline (no blob). Reduced motion: the blob snaps. Browser-only: SSR renders
// shadcn markup, and goop.css styles the active trigger until the blob attaches.
import { attachTabsIndicator, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { createContext, forwardRef, useCallback, useContext, useImperativeHandle, useMemo, useRef, useState, type ComponentPropsWithoutRef, type MouseEvent, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { TABS_PROP_KEYS, splitProps, toTabsOptions, type GoopSoundProps, type GoopTabsProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { TABS_CONTENT, TABS_ROOT, tabsListVariants, tabsTriggerClass, tabsTriggerGooClass, type TabsListVariants } from './variants'

/** Provided by GoopTabsList to its triggers: the goo indicator paints the active tab, so the
 *  triggers drop their flat active bg + shadow. */
const ListContext = createContext<{ blob: boolean } | null>(null)

export type GoopTabsRootProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & GoopSoundProps

/** The selected tab's value and the values that have a GoopTabsContent panel (undefined
 *  outside a GoopTabs). */
interface TabsState {
  value: string | undefined
  panels: ReadonlySet<string>
  addPanel: (value: string) => () => void
}
const ValueContext = createContext<TabsState | undefined>(undefined)

export const GoopTabs = forwardRef<HTMLDivElement, GoopTabsRootProps>(function GoopTabs(
  { className, orientation = 'horizontal', sound, value: valueProp, defaultValue, onValueChange, ...props },
  ref,
) {
  const on = useGoopSound(sound)
  // Controlled or not, the selected value is known here so every panel can stay in the DOM.
  const [inner, setInner] = useState(defaultValue)
  const value = valueProp !== undefined ? valueProp : inner
  const onChange = (v: string): void => {
    if (valueProp === undefined) setInner(v)
    onValueChange?.(v)
  }
  const [panels, setPanels] = useState<ReadonlySet<string>>(() => new Set())
  const addPanel = useCallback((v: string) => {
    setPanels((p) => (p.has(v) ? p : new Set(p).add(v)))
    return () =>
      setPanels((p) => {
        const next = new Set(p)
        next.delete(v)
        return next
      })
  }, [])
  const ctx = useMemo(() => ({ value, panels, addPanel }), [value, panels, addPanel])
  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <ValueContext.Provider value={ctx}>
        <TabsPrimitive.Root
          ref={ref}
          data-slot="tabs"
          data-orientation={orientation}
          orientation={orientation}
          className={cn(TABS_ROOT, className)}
          value={value ?? ''}
          onValueChange={onChange}
          {...props}
        />
      </ValueContext.Provider>
    </GoopSoundScope>
  )
})
GoopTabs.displayName = 'GoopTabs'

export type GoopTabsListProps = Omit<ComponentPropsWithoutRef<typeof TabsPrimitive.List>, keyof GoopTabsProps> &
  GoopTabsProps &
  TabsListVariants & {
    /** Receives the live indicator handle (null before mount / when the goo indicator is off). */
    goopRef?: Ref<MenuHighlightHandle>
  }

export const GoopTabsList = forwardRef<HTMLDivElement, GoopTabsListProps>(function GoopTabsList(allProps, ref) {
  const [engine, props] = splitProps(allProps, TABS_PROP_KEYS)
  const { className, variant = 'default', goopRef, ...rest } = props

  const config = useGoopConfig()
  const options = useStableValue(variant === 'line' ? null : toTabsOptions(engine, config))
  const blob = options !== null

  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useRef<MenuHighlightHandle | null>(null)

  // Attach / update / detach as the options change (same as the Vue `sync`).
  useIsomorphicLayoutEffect(() => {
    const list = el.current
    if (!list || !options) {
      handle.current?.destroy()
      handle.current = null
      return
    }
    if (handle.current) handle.current.update(options)
    else handle.current = attachTabsIndicator(list, options)
  }, [options])
  useIsomorphicLayoutEffect(
    () => () => {
      handle.current?.destroy()
      handle.current = null
    },
    [],
  )
  // After the attach effect above, so it sees the current handle.
  useImperativeHandle(goopRef, () => handle.current as MenuHighlightHandle)

  return (
    <ListContext.Provider value={blob ? BLOB : PLAIN}>
      <TabsPrimitive.List
        ref={composed}
        data-slot="tabs-list"
        data-variant={variant ?? undefined}
        data-goop-tabs={blob ? '' : undefined}
        className={cn(tabsListVariants({ variant }), className)}
        {...rest}
      />
    </ListContext.Provider>
  )
})
GoopTabsList.displayName = 'GoopTabsList'
const BLOB = { blob: true }
const PLAIN = { blob: false }

export type GoopTabsTriggerProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>

/**
 * Radix's TabsTrigger focuses itself from script on mousedown (`currentTarget.focus()`, for
 * Safari, where a clicked button doesn't take focus). Browsers treat that script focus as
 * keyboard-like, so `:focus-visible` matched and a mouse click showed shadcn's focus ring
 * (reka's trigger lets the click focus the button natively, so the Vue tabs never did). This
 * runs first (Radix composes the user's handler before its own) and focuses the trigger
 * with `focusVisible: false`, so Radix's own `focus()` finds it already focused and is a
 * no-op. Keyboard focus (Tab, arrow keys) is untouched and still shows the ring.
 */
function focusWithoutRing(event: MouseEvent<HTMLButtonElement>): void {
  const el = event.currentTarget
  if (event.button !== 0 || event.ctrlKey || el.disabled || el.ownerDocument.activeElement === el) return
  el.focus({ focusVisible: false } as FocusOptions)
}

export const GoopTabsTrigger = forwardRef<HTMLButtonElement, GoopTabsTriggerProps>(function GoopTabsTrigger({ className, onMouseDown, ...props }, ref) {
  const list = useContext(ListContext)
  const cue = useGoopCue('tabsTrigger')
  // Radix always points aria-controls at a panel id; a tab list without panels (a segmented
  // control) would reference nothing. Like reka-ui, only name a panel that is there.
  const root = useContext(ValueContext)
  const noPanel = root && !root.panels.has(props.value) ? { 'aria-controls': undefined } : null
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(...(list?.blob ? tabsTriggerGooClass : tabsTriggerClass), className)}
      {...cue}
      {...noPanel}
      {...props}
      onMouseDown={(event) => {
        onMouseDown?.(event)
        if (!event.defaultPrevented) focusWithoutRing(event)
      }}
    />
  )
})
GoopTabsTrigger.displayName = 'GoopTabsTrigger'

export type GoopTabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content>

export const GoopTabsContent = forwardRef<HTMLDivElement, GoopTabsContentProps>(function GoopTabsContent(
  { className, forceMount, children, ...props },
  ref,
) {
  const root = useContext(ValueContext)
  const add = root?.addPanel
  useIsomorphicLayoutEffect(() => add?.(props.value), [add, props.value])
  if (!root) return <TabsPrimitive.Content ref={ref} data-slot="tabs-content" className={cn(TABS_CONTENT, className)} forceMount={forceMount} {...props}>{children}</TabsPrimitive.Content>
  // Like reka-ui (GoopTabs in Vue): every panel element stays in the DOM, `hidden` while
  // inactive, so each trigger's aria-controls points at a real element; an inactive panel's
  // children still unmount unless `forceMount`.
  const selected = root.value === props.value
  return (
    <TabsPrimitive.Content ref={ref} data-slot="tabs-content" className={cn(TABS_CONTENT, className)} forceMount hidden={!selected} {...props}>
      {selected || forceMount ? children : null}
    </TabsPrimitive.Content>
  )
})
GoopTabsContent.displayName = 'GoopTabsContent'

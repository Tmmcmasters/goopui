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
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { TABS_PROP_KEYS, splitProps, toTabsOptions, type GoopSoundProps, type GoopTabsProps } from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { TABS_CONTENT, TABS_ROOT, tabsListVariants, tabsTriggerClass, tabsTriggerGooClass, type TabsListVariants } from './variants'

/** Provided by GoopTabsList to its triggers: the goo indicator paints the active tab, so the
 *  triggers drop their flat active bg + shadow. */
const ListContext = createContext<{ blob: boolean } | null>(null)

export type GoopTabsRootProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Root> & GoopSoundProps

export const GoopTabs = forwardRef<HTMLDivElement, GoopTabsRootProps>(function GoopTabs(
  { className, orientation = 'horizontal', sound, ...props },
  ref,
) {
  const on = useGoopSound(sound)
  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <TabsPrimitive.Root
        ref={ref}
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        className={cn(TABS_ROOT, className)}
        {...props}
      />
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

export const GoopTabsTrigger = forwardRef<HTMLButtonElement, GoopTabsTriggerProps>(function GoopTabsTrigger({ className, ...props }, ref) {
  const list = useContext(ListContext)
  const cue = useGoopCue('tabsTrigger')
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      data-slot="tabs-trigger"
      className={cn(...(list?.blob ? tabsTriggerGooClass : tabsTriggerClass), className)}
      {...cue}
      {...props}
    />
  )
})
GoopTabsTrigger.displayName = 'GoopTabsTrigger'

export type GoopTabsContentProps = ComponentPropsWithoutRef<typeof TabsPrimitive.Content>

export const GoopTabsContent = forwardRef<HTMLDivElement, GoopTabsContentProps>(function GoopTabsContent({ className, ...props }, ref) {
  return <TabsPrimitive.Content ref={ref} data-slot="tabs-content" className={cn(TABS_CONTENT, className)} {...props} />
})
GoopTabsContent.displayName = 'GoopTabsContent'

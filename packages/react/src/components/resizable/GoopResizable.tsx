'use client'
// GoopResizablePanelGroup / GoopResizablePanel / GoopResizableHandle: shadcn/ui's Resizable
// (react-resizable-panels' Group / Panel / Separator, `orientation`, `defaultSize`, `withHandle`,
// `className` merge, radix-nova classes) whose handle grip is a goo bead: while dragged it
// swells a little and bulges toward the drag direction in a low, wide mound, and on release it
// wobbles back like jelly (core `attachResizableHandle` after hydration: one aria-hidden svg,
// painted overflow, no layout shift). Without `withHandle` the mound rises on the line under
// the pointer. Engine props set on the group are inherited by its handles; set on a handle they
// win. Panels are plain. Before mount, during SSR, under reduced motion or with `goo={false}`
// it is a plain shadcn handle. `ref` is the DOM node (react-resizable-panels' `elementRef`).
import { attachResizableHandle, RESIZABLE_GRIP_ATTR, type ResizableHandle } from '@goopui/core'
import { cn } from 'cn'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type Ref } from 'react'
import * as ResizablePrimitive from 'react-resizable-panels'
import { useGoopConfig } from '../../config'
import { RESIZABLE_PROP_KEYS, resolveResizableProps, splitProps, toResizableOptions, type GoopResizableProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import { RESIZABLE_HANDLE, RESIZABLE_HANDLE_GRIP, RESIZABLE_PANEL_GROUP } from './styles'

/** Provided by GoopResizablePanelGroup: its engine props, inherited by its handles. */
const GroupContext = createContext<GoopResizableProps | null>(null)

export type GoopResizablePanelGroupProps = Omit<ResizablePrimitive.GroupProps, keyof GoopResizableProps> & GoopResizableProps

export const GoopResizablePanelGroup = forwardRef<HTMLDivElement, GoopResizablePanelGroupProps>(function GoopResizablePanelGroup(allProps, ref) {
  const [engine, props] = splitProps(allProps, RESIZABLE_PROP_KEYS)
  const { className, elementRef, ...rest } = props
  const composed = useComposedRefs(ref, elementRef as Ref<HTMLDivElement> | undefined)
  const inherited = useStableValue(resolveResizableProps(engine))
  return (
    <GroupContext.Provider value={inherited}>
      <ResizablePrimitive.Group elementRef={composed} data-slot="resizable-panel-group" className={cn(RESIZABLE_PANEL_GROUP, className)} {...rest} />
    </GroupContext.Provider>
  )
})
GoopResizablePanelGroup.displayName = 'GoopResizablePanelGroup'

export type GoopResizablePanelProps = ResizablePrimitive.PanelProps

export const GoopResizablePanel = forwardRef<HTMLDivElement, GoopResizablePanelProps>(function GoopResizablePanel({ elementRef, ...props }, ref) {
  const composed = useComposedRefs(ref, elementRef as Ref<HTMLDivElement> | undefined)
  return <ResizablePrimitive.Panel elementRef={composed} data-slot="resizable-panel" {...props} />
})
GoopResizablePanel.displayName = 'GoopResizablePanel'

export type GoopResizableHandleProps = Omit<ResizablePrimitive.SeparatorProps, keyof GoopResizableProps> &
  GoopResizableProps & {
    /** Show the grip (nova's bar), the goo bead. */
    withHandle?: boolean
    /** Receives the live bead handle (null before mount / when off). */
    goopRef?: Ref<ResizableHandle>
  }

const gripAttrs = { [RESIZABLE_GRIP_ATTR]: '' }

export const GoopResizableHandle = forwardRef<HTMLDivElement, GoopResizableHandleProps>(function GoopResizableHandle(allProps, ref) {
  const [engine, props] = splitProps(allProps, RESIZABLE_PROP_KEYS)
  const { withHandle, className, goopRef, elementRef, children, ...rest } = props
  const group = useContext(GroupContext)
  const options = useStableValue(toResizableOptions(resolveResizableProps(engine, group), useGoopConfig()))
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el, elementRef as Ref<HTMLDivElement> | undefined)
  const handle = useAttached(el, attachResizableHandle, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as ResizableHandle, [handle])
  return (
    <ResizablePrimitive.Separator elementRef={composed} data-slot="resizable-handle" className={cn(RESIZABLE_HANDLE, className)} {...rest}>
      {withHandle ? (
        <div {...gripAttrs} className={RESIZABLE_HANDLE_GRIP}>
          {children}
        </div>
      ) : null}
    </ResizablePrimitive.Separator>
  )
})
GoopResizableHandle.displayName = 'GoopResizableHandle'

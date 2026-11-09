'use client'
// GoopScrollArea: shadcn/ui's ScrollArea (Radix ScrollArea Root / Viewport / Corner with one
// vertical GoopScrollBar, `type`, `dir`, `scrollHideDelay`, `className` merge, radix-nova
// classes) whose scrollbar thumb is a goo body: it stretches a little with the scroll speed and,
// pushed past an end, squashes against it and springs back with a small jelly wobble (core
// `attachScrollArea` after hydration: transforms on the thumb's body only, nothing shifts, the
// scroll size never changes and the stretch stays inside the track). Radix keeps all
// scrolling. Before mount, during SSR, or under reduced motion the thumb is still; with
// `goo={false}` it is a plain shadcn ScrollArea.
//
// GoopScrollBar: shadcn/ui's ScrollBar (`orientation`, `className` merge). Inside a
// GoopScrollArea with the goo on, its thumb's colour sits on a goo body (one span) that the
// root's engine moves; otherwise it is a plain shadcn thumb. Decided by props alone, so server
// and client markup match.
import { attachScrollArea, SCROLL_THUMB_ATTR, SCROLL_VIEWPORT_ATTR, type ScrollAreaHandle } from '@goopui/core'
import { cn } from 'cn'
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { SCROLL_AREA_PROP_KEYS, splitProps, toScrollAreaOptions, type GoopScrollAreaProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useStableValue } from '../../utils'
import {
  SCROLL_AREA,
  SCROLL_AREA_SCROLLBAR,
  SCROLL_AREA_THUMB,
  SCROLL_AREA_THUMB_BODY,
  SCROLL_AREA_THUMB_GOO,
  SCROLL_AREA_VIEWPORT,
} from './styles'

/** Provided by GoopScrollArea: whether its thumbs get a goo body. */
const GooContext = createContext(false)

export type GoopScrollAreaRootProps = Omit<ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>, keyof GoopScrollAreaProps> &
  GoopScrollAreaProps & {
    /** Receives the live thumb handle (null before mount / when off). */
    goopRef?: Ref<ScrollAreaHandle>
  }

const viewportAttrs = { [SCROLL_VIEWPORT_ATTR]: '' }
const bodyAttrs = { [SCROLL_THUMB_ATTR]: '' }

export const GoopScrollArea = forwardRef<HTMLDivElement, GoopScrollAreaRootProps>(function GoopScrollArea(allProps, ref) {
  const [engine, props] = splitProps(allProps, SCROLL_AREA_PROP_KEYS)
  const { className, children, goopRef, ...rest } = props
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const options = useStableValue(toScrollAreaOptions(engine, useGoopConfig()))
  const handle = useAttached(el, attachScrollArea, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as ScrollAreaHandle, [handle])
  const goo = engine.goo !== false
  return (
    <GooContext.Provider value={goo}>
      <ScrollAreaPrimitive.Root
        ref={composed}
        data-slot="scroll-area"
        data-goop-host={goo ? 'scroll-area' : undefined}
        className={cn(SCROLL_AREA, className)}
        {...rest}
      >
        <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" {...viewportAttrs} className={SCROLL_AREA_VIEWPORT}>
          {children}
        </ScrollAreaPrimitive.Viewport>
        <GoopScrollBar />
        <ScrollAreaPrimitive.Corner />
      </ScrollAreaPrimitive.Root>
    </GooContext.Provider>
  )
})
GoopScrollArea.displayName = 'GoopScrollArea'

export type GoopScrollBarProps = ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>

export const GoopScrollBar = forwardRef<HTMLDivElement, GoopScrollBarProps>(function GoopScrollBar(
  { className, orientation = 'vertical', ...props },
  ref,
) {
  const goo = useContext(GooContext)
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      ref={ref}
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(SCROLL_AREA_SCROLLBAR, className)}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb data-slot="scroll-area-thumb" className={goo ? SCROLL_AREA_THUMB_GOO : SCROLL_AREA_THUMB}>
        {goo ? <span data-slot="scroll-area-thumb-body" aria-hidden="true" {...bodyAttrs} className={SCROLL_AREA_THUMB_BODY} /> : null}
      </ScrollAreaPrimitive.ScrollAreaThumb>
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
})
GoopScrollBar.displayName = 'GoopScrollBar'

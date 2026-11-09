'use client'
// GoopEmpty: shadcn/ui's Empty (a div, `className` merge). Engine props set here (goo, puddle,
// breathe, speed, preset) are inherited by GoopEmptyMedia, where the goo puddle lives.
//
// GoopEmptyMedia: shadcn/ui's EmptyMedia (data-slot="empty-icon", `variant` default | icon,
// `className` merge). The media sits in a low, wide goo puddle of the muted tone whose middle
// rises to meet it, breathing very slowly (~1px) (core `attachEmptyPuddle` after hydration: one
// aria-hidden svg, a CSS animation, no frame loop). Ink overflow only: no layout shift, no
// scroll growth. Its own engine props win over GoopEmpty's. Before mount, during SSR, or with
// `goo={false}` it is a plain shadcn EmptyMedia. Reduced motion: a static puddle.
// The other parts are server-safe (./parts).
import { attachEmptyPuddle, type EmptyPuddleHandle } from '@goopui/core'
import { cn } from 'cn'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { EMPTY_PROP_KEYS, resolveEmptyProps, splitProps, toEmptyOptions, type GoopEmptyProps } from '../../goop-props'
import { useAttached } from '../../use-goop'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { EMPTY, emptyMediaVariants, type EmptyMediaVariants } from './variants'

/** Provided by GoopEmpty: its engine props, inherited by GoopEmptyMedia. */
const RootContext = createContext<GoopEmptyProps | null>(null)

export type GoopEmptyRootProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopEmptyProps> & GoopEmptyProps

export const GoopEmpty = forwardRef<HTMLDivElement, GoopEmptyRootProps>(function GoopEmpty(allProps, ref) {
  const [engine, props] = splitProps(allProps, EMPTY_PROP_KEYS)
  const { className, ...rest } = props
  const inherited = useStableValue(resolveEmptyProps(engine))
  return (
    <RootContext.Provider value={inherited}>
      <div ref={ref} data-slot="empty" className={cn(EMPTY, className)} {...rest} />
    </RootContext.Provider>
  )
})
GoopEmpty.displayName = 'GoopEmpty'

export type GoopEmptyMediaProps = Omit<ComponentPropsWithoutRef<'div'>, keyof GoopEmptyProps> &
  GoopEmptyProps &
  EmptyMediaVariants & {
    /** Receives the live puddle handle (null before mount / when off). */
    goopRef?: Ref<EmptyPuddleHandle>
  }

export const GoopEmptyMedia = forwardRef<HTMLDivElement, GoopEmptyMediaProps>(function GoopEmptyMedia(allProps, ref) {
  const [engine, props] = splitProps(allProps, EMPTY_PROP_KEYS)
  const { className, variant = 'default', goopRef, ...rest } = props
  const root = useContext(RootContext)
  const options = useStableValue(toEmptyOptions(resolveEmptyProps(engine, root), useGoopConfig()))
  const el = useRef<HTMLDivElement | null>(null)
  const composed = useComposedRefs(ref, el)
  const handle = useAttached(el, attachEmptyPuddle, options ?? {}, options !== null)
  useImperativeHandle(goopRef, () => handle as EmptyPuddleHandle, [handle])

  // The puddle's tone follows the variant's background.
  const first = useRef(true)
  useIsomorphicLayoutEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    handle?.refresh()
  }, [variant])

  return <div ref={composed} data-slot="empty-icon" data-variant={variant} className={cn(emptyMediaVariants({ variant }), className)} {...rest} />
})
GoopEmptyMedia.displayName = 'GoopEmptyMedia'

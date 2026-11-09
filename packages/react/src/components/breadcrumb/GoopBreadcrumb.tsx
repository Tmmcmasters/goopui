'use client'
// GoopBreadcrumb: shadcn/ui's Breadcrumb. GoopBreadcrumb (a <nav aria-label="breadcrumb">)
// holds the engine props (goo, highlight, wobble, momentum, followPointer, speed, preset,
// renderer); GoopBreadcrumbList (an <ol>) inherits them (its own win) and makes its links'
// hover / keyboard-focus highlight ONE goo blob (core `attachBreadcrumbHighlight` after
// hydration, the menu highlight engine with a calm feel and a pointer swell). It flows from
// link to link as the pointer moves along the trail and fades out when it leaves. The blob is
// aria-hidden, behind the real links. Under the blob GoopBreadcrumbLink gets a little padding
// for it, given back with equal negative margins (no layout shift). Reduced motion: the blob
// snaps. SSR renders shadcn markup. Item, Page, Separator and Ellipsis are server-safe (./parts).
import { attachBreadcrumbHighlight, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import { BREADCRUMB_PROP_KEYS, resolveBreadcrumbProps, splitProps, toBreadcrumbOptions, type GoopBreadcrumbProps } from '../../goop-props'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { BREADCRUMB_LINK, BREADCRUMB_LIST, goopBreadcrumbLink } from './styles'

/** Provided by GoopBreadcrumb: its engine props, inherited by the list. */
const RootContext = createContext<GoopBreadcrumbProps | null>(null)
/** Provided by GoopBreadcrumbList: whether the goo blob lights its links. */
const BlobContext = createContext(false)

export type GoopBreadcrumbRootProps = Omit<ComponentPropsWithoutRef<'nav'>, keyof GoopBreadcrumbProps> & GoopBreadcrumbProps

export const GoopBreadcrumb = forwardRef<HTMLElement, GoopBreadcrumbRootProps>(function GoopBreadcrumb(allProps, ref) {
  const [engine, props] = splitProps(allProps, BREADCRUMB_PROP_KEYS)
  const { className, ...rest } = props
  const inherited = useStableValue(resolveBreadcrumbProps(engine))
  return (
    <RootContext.Provider value={inherited}>
      <nav ref={ref} aria-label="breadcrumb" data-slot="breadcrumb" className={cn(className)} {...rest} />
    </RootContext.Provider>
  )
})
GoopBreadcrumb.displayName = 'GoopBreadcrumb'

export type GoopBreadcrumbListProps = Omit<ComponentPropsWithoutRef<'ol'>, keyof GoopBreadcrumbProps> &
  GoopBreadcrumbProps & {
    /** Receives the live highlight handle (null before mount / when the blob is off). */
    goopRef?: Ref<MenuHighlightHandle>
  }

export const GoopBreadcrumbList = forwardRef<HTMLOListElement, GoopBreadcrumbListProps>(function GoopBreadcrumbList(allProps, ref) {
  const [engine, props] = splitProps(allProps, BREADCRUMB_PROP_KEYS)
  const { className, goopRef, ...rest } = props
  const root = useContext(RootContext)
  const options = useStableValue(toBreadcrumbOptions(resolveBreadcrumbProps(engine, root), useGoopConfig()))
  const blob = options !== null

  const el = useRef<HTMLOListElement | null>(null)
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
    else handle.current = attachBreadcrumbHighlight(list, options)
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
    <BlobContext.Provider value={blob}>
      <ol ref={composed} data-slot="breadcrumb-list" data-goop-breadcrumb={blob ? '' : undefined} className={cn(BREADCRUMB_LIST, className)} {...rest} />
    </BlobContext.Provider>
  )
})
GoopBreadcrumbList.displayName = 'GoopBreadcrumbList'

export type GoopBreadcrumbLinkProps = ComponentPropsWithoutRef<'a'> & {
  /** Render the single child instead (e.g. your router's Link), merging classes and props onto it (Radix Slot). */
  asChild?: boolean
}

export const GoopBreadcrumbLink = forwardRef<HTMLAnchorElement, GoopBreadcrumbLinkProps>(function GoopBreadcrumbLink(
  { asChild = false, className, ...props },
  ref,
) {
  const blob = useContext(BlobContext)
  const Comp = asChild ? Slot.Root : 'a'
  return <Comp ref={ref} data-slot="breadcrumb-link" className={cn(BREADCRUMB_LINK, blob && goopBreadcrumbLink, className)} {...props} />
})
GoopBreadcrumbLink.displayName = 'GoopBreadcrumbLink'

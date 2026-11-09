'use client'
// GoopPagination: shadcn/ui's Pagination (plain markup, links you drive with `isActive`).
// Engine props set on GoopPagination (goo, indicator, wobble, momentum, press, speed, preset,
// renderer) are inherited by every part; a part's own prop wins there. `goo={false}` renders
// plain shadcn Pagination parts.
//
// GoopPaginationContent (the <ul>) makes the current page ONE goo blob (core
// `attachPaginationIndicator` after hydration, the Tabs indicator fed PAGINATION_FEEL): it
// slides between page numbers with momentum and a gentle stretch, also across jumps of several
// pages, and lands with a jelly overshoot. It follows the GoopPaginationLink with `isActive`.
// The blob is aria-hidden, behind the real links. Reduced motion: the blob snaps. SSR renders
// shadcn markup, and goop.css styles the current page until the blob attaches.
// GoopPaginationPrevious / Next (and the goopUI extras First / Last, as in @goopui/vue) are
// ghost GoopButtons (asChild on the link), so they press-squish and get the ghost hover goo.
import { attachPaginationIndicator, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { createContext, forwardRef, useContext, useImperativeHandle, useRef, type ComponentPropsWithoutRef, type Ref } from 'react'
import { useGoopConfig } from '../../config'
import {
  PAGINATION_BUTTON_PROP_KEYS,
  PAGINATION_PROP_KEYS,
  resolvePaginationProps,
  splitProps,
  toPaginationButtonProps,
  toPaginationOptions,
  type GoopPaginationButtonProps,
  type GoopPaginationProps,
  type GoopSoundProps,
} from '../../goop-props'
import { GoopSoundScope, useGoopCue, useGoopSound } from '../../sound'
import { useComposedRefs, useIsomorphicLayoutEffect, useStableValue } from '../../utils'
import { GoopButton } from '../button/GoopButton'
import type { ButtonSize } from '../button/variants'
import { PAGINATION, PAGINATION_CONTENT, PAGINATION_ELLIPSIS, paginationItemClass } from './variants'

/** Provided by GoopPagination: its engine props, inherited by every part. */
const RootContext = createContext<GoopPaginationProps | null>(null)
/** Provided by GoopPaginationContent: the goo blob paints the current page, so the links drop
 *  shadcn's outline look. */
const BlobContext = createContext(false)

const svg = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

export type GoopPaginationRootProps = Omit<ComponentPropsWithoutRef<'nav'>, keyof GoopPaginationProps> & GoopPaginationProps & GoopSoundProps

export const GoopPagination = forwardRef<HTMLElement, GoopPaginationRootProps>(function GoopPagination(allProps, ref) {
  const [engine, props] = splitProps(allProps, PAGINATION_PROP_KEYS)
  const { className, sound, ...rest } = props
  const on = useGoopSound(sound)
  const inherited = useStableValue(resolvePaginationProps(engine))
  return (
    <GoopSoundScope sound={sound === undefined ? undefined : on}>
      <RootContext.Provider value={inherited}>
        <nav ref={ref} role="navigation" aria-label="pagination" data-slot="pagination" className={cn(PAGINATION, className)} {...rest} />
      </RootContext.Provider>
    </GoopSoundScope>
  )
})
GoopPagination.displayName = 'GoopPagination'

export type GoopPaginationContentProps = Omit<ComponentPropsWithoutRef<'ul'>, keyof GoopPaginationProps> &
  GoopPaginationProps & {
    /** Receives the live blob handle (null before mount / when the goo blob is off). */
    goopRef?: Ref<MenuHighlightHandle>
  }

export const GoopPaginationContent = forwardRef<HTMLUListElement, GoopPaginationContentProps>(function GoopPaginationContent(allProps, ref) {
  const [engine, props] = splitProps(allProps, PAGINATION_PROP_KEYS)
  const { className, goopRef, ...rest } = props
  const root = useContext(RootContext)
  const options = useStableValue(toPaginationOptions(resolvePaginationProps(engine, root), useGoopConfig()))
  const blob = options !== null

  const el = useRef<HTMLUListElement | null>(null)
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
    else handle.current = attachPaginationIndicator(list, options)
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
      <ul ref={composed} data-slot="pagination-content" data-goop-pagination={blob ? '' : undefined} className={cn(PAGINATION_CONTENT, className)} {...rest} />
    </BlobContext.Provider>
  )
})
GoopPaginationContent.displayName = 'GoopPaginationContent'

export type GoopPaginationItemProps = ComponentPropsWithoutRef<'li'>

export const GoopPaginationItem = forwardRef<HTMLLIElement, GoopPaginationItemProps>(function GoopPaginationItem(props, ref) {
  return <li ref={ref} data-slot="pagination-item" {...props} />
})
GoopPaginationItem.displayName = 'GoopPaginationItem'

export type GoopPaginationLinkProps = ComponentPropsWithoutRef<'a'> & {
  /** The current page (shadcn's outline look; under the goo, the blob sits on it). */
  isActive?: boolean
  /** A Button size. Default 'icon'. */
  size?: ButtonSize
}

/** A page link. Inside a GoopPaginationContent with the goo blob on, the active link's outline
 *  look is the blob. */
export const GoopPaginationLink = forwardRef<HTMLAnchorElement, GoopPaginationLinkProps>(function GoopPaginationLink(
  { className, isActive, size = 'icon', ...props },
  ref,
) {
  const blob = useContext(BlobContext)
  const cue = useGoopCue('paginationItem')
  return (
    <a
      ref={ref}
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(paginationItemClass(isActive === true, size, blob), className)}
      {...cue}
      {...props}
    />
  )
})
GoopPaginationLink.displayName = 'GoopPaginationLink'

export type GoopPaginationPreviousProps = Omit<ComponentPropsWithoutRef<'a'>, keyof GoopPaginationButtonProps> &
  GoopPaginationButtonProps & {
    /** The label (hidden below `sm`). Default 'Previous' / 'Next' / 'First' / 'Last'. */
    text?: string
    /** A Button size. Default 'default'. */
    size?: ButtonSize
  }
export type GoopPaginationNextProps = GoopPaginationPreviousProps
export type GoopPaginationFirstProps = GoopPaginationPreviousProps
export type GoopPaginationLastProps = GoopPaginationPreviousProps

/** The chevrons shadcn takes from lucide (`chevron-left`, `chevrons-left`, ...). */
const CHEVRON_PATHS = {
  first: ['m11 17-5-5 5-5', 'm18 17-5-5 5-5'],
  previous: ['m15 18-6-6 6-6'],
  next: ['m9 18 6-6-6-6'],
  last: ['m6 17 5-5-5-5', 'm13 17 5-5-5-5'],
} as const

/**
 * Previous / Next (shadcn/ui's) and First / Last (goopUI extras, as in @goopui/vue): shadcn's
 * PaginationLink with a chevron, rendered as a ghost GoopButton (asChild on the link) so it
 * press-squishes. Engine props (goo, press, speed, preset, renderer) inherit GoopPagination's.
 */
function buttonPart(kind: keyof typeof CHEVRON_PATHS, label: string, aria: string, pad: string, name: string) {
  const end = kind === 'next' || kind === 'last'
  const flip = kind === 'next' || kind === 'previous' ? 'cn-rtl-flip' : undefined
  const C = forwardRef<HTMLAnchorElement, GoopPaginationPreviousProps>(function PaginationButton(allProps, ref) {
    const [engine, props] = splitProps(allProps, PAGINATION_BUTTON_PROP_KEYS)
    const root = useContext(RootContext)
    const button = toPaginationButtonProps(resolvePaginationProps(engine, root))
    const { className, text = label, size = 'default', children, ...rest } = props
    const icon = (
      <svg {...svg} data-icon={end ? 'inline-end' : 'inline-start'} className={flip}>
        {CHEVRON_PATHS[kind].map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    )
    const span = <span className="hidden sm:block">{text}</span>
    return (
      <GoopButton asChild variant="ghost" size={size} className={cn(pad, className)} {...button}>
        <a ref={ref} aria-label={aria} data-slot="pagination-link" {...rest}>
          {children ?? (end ? <>{span}{icon}</> : <>{icon}{span}</>)}
        </a>
      </GoopButton>
    )
  })
  C.displayName = name
  return C
}

export const GoopPaginationPrevious = buttonPart('previous', 'Previous', 'Go to previous page', 'pl-1.5!', 'GoopPaginationPrevious')
export const GoopPaginationNext = buttonPart('next', 'Next', 'Go to next page', 'pr-1.5!', 'GoopPaginationNext')
export const GoopPaginationFirst = buttonPart('first', 'First', 'Go to first page', '', 'GoopPaginationFirst')
export const GoopPaginationLast = buttonPart('last', 'Last', 'Go to last page', '', 'GoopPaginationLast')

export type GoopPaginationEllipsisProps = ComponentPropsWithoutRef<'span'>

export const GoopPaginationEllipsis = forwardRef<HTMLSpanElement, GoopPaginationEllipsisProps>(function GoopPaginationEllipsis(
  { className, children, ...props },
  ref,
) {
  return (
    <span ref={ref} aria-hidden data-slot="pagination-ellipsis" className={cn(PAGINATION_ELLIPSIS, className)} {...props}>
      {children ?? (
        <svg {...svg}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      )}
      <span className="sr-only">More pages</span>
    </span>
  )
})
GoopPaginationEllipsis.displayName = 'GoopPaginationEllipsis'

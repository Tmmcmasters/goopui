// GoopBreadcrumb's plain parts: shadcn/ui's BreadcrumbItem, BreadcrumbPage, BreadcrumbSeparator
// (lucide's chevron-right, inlined) and BreadcrumbEllipsis (lucide's more-horizontal,
// inlined). No goo and no hooks, so this module has no 'use client': the parts render in React
// Server Components as they are.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { BREADCRUMB_ELLIPSIS, BREADCRUMB_ITEM, BREADCRUMB_PAGE, BREADCRUMB_SEPARATOR } from './styles'

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

export type GoopBreadcrumbItemProps = ComponentPropsWithoutRef<'li'>
export const GoopBreadcrumbItem = forwardRef<HTMLLIElement, GoopBreadcrumbItemProps>(function GoopBreadcrumbItem({ className, ...props }, ref) {
  return <li ref={ref} data-slot="breadcrumb-item" className={cn(BREADCRUMB_ITEM, className)} {...props} />
})
GoopBreadcrumbItem.displayName = 'GoopBreadcrumbItem'

export type GoopBreadcrumbPageProps = ComponentPropsWithoutRef<'span'>
export const GoopBreadcrumbPage = forwardRef<HTMLSpanElement, GoopBreadcrumbPageProps>(function GoopBreadcrumbPage({ className, ...props }, ref) {
  return <span ref={ref} data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" className={cn(BREADCRUMB_PAGE, className)} {...props} />
})
GoopBreadcrumbPage.displayName = 'GoopBreadcrumbPage'

export type GoopBreadcrumbSeparatorProps = ComponentPropsWithoutRef<'li'>
export const GoopBreadcrumbSeparator = forwardRef<HTMLLIElement, GoopBreadcrumbSeparatorProps>(function GoopBreadcrumbSeparator(
  { children, className, ...props },
  ref,
) {
  return (
    <li ref={ref} data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" className={cn(BREADCRUMB_SEPARATOR, className)} {...props}>
      {children ?? (
        <svg {...svg} className="cn-rtl-flip">
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </li>
  )
})
GoopBreadcrumbSeparator.displayName = 'GoopBreadcrumbSeparator'

export type GoopBreadcrumbEllipsisProps = ComponentPropsWithoutRef<'span'>
export const GoopBreadcrumbEllipsis = forwardRef<HTMLSpanElement, GoopBreadcrumbEllipsisProps>(function GoopBreadcrumbEllipsis(
  { children, className, ...props },
  ref,
) {
  return (
    <span ref={ref} data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" className={cn(BREADCRUMB_ELLIPSIS, className)} {...props}>
      {children ?? (
        <svg {...svg}>
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
          <circle cx="5" cy="12" r="1" />
        </svg>
      )}
      <span className="sr-only">More</span>
    </span>
  )
})
GoopBreadcrumbEllipsis.displayName = 'GoopBreadcrumbEllipsis'

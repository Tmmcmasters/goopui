// GoopEmpty's plain parts: shadcn/ui's EmptyHeader, EmptyTitle, EmptyDescription and
// EmptyContent. No goo and no hooks, so this module has no 'use client': the parts render in
// React Server Components as they are.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { EMPTY_CONTENT, EMPTY_DESCRIPTION, EMPTY_HEADER, EMPTY_TITLE } from './variants'

type DivProps = ComponentPropsWithoutRef<'div'>

function part(slot: string, base: string, name: string) {
  const C = forwardRef<HTMLDivElement, DivProps>(function EmptyPart({ className, ...props }, ref) {
    return <div ref={ref} data-slot={slot} className={cn(base, className)} {...props} />
  })
  C.displayName = name
  return C
}

export type GoopEmptyHeaderProps = DivProps
export type GoopEmptyTitleProps = DivProps
export type GoopEmptyContentProps = DivProps
export type GoopEmptyDescriptionProps = ComponentPropsWithoutRef<'p'>

export const GoopEmptyHeader = part('empty-header', EMPTY_HEADER, 'GoopEmptyHeader')
export const GoopEmptyTitle = part('empty-title', EMPTY_TITLE, 'GoopEmptyTitle')
export const GoopEmptyContent = part('empty-content', EMPTY_CONTENT, 'GoopEmptyContent')

export const GoopEmptyDescription = forwardRef<HTMLParagraphElement, GoopEmptyDescriptionProps>(function GoopEmptyDescription({ className, ...props }, ref) {
  return <p ref={ref} data-slot="empty-description" className={cn(EMPTY_DESCRIPTION, className)} {...props} />
})
GoopEmptyDescription.displayName = 'GoopEmptyDescription'

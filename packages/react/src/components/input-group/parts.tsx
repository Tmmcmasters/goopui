// shadcn/ui's InputGroupText (a <span>, `className` merge). Plain: no hooks, so no 'use client'.
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { INPUT_GROUP_TEXT } from './styles'

export type GoopInputGroupTextProps = ComponentPropsWithoutRef<'span'>

export const GoopInputGroupText = forwardRef<HTMLSpanElement, GoopInputGroupTextProps>(function GoopInputGroupText({ className, ...props }, ref) {
  return <span ref={ref} className={cn(INPUT_GROUP_TEXT, className)} {...props} />
})
GoopInputGroupText.displayName = 'GoopInputGroupText'

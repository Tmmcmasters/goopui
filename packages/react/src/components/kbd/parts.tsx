// GoopKbdGroup: shadcn/ui's KbdGroup (a <kbd>, `className` merge). Plain: no goo and no hooks,
// so no 'use client' (renders in React Server Components as it is).
import { cn } from 'cn'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { KBD_GROUP } from './styles'

export type GoopKbdGroupProps = ComponentPropsWithoutRef<'kbd'>

export const GoopKbdGroup = forwardRef<HTMLElement, GoopKbdGroupProps>(function GoopKbdGroup({ className, ...props }, ref) {
  return <kbd ref={ref} data-slot="kbd-group" className={cn(KBD_GROUP, className)} {...props} />
})
GoopKbdGroup.displayName = 'GoopKbdGroup'

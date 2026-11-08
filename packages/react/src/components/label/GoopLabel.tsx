// GoopLabel: shadcn/ui's Label (Radix Label), a plain port with no goo (like @goopui/vue's).
// No hooks, so no 'use client': it renders in React Server Components, and Radix's own module
// is the client boundary.
import { cn } from 'cn'
import { Label as LabelPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { LABEL } from './styles'

export type GoopLabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>

export const GoopLabel = forwardRef<HTMLLabelElement, GoopLabelProps>(function GoopLabel({ className, ...props }, ref) {
  return <LabelPrimitive.Root ref={ref} data-slot="label" className={cn(LABEL, className)} {...props} />
})
GoopLabel.displayName = 'GoopLabel'

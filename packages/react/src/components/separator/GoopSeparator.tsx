// GoopSeparator: shadcn/ui's Separator (Radix Separator), a plain port with no goo (like
// @goopui/vue's). No hooks, so no 'use client': it renders in React Server Components, and
// Radix's own module is the client boundary.
import { cn } from 'cn'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { SEPARATOR } from './styles'

export type GoopSeparatorProps = ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>

export const GoopSeparator = forwardRef<HTMLDivElement, GoopSeparatorProps>(function GoopSeparator(
  { className, orientation = 'horizontal', decorative = true, ...props },
  ref,
) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(SEPARATOR, className)}
      {...props}
    />
  )
})
GoopSeparator.displayName = 'GoopSeparator'

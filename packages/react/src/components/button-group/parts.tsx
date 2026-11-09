// GoopButtonGroup's plain parts: shadcn/ui's ButtonGroupSeparator (Radix Separator with
// shadcn's Separator classes, vertical by default) and ButtonGroupText (`asChild` via Radix
// Slot). No goo and no hooks, so this module has no 'use client' (Radix's own module is the
// client boundary); they render in React Server Components as they are. The text flexes with
// the group's tug.
import { cn } from 'cn'
import { Separator as SeparatorPrimitive, Slot } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { SEPARATOR } from '../separator/styles'
import { BUTTON_GROUP_SEPARATOR, BUTTON_GROUP_TEXT } from './variants'

export type GoopButtonGroupSeparatorProps = ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>

export const GoopButtonGroupSeparator = forwardRef<HTMLDivElement, GoopButtonGroupSeparatorProps>(function GoopButtonGroupSeparator(
  { className, orientation = 'vertical', decorative = true, ...props },
  ref,
) {
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      data-slot="button-group-separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(SEPARATOR, BUTTON_GROUP_SEPARATOR, className)}
      {...props}
    />
  )
})
GoopButtonGroupSeparator.displayName = 'GoopButtonGroupSeparator'

export type GoopButtonGroupTextProps = ComponentPropsWithoutRef<'div'> & {
  /** Render the single child instead, merging classes and props onto it (Radix Slot). */
  asChild?: boolean
}

export const GoopButtonGroupText = forwardRef<HTMLDivElement, GoopButtonGroupTextProps>(function GoopButtonGroupText(
  { className, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'div'
  return <Comp ref={ref} className={cn(BUTTON_GROUP_TEXT, className)} {...props} />
})
GoopButtonGroupText.displayName = 'GoopButtonGroupText'

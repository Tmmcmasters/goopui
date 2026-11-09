'use client'
// GoopAspectRatio: shadcn/ui's AspectRatio (Radix AspectRatio, `ratio`), a plain port with no
// goo (like @goopui/vue's): it only sizes a box, so goo there would be noise. Put goo
// components inside it instead. 'use client' as in shadcn/ui's own file.
import { AspectRatio as AspectRatioPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'

export type GoopAspectRatioProps = ComponentPropsWithoutRef<typeof AspectRatioPrimitive.Root>

export const GoopAspectRatio = forwardRef<HTMLDivElement, GoopAspectRatioProps>(function GoopAspectRatio(props, ref) {
  return <AspectRatioPrimitive.Root ref={ref} data-slot="aspect-ratio" {...props} />
})
GoopAspectRatio.displayName = 'GoopAspectRatio'

// shadcn/ui's Empty classes (React, style `radix-nova`; shadcn-vue's reka-nova is the same),
// verbatim.
import { cva, type VariantProps } from 'class-variance-authority'

export const EMPTY = 'flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-4 rounded-xl border-dashed p-6 text-center text-balance'
export const EMPTY_HEADER = 'flex max-w-sm flex-col items-center gap-2'
export const EMPTY_TITLE = 'cn-font-heading text-sm font-medium tracking-tight'
export const EMPTY_DESCRIPTION = 'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary'
export const EMPTY_CONTENT = 'flex w-full max-w-sm min-w-0 flex-col items-center gap-2.5 text-sm text-balance'

export const emptyMediaVariants = cva('mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0', {
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: "flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4",
    },
  },
  defaultVariants: { variant: 'default' },
})

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>

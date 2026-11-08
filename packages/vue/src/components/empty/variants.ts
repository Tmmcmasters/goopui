// shadcn-vue's Empty classes (reka-nova), verbatim.
import { cva, type VariantProps } from 'class-variance-authority'

export const EMPTY = 'gap-4 rounded-xl border-dashed p-6 flex w-full min-w-0 flex-1 flex-col items-center justify-center text-center text-balance'
export const EMPTY_HEADER = 'gap-2 flex max-w-sm flex-col items-center'
export const EMPTY_TITLE = 'text-sm font-medium tracking-tight cn-font-heading'
export const EMPTY_DESCRIPTION = 'text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary'
export const EMPTY_CONTENT = 'gap-2.5 text-sm flex w-full max-w-sm min-w-0 flex-col items-center text-balance'

export const emptyMediaVariants = cva('mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0', {
  variants: {
    variant: {
      default: 'bg-transparent',
      icon: 'bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*=size-])]:size-4',
    },
  },
  defaultVariants: { variant: 'default' },
})

export type EmptyMediaVariants = VariantProps<typeof emptyMediaVariants>

// shadcn/ui's ButtonGroup classes (React, style `radix-nova`), verbatim. shadcn's
// `data-horizontal:` / `data-vertical:` are spelled out as the `data-orientation` reka emits.
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonGroupVariants = cva(
  "group/button-group flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg!',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg!',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
)

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>

export const BUTTON_GROUP_SEPARATOR =
  'relative self-stretch bg-input data-[orientation=horizontal]:mx-px data-[orientation=horizontal]:w-auto data-[orientation=vertical]:my-px data-[orientation=vertical]:h-auto'
export const BUTTON_GROUP_TEXT =
  "flex items-center gap-2 rounded-lg border bg-muted px-2.5 text-sm font-medium [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4"

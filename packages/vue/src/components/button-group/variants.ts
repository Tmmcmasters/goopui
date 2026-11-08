// shadcn-vue's ButtonGroup classes (reka-nova), verbatim.
import { cva, type VariantProps } from 'class-variance-authority'

export const buttonGroupVariants = cva(
  "has-[>[data-slot=button-group]]:gap-2 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-lg flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-lg! [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          '[&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-lg! flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: { orientation: 'horizontal' },
  },
)

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>

export const BUTTON_GROUP_SEPARATOR =
  'bg-input relative self-stretch data-horizontal:mx-px data-horizontal:w-auto data-vertical:my-px data-vertical:h-auto'
export const BUTTON_GROUP_TEXT =
  'bg-muted gap-2 rounded-lg border px-2.5 text-sm font-medium [&_svg:not([class*=size-])]:size-4 flex items-center [&_svg]:pointer-events-none'

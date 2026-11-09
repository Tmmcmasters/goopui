// shadcn/ui's Item classes (React, style `radix-nova`; same set as @goopui/vue), verbatim.
import { cva, type VariantProps } from 'class-variance-authority'

export const itemVariants = cva(
  'group/item flex w-full flex-wrap items-center rounded-lg border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-muted',
  {
    variants: {
      variant: {
        default: 'border-transparent',
        outline: 'border-border',
        muted: 'border-transparent bg-muted/50',
      },
      size: {
        default: 'gap-2.5 px-3 py-2.5',
        sm: 'gap-2.5 px-3 py-2.5',
        xs: 'gap-2 px-2.5 py-2 in-data-[slot=dropdown-menu-content]:p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export const itemMediaVariants = cva(
  'flex shrink-0 items-center justify-center gap-2 group-has-data-[slot=item-description]/item:translate-y-0.5 group-has-data-[slot=item-description]/item:self-start [&_svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        icon: "[&_svg:not([class*='size-'])]:size-4",
        image: 'size-10 overflow-hidden rounded-sm group-data-[size=sm]/item:size-8 group-data-[size=xs]/item:size-6 [&_img]:size-full [&_img]:object-cover',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type ItemVariants = VariantProps<typeof itemVariants>
export type ItemVariant = NonNullable<ItemVariants['variant']>
export type ItemSize = NonNullable<ItemVariants['size']>
export type ItemMediaVariants = VariantProps<typeof itemMediaVariants>
export type ItemMediaVariant = NonNullable<ItemMediaVariants['variant']>

export const ITEM_GROUP = 'group/item-group flex w-full flex-col gap-4 has-data-[size=sm]:gap-2.5 has-data-[size=xs]:gap-2'
export const ITEM_SEPARATOR = 'my-2'
export const ITEM_CONTENT = 'flex flex-1 flex-col gap-1 group-data-[size=xs]/item:gap-0 [&+[data-slot=item-content]]:flex-none'
export const ITEM_TITLE = 'line-clamp-1 flex w-fit items-center gap-2 text-sm leading-snug font-medium underline-offset-4'
export const ITEM_DESCRIPTION =
  'line-clamp-2 text-left text-sm leading-normal font-normal text-muted-foreground group-data-[size=xs]/item:text-xs [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary'
export const ITEM_ACTIONS = 'flex items-center gap-2'
export const ITEM_HEADER = 'flex basis-full items-center justify-between gap-2'
export const ITEM_FOOTER = 'flex basis-full items-center justify-between gap-2'

// shadcn-vue's Alert classes (reka-nova), verbatim.
import { cva, type VariantProps } from 'class-variance-authority'

export const alertVariants = cva(
  'grid gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*=size-])]:size-4 group/alert relative w-full',
  {
    variants: {
      variant: {
        default: 'bg-card text-card-foreground',
        destructive: 'text-destructive bg-card *:data-[slot=alert-description]:text-destructive/90 *:[svg]:text-current',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type AlertVariants = VariantProps<typeof alertVariants>

export const ALERT_TITLE = 'font-medium group-has-[>svg]/alert:col-start-2 cn-font-heading [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground'
export const ALERT_DESCRIPTION =
  'text-muted-foreground text-sm text-balance md:text-pretty [&_p:not(:last-child)]:mb-4 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground'
export const ALERT_ACTION = 'absolute top-2 right-2'

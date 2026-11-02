// shadcn-vue's Badge classes, verbatim (variants default | secondary | destructive | outline),
// plus the goo swell tokens.
import { cva, type VariantProps } from 'class-variance-authority'

export const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline: 'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

/** The swell's colour per variant: the badge's hovered background (the outline's border). */
export const goopBadgeFill: Record<NonNullable<BadgeVariants['variant']>, string> = {
  default: '[--goop-badge-fill:color-mix(in_oklab,var(--primary)_90%,transparent)]',
  secondary: '[--goop-badge-fill:color-mix(in_oklab,var(--secondary)_90%,transparent)]',
  destructive: '[--goop-badge-fill:color-mix(in_oklab,var(--destructive)_90%,transparent)]',
  outline: '[--goop-badge-fill:var(--border)]',
}

/** An interactive badge (a link or button, e.g. through asChild) swells on hover: a ring in
 *  its own colour grows by --goop-badge-swell (goop.css zeroes it under reduced motion) with
 *  a soft overshoot. It rides Tailwind's shadow, so the focus ring still composes with it. */
export const goopBadgeSwell =
  '[&:is(a,button)]:hover:shadow-[0_0_0_var(--goop-badge-swell)_var(--goop-badge-fill)] duration-[var(--goop-badge-duration)] ease-[cubic-bezier(0.34,1.9,0.5,1)]'

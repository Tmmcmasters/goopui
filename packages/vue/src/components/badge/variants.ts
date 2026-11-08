// shadcn/ui's Badge classes (React, style `radix-nova`), verbatim (variants default | secondary |
// destructive | outline | ghost | link), plus the goo swell tokens.
import { cva, type VariantProps } from 'class-variance-authority'

export const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

/** The swell's colour per variant: the badge's hovered background (the outline's border; a link
 *  has no surface, so no swell). */
export const goopBadgeFill: Record<NonNullable<BadgeVariants['variant']>, string> = {
  default: '[--goop-badge-fill:color-mix(in_oklab,var(--primary)_80%,transparent)]',
  secondary: '[--goop-badge-fill:color-mix(in_oklab,var(--secondary)_80%,transparent)]',
  destructive:
    '[--goop-badge-fill:color-mix(in_oklab,var(--destructive)_20%,transparent)] dark:[--goop-badge-fill:color-mix(in_oklab,var(--destructive)_30%,transparent)]',
  outline: '[--goop-badge-fill:var(--border)]',
  ghost: '[--goop-badge-fill:var(--muted)] dark:[--goop-badge-fill:color-mix(in_oklab,var(--muted)_50%,transparent)]',
  link: '[--goop-badge-fill:transparent]',
}

/** An interactive badge (a link or button, e.g. through asChild) swells on hover: a ring in
 *  its own colour grows by --goop-badge-swell (goop.css zeroes it under reduced motion) with
 *  a soft overshoot. It rides Tailwind's shadow, so the focus ring still composes with it. */
export const goopBadgeSwell =
  '[&:is(a,button)]:hover:shadow-[0_0_0_var(--goop-badge-swell)_var(--goop-badge-fill)] duration-[var(--goop-badge-duration)] ease-[cubic-bezier(0.34,1.9,0.5,1)]'

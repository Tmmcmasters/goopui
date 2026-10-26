import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

/**
 * shadcn-vue's Button classes, copied verbatim (style `reka-nova`, see
 * apps/playground/app/components/ui/button/index.ts). Keep this identical to shadcn so a
 * GoopButton is a drop-in Button; the goo lives in `goopButtonGooVariants` below.
 */
export const buttonVariants = cva(
  'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-3 aria-invalid:ring-3 active:not-aria-[haspopup]:translate-y-px [&_svg:not([class*=size-])]:size-4 group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        outline: 'border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost: 'hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive: 'bg-destructive/10 hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/20 text-destructive focus-visible:border-destructive/40 dark:hover:bg-destructive/30',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        'default': 'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'xs': 'h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=size-])]:size-3',
        'sm': 'h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=size-])]:size-3.5',
        'lg': 'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        'icon': 'size-8',
        'icon-xs': 'size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',
        'icon-lg': 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariants['variant']>
export type ButtonSize = NonNullable<ButtonVariants['size']>

/**
 * How each variant's shadcn background becomes goo. Core's alpha filter turns translucent
 * goo opaque (or makes it vanish below the edge threshold), so a translucent `bg-x/NN` can't
 * be the goo color. Instead every variant sets:
 *
 *   --goop-color    the variant's bg token, opaque (the goo body + drips paint with it);
 *   --goop-opacity  the bg's alpha, applied to the goo layer AFTER the filter (goop.css),
 *                   so `bg-destructive/10` becomes destructive goo at 10% opacity. That is
 *                   a true tint on any backdrop, hover states included;
 *   --goop-fill     (outline only) the shadcn bg, painted inside a 1px goo stroke.
 *
 *   fill   (default, secondary, destructive): solid goo body in the bg token.
 *   stroke (outline): goo body in the border token; an inner fill rides the body's pose
 *          (core cssVars) so the goo shows as a 1px gooey border that drips.
 *   hover  (ghost): goo hidden at rest, fades in on hover / press / aria-expanded, matching
 *          ghost's hover-only background.
 *   none   (link): no goo. A text link has no surface to drip from.
 */
export type GoopButtonStyle = 'fill' | 'stroke' | 'hover' | 'none'

export const goopButtonStyles: Record<ButtonVariant, GoopButtonStyle> = {
  default: 'fill',
  secondary: 'fill',
  destructive: 'fill',
  outline: 'stroke',
  ghost: 'hover',
  link: 'none',
}

export const goopButtonGooVariants = cva('', {
  variants: {
    variant: {
      default: '[--goop-color:var(--primary)] [a]:hover:[--goop-opacity:0.8]',
      secondary: '[--goop-color:var(--secondary)] hover:[--goop-opacity:0.8]',
      destructive:
        '[--goop-color:var(--destructive)] [--goop-opacity:0.1] hover:[--goop-opacity:0.2] dark:[--goop-opacity:0.2] dark:hover:[--goop-opacity:0.3]',
      outline:
        '[--goop-color:var(--border)] dark:[--goop-color:oklch(from_var(--input)_l_c_h_/_1)] dark:[--goop-opacity:0.15] [--goop-fill:var(--background)] hover:[--goop-fill:var(--muted)] aria-expanded:[--goop-fill:var(--muted)] dark:[--goop-fill:color-mix(in_oklab,var(--input)_30%,transparent)] dark:hover:[--goop-fill:color-mix(in_oklab,var(--input)_50%,transparent)]',
      ghost:
        '[--goop-color:var(--muted)] [--goop-opacity:0] hover:[--goop-opacity:1] active:[--goop-opacity:1] aria-expanded:[--goop-opacity:1] dark:hover:[--goop-opacity:0.5] dark:active:[--goop-opacity:0.5] dark:aria-expanded:[--goop-opacity:1]',
      link: '',
    },
  },
  defaultVariants: { variant: 'default' },
})

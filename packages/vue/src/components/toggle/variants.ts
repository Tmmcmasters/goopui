// shadcn/ui's Toggle classes (React, style `radix-nova`; variants default | outline, sizes), plus goo tokens.
import { cva, type VariantProps } from 'class-variance-authority'

export const toggleVariants = cva(
  "group/toggle inline-flex items-center justify-center gap-1 rounded-lg text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent hover:bg-muted',
      },
      size: {
        default:
          'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: "h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>

/** Goo color: the token shadcn fills a pressed toggle with (core reads --goop-toggle-fill), and
 *  the text on it (--goop-toggle-text): shadcn's pressed toggle keeps the foreground color. */
export const goopToggleColors = '[--goop-toggle-fill:var(--muted)] [--goop-toggle-text:var(--foreground)]'

/** While the goo is attached, a pressed toggle drops its own background: the goo is the fill
 *  (and it may still be flooding in or draining out). */
export const goopToggleFilled =
  'data-[state=on]:bg-transparent data-[state=on]:hover:bg-transparent aria-pressed:bg-transparent aria-pressed:hover:bg-transparent'

/** A toggle group item with the goo attached: like `goopToggleFilled`, and while its goo still
 *  shows (core's `data-goop-filled`, set until the drain has finished) its own hover background
 *  steps aside too. The group's goo layer sits under the items, so an un-pressed, hovered item
 *  would otherwise cover its own drain in one frame. */
export const goopToggleItemFilled = `${goopToggleFilled} data-[goop-filled]:bg-transparent data-[goop-filled]:hover:bg-transparent`

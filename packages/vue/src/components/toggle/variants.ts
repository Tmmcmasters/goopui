// shadcn-vue's Toggle classes, verbatim (variants default | outline, sizes), plus goo tokens.
import { cva, type VariantProps } from 'class-variance-authority'

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-2 min-w-9',
        sm: 'h-8 px-1.5 min-w-8',
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>

/** Goo color: the token shadcn fills a pressed toggle with (core reads --goop-toggle-fill). */
export const goopToggleColors = '[--goop-toggle-fill:var(--accent)]'

/** While the goo is attached, a pressed toggle drops its own background: the goo is the fill
 *  (and it may still be flooding in or draining out). */
export const goopToggleFilled = 'data-[state=on]:bg-transparent data-[state=on]:hover:bg-transparent'

/** A toggle group item with the goo attached: like `goopToggleFilled`, and while its goo still
 *  shows (core's `data-goop-filled`, set until the drain has finished) its own hover background
 *  steps aside too. The group's goo layer sits under the items, so an un-pressed, hovered item
 *  would otherwise cover its own drain in one frame. */
export const goopToggleItemFilled = `${goopToggleFilled} data-[goop-filled]:bg-transparent data-[goop-filled]:hover:bg-transparent`

// shadcn/ui's Checkbox classes (React, style `radix-nova`; identical to @goopui/react), plus the goo layer's tokens.
import { cva } from 'class-variance-authority'

export const checkboxVariants = cva(
  'peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-[state=checked]:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground group-has-[:focus-visible]/field-label:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary',
)

export const checkboxIndicatorVariants = cva('grid place-content-center text-current transition-none [&>svg]:size-3.5')

/** Goo color: the same token shadcn fills a checked box with (core reads --goop-checkbox-fill). */
export const goopCheckboxColors = '[--goop-checkbox-fill:var(--primary)]'

/** While the goo fill is attached, the box itself stays unfilled (the primary fill is goo) and
 *  the mark keeps shadcn's checked text color on top of it. */
export const goopCheckboxFilledBox =
  'data-[state=checked]:bg-transparent dark:data-[state=checked]:bg-input/30 data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary'

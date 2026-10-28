// shadcn-vue's Checkbox classes, verbatim (box + indicator), plus the goo layer's tokens.
import { cva } from 'class-variance-authority'

export const checkboxVariants = cva(
  'border-input dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-4 items-center justify-center rounded-[4px] border transition-colors group-has-disabled/field:opacity-50 focus-visible:ring-3 aria-invalid:ring-3 peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
)

export const checkboxIndicatorVariants = cva('[&>svg]:size-3.5 grid place-content-center text-current transition-none')

/** Goo color: the same token shadcn fills a checked box with (core reads --goop-checkbox-fill). */
export const goopCheckboxColors = '[--goop-checkbox-fill:var(--primary)]'

/** While the goo fill is attached, the box itself stays unfilled (the primary fill is goo) and
 *  the mark keeps shadcn's checked text color on top of it. */
export const goopCheckboxFilledBox =
  'data-[state=checked]:bg-transparent dark:data-[state=checked]:bg-input/30 data-[state=checked]:text-primary-foreground data-[state=checked]:border-primary'

// shadcn-vue's RadioGroup classes, verbatim (root, item, indicator, dot), plus goo tokens.
import { cva } from 'class-variance-authority'

export const radioGroupVariants = cva('grid gap-2 w-full')

export const radioGroupItemVariants = cva(
  'border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:border-destructive/50 flex size-4 rounded-full focus-visible:ring-3 aria-invalid:ring-3 group/radio-group-item peer relative aspect-square shrink-0 border outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50',
)

export const radioGroupIndicatorVariants = cva('flex size-4 items-center justify-center')

export const radioGroupDotVariants = cva(
  'bg-primary-foreground absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full',
)

/** Goo color: the token shadcn fills the checked item with (core reads --goop-radio-fill). */
export const goopRadioGroupColors = '[--goop-radio-fill:var(--primary)]'

/** While the goo blob is attached, the checked item itself stays unfilled (the blob is the
 *  fill, and it may still be flying in). */
export const goopRadioGroupItemFilled = 'data-checked:bg-transparent dark:data-checked:bg-input/30'

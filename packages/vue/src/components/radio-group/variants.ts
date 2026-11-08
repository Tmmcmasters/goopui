// shadcn/ui's RadioGroup classes (React, style `radix-nova`; root, item, indicator, dot), plus goo tokens.
import { cva } from 'class-variance-authority'

export const radioGroupVariants = cva('grid w-full gap-2')

export const radioGroupItemVariants = cva(
  'group/radio-group-item peer relative flex aspect-square size-4 shrink-0 rounded-full border border-input outline-none group-has-[:focus-visible]/field-label:ring-0 group-has-[:focus-visible]/field-label:not-data-[state=checked]:border-input after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground group-has-[:focus-visible]/field-label:data-[state=checked]:border-primary dark:data-[state=checked]:bg-primary',
)

export const radioGroupIndicatorVariants = cva('flex size-4 items-center justify-center')

export const radioGroupDotVariants = cva(
  'absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-foreground',
)

/** Goo color: the token shadcn fills the checked item with (core reads --goop-radio-fill). */
export const goopRadioGroupColors = '[--goop-radio-fill:var(--primary)]'

/** While the goo blob is attached, the checked item itself stays unfilled (the blob is the
 *  fill, and it may still be flying in). */
export const goopRadioGroupItemFilled = 'data-[state=checked]:bg-transparent dark:data-[state=checked]:bg-input/30'

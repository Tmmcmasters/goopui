// The NumberField classes (shadcn-vue's NumberField, style `reka-nova`, the same set as
// @goopui/vue's): shadcn/ui React has no NumberField, so this is its Input plus +/- steppers.
import { cva } from 'class-variance-authority'

export const numberFieldVariants = cva('grid gap-1.5')

export const numberFieldContentVariants = cva(
  'relative [&>[data-slot=input]]:has-[[data-slot=increment]]:pr-5 [&>[data-slot=input]]:has-[[data-slot=decrement]]:pl-5',
)

export const numberFieldInputVariants = cva(
  'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm w-full min-w-0 text-center outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)

export const numberFieldDecrementVariants = cva(
  'absolute top-1/2 -translate-y-1/2 left-0 p-3 disabled:cursor-not-allowed disabled:opacity-20',
)

export const numberFieldIncrementVariants = cva(
  'absolute top-1/2 -translate-y-1/2 right-0 disabled:cursor-not-allowed disabled:opacity-20 p-3',
)

/** While the goo ring is attached it is the focus indicator: it replaces shadcn's box-shadow
 *  ring (border colors stay) and any app-level `:focus-visible` outline (the Input's rule). */
export const goopNumberFieldActive = 'focus-visible:ring-0 aria-invalid:ring-0 focus-visible:outline-none!'

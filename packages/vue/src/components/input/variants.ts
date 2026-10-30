// shadcn-vue's Input / Textarea classes (style `reka-nova`), verbatim, plus the goo overrides.
import { cva } from 'class-variance-authority'

export const inputVariants = cva(
  'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 h-8 rounded-lg border bg-transparent px-2.5 py-1 text-base transition-colors file:h-6 file:text-sm file:font-medium focus-visible:ring-3 aria-invalid:ring-3 md:text-sm w-full min-w-0 outline-none file:inline-flex file:border-0 file:bg-transparent file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
)

export const textareaVariants = cva(
  'border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 disabled:bg-input/50 dark:disabled:bg-input/80 rounded-lg border bg-transparent px-2.5 py-2 text-base transition-colors focus-visible:ring-3 aria-invalid:ring-3 md:text-sm flex field-sizing-content min-h-16 w-full outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
)

/** The element core puts the goo layer in (an <input> can't hold children). It sizes like
 *  the field does by default (`w-full min-w-0`); pass `containerClass` to change that. */
export const goopFieldContainer = 'relative w-full min-w-0'

/** While the goo ring is attached it replaces shadcn's box-shadow ring (border colors stay). */
export const goopFieldActive = 'focus-visible:ring-0 aria-invalid:ring-0'

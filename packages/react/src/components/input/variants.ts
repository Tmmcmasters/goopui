// shadcn/ui's Input / Textarea classes (React, style `radix-nova`; same set as shadcn-vue reka-nova), plus the goo overrides.
import { cva } from 'class-variance-authority'

export const inputVariants = cva(
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
)

export const textareaVariants = cva(
  'flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
)

/** The element core puts the goo layer in (an <input> can't hold children). It sizes like
 *  the field does by default (`w-full min-w-0`); pass `containerClass` to change that. */
export const goopFieldContainer = 'relative w-full min-w-0'

/** While the goo ring is attached it is the focus indicator: it replaces shadcn's box-shadow
 *  ring (border colors stay) and any app-level `:focus-visible` outline, which would sit right
 *  on top of the goo (the outline is `!important` so an unlayered global rule can't beat it).
 *  Reduced motion still draws the goo ring (static); with `:goo="false"` none of this applies. */
export const goopFieldActive = 'focus-visible:ring-0 aria-invalid:ring-0 focus-visible:outline-none!'

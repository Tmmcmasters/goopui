// shadcn-vue's InputOTP classes (style `reka-nova`), on reka's PinInput (each cell is a real
// <input>, so the active-cell styles key off :focus instead of vue-input-otp's data-active).
import { cva } from 'class-variance-authority'

export const inputOTPVariants = cva('gap-2 flex items-center has-disabled:opacity-50 disabled:cursor-not-allowed')

export const inputOTPGroupVariants = cva(
  'has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40 has-aria-invalid:border-destructive rounded-lg has-aria-invalid:ring-3 flex items-center',
)

export const inputOTPSlotVariants = cva(
  'dark:bg-input/30 border-input focus:border-ring focus:ring-ring/50 focus:aria-invalid:ring-destructive/20 dark:focus:aria-invalid:ring-destructive/40 aria-invalid:border-destructive focus:aria-invalid:border-destructive size-8 border-y border-r bg-transparent text-center text-sm transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg focus:ring-3 relative flex items-center justify-center focus:z-10 disabled:cursor-not-allowed',
)

export const inputOTPSeparatorVariants = cva('[&_svg:not([class*=size-])]:size-4 flex items-center')

/** While the goo is attached it is the focus indicator: the focused cell's box-shadow ring and
 *  any app-level outline step aside (border color stays), like the Input's goo ring. */
export const goopOTPSlotActive = 'focus:ring-0 focus:outline-none! focus-visible:outline-none!'

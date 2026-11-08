// shadcn/ui's InputOTP classes (React, style `radix-nova`; same set as shadcn-vue reka-nova), on reka's PinInput (each cell is a real
// <input>, so the active-cell styles key off :focus instead of vue-input-otp's data-active).
import { cva } from 'class-variance-authority'

export const inputOTPVariants = cva(
  'flex items-center gap-2 has-disabled:opacity-50 disabled:cursor-not-allowed',
)

export const inputOTPGroupVariants = cva(
  'flex items-center rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40',
)

export const inputOTPSlotVariants = cva(
  'relative flex size-8 items-center justify-center border-y border-r border-input bg-transparent text-center text-sm transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg aria-invalid:border-destructive focus:z-10 focus:border-ring focus:ring-3 focus:ring-ring/50 focus:aria-invalid:border-destructive focus:aria-invalid:ring-destructive/20 disabled:cursor-not-allowed dark:bg-input/30 dark:focus:aria-invalid:ring-destructive/40',
)

export const inputOTPSeparatorVariants = cva(
  'flex items-center [&_svg:not([class*=size-])]:size-4',
)

/** While the goo is attached it is the focus indicator: the focused cell's box-shadow ring and
 *  any app-level outline step aside (border color stays), like the Input's goo ring. */
export const goopOTPSlotActive = 'focus:ring-0 focus:outline-none! focus-visible:outline-none!'

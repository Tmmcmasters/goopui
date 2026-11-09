// shadcn/ui's InputOTP classes (React, style `radix-nova`) on input-otp: one hidden <input>
// over render-only slots, so the active-cell styles key off input-otp's `data-active` (the Vue
// port keys the same styles off each cell's :focus).
import { cva } from 'class-variance-authority'

/** The OTP container (input-otp's `containerClassName`). */
export const inputOTPVariants = cva('flex items-center gap-2 has-disabled:opacity-50')

/** The hidden <input> itself (input-otp's `className`). */
export const inputOTPInputVariants = cva('disabled:cursor-not-allowed')

export const inputOTPGroupVariants = cva(
  'flex items-center rounded-lg has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 dark:has-aria-invalid:ring-destructive/40',
)

export const inputOTPSlotVariants = cva(
  'relative flex size-8 items-center justify-center border-y border-r border-input bg-transparent text-center text-sm transition-all outline-none first:rounded-l-lg first:border-l last:rounded-r-lg aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40',
)

export const inputOTPSeparatorVariants = cva('flex items-center [&_svg:not([class*=size-])]:size-4')

/** shadcn's fake caret in the active, empty slot (input-otp `hasFakeCaret`). The blink is
 *  goop.css's `goop-caret-blink` (shadcn's caret-blink keyframes); still under reduced motion. */
export const inputOTPCaretVariants = cva('h-4 w-px bg-foreground animate-[goop-caret-blink_1.25s_ease-out_infinite] motion-reduce:animate-none')

/** While the goo is attached it is the focus indicator: the active cell's box-shadow ring
 *  steps aside (border color stays), like the Input's goo ring. */
export const goopOTPSlotActive = 'data-[active=true]:ring-0'

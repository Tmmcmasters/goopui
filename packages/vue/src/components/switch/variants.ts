// shadcn/ui's Switch classes (React, style `radix-nova`; identical to @goopui/react), plus the goo layer's color tokens.
import { cva, type VariantProps } from 'class-variance-authority'

export const switchVariants = cva(
  'peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-all outline-none group-has-[:focus-visible]/field-label:border-transparent group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80 data-disabled:cursor-not-allowed data-disabled:opacity-50',
)

export const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-[state=checked]:translate-x-[calc(100%-2px)] dark:data-[state=checked]:bg-primary-foreground group-data-[size=default]/switch:data-[state=unchecked]:translate-x-0 group-data-[size=sm]/switch:data-[state=unchecked]:translate-x-0 dark:data-[state=unchecked]:bg-foreground',
)

export type SwitchSize = 'sm' | 'default'
export type SwitchVariants = VariantProps<typeof switchVariants>

/** Goo colors before core attaches (from data-state; same tokens as the thumb). */
export const goopSwitchColors =
  '[--goop-switch-thumb:var(--background)] dark:data-[state=unchecked]:[--goop-switch-thumb:var(--foreground)] dark:data-[state=checked]:[--goop-switch-thumb:var(--primary-foreground)] [--goop-switch-fill:var(--primary)]'

/** Goo colors while attached: from core's `data-goop-switch-state` (SWITCH_SHOWN_ATTR), which
 *  keeps the old state until the thumb hits the wall, so the thumb contrasts the track the
 *  whole way across (data-state flips on click). */
export const goopSwitchShownColors =
  '[--goop-switch-thumb:var(--background)] dark:data-[goop-switch-state=unchecked]:[--goop-switch-thumb:var(--foreground)] dark:data-[goop-switch-state=checked]:[--goop-switch-thumb:var(--primary-foreground)] [--goop-switch-fill:var(--primary)]'

/** While the goo fill is attached the track stays muted; the primary fill (and its wave) is goo. */
export const goopSwitchFilledTrack = 'data-[state=checked]:bg-input dark:data-[state=checked]:bg-input/80'

/** Attached with `fill` off: the real track color follows the shown state, switching at impact.
 *  Important, to beat shadcn's data-state colors (same specificity, unrelated variants). */
export const goopSwitchShownTrack =
  'data-[goop-switch-state=checked]:bg-primary! data-[goop-switch-state=unchecked]:bg-input! dark:data-[goop-switch-state=unchecked]:bg-input/80!'

// @goopui/react: shadcn/ui-style React components (Radix UI) with the goopUI engine attached.
// Import the styles once: `@import "@goopui/react/goop.css";` in your Tailwind entry CSS.
//
// Every component module starts with 'use client' (Next.js App Router: they server-render
// shadcn's markup, and the goo attaches after hydration). This barrel has no directive, so the
// server-safe exports (variants, prop helpers, manifest) stay usable from Server Components.

export * from './components/button'
export * from './components/switch'
export * from './components/checkbox'
export * from './components/tabs'
export * from './components/dialog'
export * from './components/skeleton'
export * from './components/badge'
export * from './components/card'
export * from './components/avatar'
export * from './components/separator'
export * from './components/label'
export * from './components/spinner'
export { GoopConfigContext, GoopProvider, useGoopConfig, type GoopConfig, type GoopProviderProps } from './config'
export { GoopCueClaim, GoopSoundContext, GoopSoundScope, useGoopCue, useGoopSound } from './sound'
export {
  AVATAR_PROP_KEYS,
  BADGE_PROP_KEYS,
  CARD_PROP_KEYS,
  CHECKBOX_PROP_KEYS,
  CSS_VAR_KEYS,
  DIALOG_PROP_KEYS,
  EMERGE_DRIP_KEYS,
  ENGINE_OPTION_KEYS,
  FEATURE_KEYS,
  GOOP_PROP_KEYS,
  GOOP_TUNING_KEYS,
  SKELETON_PROP_KEYS,
  SKELETON_REVEAL_PROP_KEYS,
  SPINNER_PROP_KEYS,
  SWITCH_PROP_KEYS,
  TABS_PROP_KEYS,
  diffOptions,
  goopPropMeta,
  isGoopFeature,
  sameValue,
  splitProps,
  toAvatarOptions,
  toBackdropOptions,
  toBadgeOptions,
  toCardOptions,
  toCheckboxOptions,
  toDialogOptions,
  toGoopOptions,
  toGoopStyle,
  toSkeletonOptions,
  toSkeletonRevealOptions,
  toSpinnerOptions,
  toSwitchOptions,
  toTabsOptions,
  type GoopAvatarEngineProps,
  type GoopBadgeEngineProps,
  type GoopCardEngineProps,
  type GoopCheckboxEngineKey,
  type GoopCheckboxEngineProps,
  type GoopCssVarKey,
  type GoopDialogKind,
  type GoopDialogProps,
  type GoopEffectProps,
  type GoopEngineKey,
  type GoopEngineProps,
  type GoopFeatureKey,
  type GoopPropValue,
  type GoopSkeletonEngineProps,
  type GoopSkeletonRevealEngineProps,
  type GoopSpinnerEngineProps,
  type GoopStaticEffectProps,
  type GoopSoundProps,
  type GoopSwitchEngineKey,
  type GoopSwitchEngineProps,
  type GoopTabsProps,
} from './goop-props'
export { goopComponents, type GoopComponentName } from './manifest'
export { seedFrom, useAttached, useGoop, type UseGoopReturn } from './use-goop'
export { cn } from 'cn'
// Engine types used in props and refs.
export type { BackdropHandle, CardHandle, CheckboxHandle, CheckboxState, EmergeHandle, GoopHandle, GoopOptions, GoopPreset, MenuHighlightHandle, SkeletonRevealHandle, SpinnerHandle, SpinnerVariant, SwitchHandle } from '@goopui/core'
// Bespoke batch 1: Toaster (sonner), Command (cmdk), Combobox (cmdk + Popover), NumberField, InputOTP (input-otp).
export * from './components/sonner'
export * from './components/command'
export * from './components/combobox'
export * from './components/number-field'
export * from './components/input-otp'
export {
  COMBOBOX_PROP_KEYS,
  COMMAND_DIALOG_PROP_KEYS,
  COMMAND_INPUT_PROP_KEYS,
  COMMAND_PROP_KEYS,
  INPUT_OTP_PROP_KEYS,
  NUMBER_FIELD_PROP_KEYS,
  TOASTER_PROP_KEYS,
  resolveComboboxProps,
  resolveCommandProps,
  toComboboxOptions,
  toCommandInputOptions,
  toCommandOptions,
  toInputOTPOptions,
  toNumberFieldOptions,
  toToasterOptions,
  type GoopComboboxProps,
  type GoopCommandDialogProps,
  type GoopCommandInputEngineProps,
  type GoopCommandProps,
  type GoopInputOTPEngineProps,
  type GoopNumberFieldEngineProps,
  type GoopToasterProps,
  type ResolvedComboboxProps,
  type ResolvedCommandProps,
} from './goop-props'
export type { InputOTPHandle, NumberFieldHandle, ToasterHandle } from '@goopui/core'

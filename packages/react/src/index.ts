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
export { GoopConfigContext, GoopProvider, useGoopConfig, type GoopConfig, type GoopProviderProps } from './config'
export { GoopCueClaim, GoopSoundContext, GoopSoundScope, useGoopCue, useGoopSound } from './sound'
export {
  CHECKBOX_PROP_KEYS,
  CSS_VAR_KEYS,
  DIALOG_PROP_KEYS,
  EMERGE_DRIP_KEYS,
  ENGINE_OPTION_KEYS,
  FEATURE_KEYS,
  GOOP_PROP_KEYS,
  GOOP_TUNING_KEYS,
  SWITCH_PROP_KEYS,
  TABS_PROP_KEYS,
  diffOptions,
  goopPropMeta,
  isGoopFeature,
  sameValue,
  splitProps,
  toBackdropOptions,
  toCheckboxOptions,
  toDialogOptions,
  toGoopOptions,
  toGoopStyle,
  toSwitchOptions,
  toTabsOptions,
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
  type GoopSoundProps,
  type GoopSwitchEngineKey,
  type GoopSwitchEngineProps,
  type GoopTabsProps,
} from './goop-props'
export { goopComponents, type GoopComponentName } from './manifest'
export { seedFrom, useAttached, useGoop, type UseGoopReturn } from './use-goop'
export { cn } from 'cn'

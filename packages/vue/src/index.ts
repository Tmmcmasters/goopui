// @goopui/vue: shadcn-style Vue components with the goopUI engine attached.
// Import the styles once: `@import "@goopui/vue/goop.css";` in your Tailwind entry CSS.

export * from './components/button'
export * from './components/spinner'
export * from './components/switch'
export * from './components/popover'
export { GOOP_CONFIG_KEY, GoopPlugin, provideGoopConfig, useGoopConfig, type GoopConfig } from './config'
export {
  CSS_VAR_KEYS,
  ENGINE_OPTION_KEYS,
  FEATURE_KEYS,
  GOOP_TUNING_KEYS,
  diffOptions,
  goopPropMeta,
  goopSwitchProps,
  goopProps,
  isGoopFeature,
  toGoopOptions,
  toGoopStyle,
  toSwitchOptions,
  type GoopCssVarKey,
  type GoopEngineKey,
  type GoopFeatureKey,
  type GoopPropValue,
  type GoopPropsDefinition,
  type GoopPropsInput,
  type GoopSwitchEngineKey,
  type GoopSwitchPropsDefinition,
  type GoopSwitchPropsInput,
} from './goop-props'
export { goopComponents, type GoopComponentName } from './manifest'
export { seedFrom, useGoop, type UseGoopReturn } from './use-goop'
export { cn } from 'cn'

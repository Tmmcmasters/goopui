import type { GoopOptions } from '@goopui/core'
import { inject, provide, type App, type InjectionKey, type Plugin } from 'vue'

/** App-wide engine defaults (e.g. `{ preset: 'subtle', renderer: 'canvas' }`). Component
 *  props win over these. */
export type GoopConfig = GoopOptions

export const GOOP_CONFIG_KEY: InjectionKey<GoopConfig> = Symbol('goopui.config')

/** Set engine defaults for a subtree (call in a parent component's setup). */
export function provideGoopConfig(config: GoopConfig): void {
  provide(GOOP_CONFIG_KEY, { ...useGoopConfig(), ...config })
}

/** The engine defaults in effect here (empty when none were provided). */
export function useGoopConfig(): GoopConfig {
  return inject(GOOP_CONFIG_KEY, {})
}

/** `app.use(GoopPlugin, { preset: 'subtle' })` sets app-wide engine defaults. */
export const GoopPlugin: Plugin<[GoopConfig?]> = {
  install(app: App, config: GoopConfig = {}) {
    app.provide(GOOP_CONFIG_KEY, { ...config })
  },
}

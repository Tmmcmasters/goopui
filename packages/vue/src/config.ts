import type { GoopOptions } from '@goopui/core'
import { computed, inject, provide, type App, type InjectionKey, type Plugin } from 'vue'
import { GOOP_SOUND_KEY, provideGoopSound } from './sound'

/** App-wide defaults: engine options (e.g. `{ preset: 'subtle', renderer: 'canvas' }`) plus
 *  `sound`, the default for every component's `sound` prop (off unless set). Component props
 *  win over these. */
export type GoopConfig = GoopOptions & {
  /** Interaction sounds (Cuelume) on by default for every component. Default false. */
  sound?: boolean
}

export const GOOP_CONFIG_KEY: InjectionKey<GoopOptions> = Symbol('goopui.config')

/** Set engine defaults (and `sound`) for a subtree (call in a parent component's setup). */
export function provideGoopConfig(config: GoopConfig): void {
  const { sound, ...engine } = config
  provide(GOOP_CONFIG_KEY, { ...useGoopConfig(), ...engine })
  if (sound !== undefined) provideGoopSound(sound)
}

/** The engine defaults in effect here (empty when none were provided). */
export function useGoopConfig(): GoopOptions {
  return inject(GOOP_CONFIG_KEY, {})
}

/** `app.use(GoopPlugin, { preset: 'subtle', sound: true })` sets app-wide defaults. */
export const GoopPlugin: Plugin<[GoopConfig?]> = {
  install(app: App, config: GoopConfig = {}) {
    const { sound, ...engine } = config
    app.provide(GOOP_CONFIG_KEY, { ...engine })
    if (sound !== undefined) app.provide(GOOP_SOUND_KEY, computed(() => sound))
  },
}

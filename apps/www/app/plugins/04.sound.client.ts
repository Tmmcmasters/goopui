// Apply a stored mute (see useSoundPreference) before anything can play. @goopui/nuxt's
// sound plugin calls enableSound() at startup and whichever of the two runs last wins, so
// the mute is applied here and again once every plugin has run (before the app mounts).
import { disableSound } from '@goopui/core'

export default defineNuxtPlugin((nuxtApp) => {
  const { enabled } = useSoundPreference()
  enabled.value = document.documentElement.dataset.sound !== 'off'
  if (enabled.value) return
  disableSound()
  nuxtApp.hook('app:created', () => {
    if (!enabled.value) disableSound()
  })
})

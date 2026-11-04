// The site's sound switch. Interaction sounds are on site-wide (`goop: { sound: true }` in
// nuxt.config.ts); a visitor can mute them from the header. The choice lives in localStorage
// ('off' when muted, 'on' otherwise; default on). The boot script in nuxt.config.ts copies a
// stored mute onto <html data-sound="off"> before first paint, and the 04.sound plugin applies
// it to @goopui/core before the app mounts, so a muted visitor never hears a click.
import { playCue, setSoundEnabled } from '@goopui/core'

export const SOUND_STORAGE_KEY = 'goop-sound'

export function useSoundPreference() {
  const enabled = useState('sound:enabled', () => true)

  async function setEnabled(on: boolean) {
    enabled.value = on
    if (!import.meta.client) return
    const root = document.documentElement
    if (on) delete root.dataset.sound
    else root.dataset.sound = 'off'
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off')
    } catch {}
    // Muting is silent. Unmuting runs from the click (a user gesture, so audio can start)
    // and plays one soft toggle as confirmation.
    if (await setSoundEnabled(on)) playCue('toggle', { emphasis: 'subtle' })
  }

  return { enabled, setEnabled }
}

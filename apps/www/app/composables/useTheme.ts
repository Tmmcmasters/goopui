export type ThemePref = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'goop-theme'

export function useTheme() {
  const pref = useState<ThemePref>('theme:pref', () => 'system')
  const isDark = useState('theme:dark', () => false)

  function apply(next: ThemePref) {
    pref.value = next
    if (!import.meta.client) return
    const dark = next === 'dark' || (next === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
    const root = document.documentElement
    // Swap every color in one frame with transitions off, so nothing smears.
    root.classList.add('theme-switching')
    root.classList.toggle('dark', dark)
    isDark.value = dark
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
    try {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {}
  }

  function toggle() {
    apply(isDark.value ? 'light' : 'dark')
  }

  return { pref, isDark, apply, toggle }
}

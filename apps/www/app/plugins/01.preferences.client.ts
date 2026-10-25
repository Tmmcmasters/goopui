// Sync the theme + reduced-motion state that the inline head script already applied
// (before first paint) into Vue state, and keep following the OS.
export default defineNuxtPlugin(() => {
  const root = document.documentElement
  const { osReduced, forced } = useMotionPreference()
  const { pref, isDark, apply } = useTheme()

  const rmq = matchMedia('(prefers-reduced-motion: reduce)')
  osReduced.value = rmq.matches
  rmq.addEventListener('change', (e) => (osReduced.value = e.matches))
  forced.value = root.dataset.reducedMotion === 'true'

  let stored: string | null = null
  try {
    stored = localStorage.getItem(THEME_STORAGE_KEY)
  } catch {}
  pref.value = stored === 'light' || stored === 'dark' ? stored : 'system'
  isDark.value = root.classList.contains('dark')

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (pref.value === 'system') apply('system')
  })
})

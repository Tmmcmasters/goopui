// Sync the theme + reduced-motion state that the inline head script already applied
// (before first paint) into Vue state, and keep following the OS. Also the Vue / React docs
// choice: read after hydration (so SSR markup matches), and updated whenever a docs page of
// either framework is visited.
export default defineNuxtPlugin((nuxtApp) => {
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
  // Dark unless the visitor picked light (see the boot script in nuxt.config.ts).
  pref.value = stored === 'light' ? 'light' : 'dark'
  isDark.value = root.classList.contains('dark')

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (pref.value === 'system') apply('system')
  })

  const { preferred, setPreferred } = useFrameworkPreference()
  const router = useRouter()
  nuxtApp.hook('app:suspense:resolve', () => {
    try {
      const fw = localStorage.getItem(FRAMEWORK_STORAGE_KEY)
      if (fw === 'vue' || fw === 'react') preferred.value = fw
    } catch {}
    const here = frameworkOfPath(router.currentRoute.value.path)
    if (here) setPreferred(here)
  })
  router.afterEach((to) => {
    const fw = frameworkOfPath(to.path)
    if (fw && fw !== preferred.value) setPreferred(fw)
  })
})

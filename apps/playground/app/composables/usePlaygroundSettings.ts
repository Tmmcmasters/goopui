export type PlaygroundTheme = 'light' | 'dark'

/**
 * Playground-wide toggles. Stored in cookies so SSR renders the right
 * `<html>` attributes on first paint (no theme flash).
 *
 * - theme: adds `class="dark"` on `<html>` (shadcn's dark variant).
 * - simulateReducedMotion: sets `data-reduced-motion="true"` on `<html>`.
 *   The goop engine treats it the same as `prefers-reduced-motion: reduce`.
 */
export function usePlaygroundSettings() {
  const cookieOpts = { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' as const }
  const theme = useCookie<PlaygroundTheme>('goop-theme', { ...cookieOpts, default: () => 'light' })
  const simulateReducedMotion = useCookie<boolean>('goop-reduced-motion', { ...cookieOpts, default: () => false })

  return {
    theme,
    simulateReducedMotion,
    toggleTheme: () => { theme.value = theme.value === 'dark' ? 'light' : 'dark' },
  }
}

/**
 * Live value of the real `prefers-reduced-motion: reduce` media query.
 * `null` until mounted (unknown on the server).
 */
export function useSystemReducedMotion() {
  const matches = ref<boolean | null>(null)
  let stop: (() => void) | undefined
  onMounted(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { matches.value = mql.matches }
    sync()
    mql.addEventListener('change', sync)
    stop = () => mql.removeEventListener('change', sync)
  })
  onBeforeUnmount(() => stop?.())
  return matches
}

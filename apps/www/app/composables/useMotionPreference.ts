// One source of truth for "should things move?".
// Reduced = the OS asks for it (prefers-reduced-motion) OR the visitor flipped the site's
// "Reduce motion" switch, which sets <html data-reduced-motion="true">. @goopui/core reads
// that same attribute, so the goo goes static along with Lenis and the scroll reveals.

const STORAGE_KEY = 'goop-reduced-motion'

export function useMotionPreference() {
  const osReduced = useState('motion:os', () => false)
  const forced = useState('motion:forced', () => false)
  const reduced = computed(() => osReduced.value || forced.value)

  function setForced(on: boolean) {
    forced.value = on
    if (!import.meta.client) return
    const root = document.documentElement
    if (on) root.dataset.reducedMotion = 'true'
    else delete root.dataset.reducedMotion
    try {
      localStorage.setItem(STORAGE_KEY, String(on))
    } catch {}
  }

  return { reduced, osReduced, forced, setForced }
}

export const MOTION_STORAGE_KEY = STORAGE_KEY

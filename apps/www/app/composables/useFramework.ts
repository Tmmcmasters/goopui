// Vue or React docs. Vue lives at /docs/..., React at /react/docs/... (the same page tree and
// the same markdown: framework-specific bits are picked by <Fw> blocks, the demos and the
// component-docs entries). On a docs page the URL decides; elsewhere (the landing, the error
// page) the visitor's last choice does, remembered in localStorage (`goop-framework`).
export type Framework = 'vue' | 'react'

export const FRAMEWORK_STORAGE_KEY = 'goop-framework'
export const FRAMEWORKS: readonly { id: Framework; label: string }[] = [
  { id: 'vue', label: 'Vue' },
  { id: 'react', label: 'React' },
]

const REACT_PREFIX = '/react'

/** The framework a path belongs to, or null when it's not a docs path. */
export function frameworkOfPath(path: string): Framework | null {
  if (path === `${REACT_PREFIX}/docs` || path.startsWith(`${REACT_PREFIX}/docs/`)) return 'react'
  if (path === '/docs' || path.startsWith('/docs/')) return 'vue'
  return null
}

/** The framework-neutral docs path (`/react/docs/x` -> `/docs/x`); other paths unchanged. */
export function canonicalPath(path: string): string {
  return frameworkOfPath(path) === 'react' ? path.slice(REACT_PREFIX.length) : path
}

/** `path` (a /docs path, with optional #hash) in `fw`'s tree. Non-docs paths are unchanged. */
export function docsPathFor(path: string, fw: Framework): string {
  const canon = canonicalPath(path)
  if (frameworkOfPath(canon) !== 'vue') return path
  return fw === 'react' ? `${REACT_PREFIX}${canon}` : canon
}

export function useFrameworkPreference() {
  // SSR and hydration render 'vue'; plugins/01.preferences.client applies the stored choice
  // after mount, so nothing mismatches.
  const preferred = useState<Framework>('framework:pref', () => 'vue')
  function setPreferred(fw: Framework) {
    preferred.value = fw
    try {
      localStorage.setItem(FRAMEWORK_STORAGE_KEY, fw)
    } catch {}
  }
  return { preferred, setPreferred }
}

export function useFramework() {
  const route = useRoute()
  const { preferred, setPreferred } = useFrameworkPreference()
  /** The URL's framework on docs pages, else the visitor's preference. */
  const fw = computed<Framework>(() => frameworkOfPath(route.path) ?? preferred.value)
  /** True on a /react/docs page. */
  const isReact = computed(() => fw.value === 'react')
  /** A /docs link in the current framework's tree. */
  const to = (path: string): string => docsPathFor(path, fw.value)
  /** This page in the other framework (or null off the docs). */
  const counterpart = (target: Framework): string | null =>
    frameworkOfPath(route.path) ? docsPathFor(route.path, target) + (route.hash || '') : null
  return { fw, isReact, to, counterpart, preferred, setPreferred }
}

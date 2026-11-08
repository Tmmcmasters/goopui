// The repo's GitHub star count for the GitHub links (GithubStars.vue, the search palette).
// - Starts from the build-time count (modules/github-stars.ts, baked into the HTML), so the
//   first client render matches the server HTML.
// - Once per visit, after hydration on idle, refreshes it: from localStorage if the cached
//   count is under an hour old, otherwise from the GitHub API (then cached).
// - A failed refresh keeps whatever count we have; with no count at all (build fetch failed)
//   the links show just the logo.
export const GITHUB_URL = 'https://github.com/Tmmcmasters/goopui'
const API = 'https://api.github.com/repos/Tmmcmasters/goopui'
const STORAGE_KEY = 'goop-github-stars'
const TTL = 60 * 60 * 1000

const valid = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0

/** 12 -> "12", 1234 -> "1.2k", 12345 -> "12k", 1_250_000 -> "1.3m". */
export function formatStars(n: number): string {
  if (n < 1000) return String(n)
  const [div, unit] = n < 999_500 ? [1000, 'k'] : [1_000_000, 'm']
  const v = n / div
  return `${v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v)}${unit}`
}

let refreshing = false

async function refresh(stars: Ref<number | null>) {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { n?: unknown; t?: unknown } | null
    if (cached && valid(cached.n) && typeof cached.t === 'number' && Date.now() - cached.t < TTL) {
      stars.value = cached.n
      return
    }
  } catch {}
  try {
    const res = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
    if (!res.ok) return
    const n = ((await res.json()) as { stargazers_count?: unknown }).stargazers_count
    if (!valid(n)) return
    stars.value = n
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ n, t: Date.now() }))
    } catch {}
  } catch {}
}

export function useGithubStars() {
  const config = useRuntimeConfig()
  const stars = useState<number | null>('github:stars', () => {
    const n = (config.public as { githubStars?: unknown }).githubStars
    return valid(n) ? n : null
  })
  if (import.meta.client && !refreshing) {
    refreshing = true
    onNuxtReady(() => refresh(stars))
  }
  const label = computed(() => (stars.value === null ? null : formatStars(stars.value)))
  return { stars, label }
}

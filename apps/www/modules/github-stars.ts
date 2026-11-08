// Build-time GitHub star count. The site is static (`nuxt generate`), so the count is fetched
// once when Nuxt starts and baked into the HTML as `runtimeConfig.public.githubStars`; that is
// the value the first client render uses, so hydration matches. useGithubStars refreshes it in
// the browser afterwards. On any failure the value is null and the site shows no number.
// Uses GITHUB_TOKEN when set (higher rate limit, e.g. in CI); unauthenticated otherwise.
import { defineNuxtModule, useLogger } from 'nuxt/kit'

export const GITHUB_REPO = 'Tmmcmasters/goopui'

export default defineNuxtModule({
  meta: { name: 'github-stars' },
  async setup(_options, nuxt) {
    const pub = nuxt.options.runtimeConfig.public as Record<string, unknown>
    pub.githubStars = null
    // `nuxt prepare` (postinstall, typecheck) only generates types: skip the network.
    if (nuxt.options._prepare) return
    const logger = useLogger('github-stars')
    try {
      const token = process.env.GITHUB_TOKEN
      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'goopui-www',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const stars = ((await res.json()) as { stargazers_count?: unknown }).stargazers_count
      if (typeof stars !== 'number' || !Number.isFinite(stars) || stars < 0) throw new Error('no stargazers_count')
      pub.githubStars = stars
      logger.info(`GitHub stars: ${stars}`)
    } catch (e) {
      logger.warn(`Couldn't fetch the GitHub star count (${(e as Error).message}); the site shows none.`)
    }
  },
})

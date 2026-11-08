// Warm a docs page before it's clicked, so the old page isn't held frozen (the page
// transition holds it until page:finish) while chunks download.
//
// NuxtLink prefetch (visibility + interaction, see nuxt.config) loads a route's page chunk
// and _payload.json, but not the content components its markdown renders (Playground, the
// demo, Prose overrides...): ContentRenderer resolves those only after the route commits, a
// second serial round of downloads. On hover / focus / touch of an internal link we read the
// (prefetched) payload and preload the components its body uses.
import type { ContentNavigationItem } from '@nuxt/content'

type Node = string | [string, Record<string, unknown>, ...Node[]]

const pascal = (tag: string) => tag.replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())

function tagsOf(nodes: unknown, out: Set<string>) {
  if (!Array.isArray(nodes)) return
  for (const n of nodes as Node[]) {
    if (!Array.isArray(n) || typeof n[0] !== 'string') continue
    out.add(n[0])
    tagsOf(n.slice(2), out)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Content components (components/content): the same modules (so the same chunks) Nuxt
  // Content's renderer imports. Global ones (Prose*) go through Vue's registry.
  const loaders: Record<string, () => Promise<unknown>> = {}
  for (const [file, load] of Object.entries(import.meta.glob('../components/content/*.vue'))) loaders[file.split('/').pop()!.replace('.vue', '')] = load
  const registered = nuxtApp.vueApp._context.components
  const warmed = new Set<string>()

  async function warm(path: string) {
    if (warmed.has(path)) return
    warmed.add(path)
    const payload = await loadPayload(path).catch(() => null)
    const page = Object.values((payload?.data ?? {}) as Record<string, unknown>).find(
      (d): d is ContentNavigationItem & { body: { value: unknown } } => !!d && typeof d === 'object' && 'body' in d,
    )
    if (!page) return
    const tags = new Set<string>()
    tagsOf(page.body?.value, tags)
    const jobs: Promise<unknown>[] = []
    const global: string[] = []
    for (const tag of tags)
      for (const name of [pascal(tag), `Prose${pascal(tag)}`]) {
        if (loaders[name]) jobs.push(loaders[name]().catch(() => {}))
        else if (name in registered) global.push(name)
      }
    if (global.length) jobs.push(preloadComponents(global).catch(() => {}))
    await Promise.all(jobs)
  }

  const onIntent = (e: Event) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="/docs/"], a[href^="/react/docs/"]')
    if (!a) return
    const path = new URL((a as HTMLAnchorElement).href).pathname.replace(/\/$/, '')
    if (path !== nuxtApp.$router.currentRoute.value.path) void warm(path)
  }
  for (const type of ['pointerover', 'focusin', 'touchstart'] as const) document.addEventListener(type, onIntent, { passive: true, capture: true })
})

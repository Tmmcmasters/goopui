<script setup lang="ts">
// One docs page, for /docs/... (Vue) and /react/docs/... (React). Both read the same markdown
// (the canonical /docs path); framework-specific parts pick themselves (<Fw>, the demos, the
// component-docs entries). A component that has no React version yet gets a note on its
// React page, and its previews stay the Vue ones.
import { hasReactVersion } from '~/component-docs/registry'

const route = useRoute()
const { fw, isReact, to } = useFramework()
const path = computed(() => canonicalPath(route.path))

const { data: page } = await useAsyncData(`docs:${path.value}`, () => queryCollection('docs').path(path.value).first(), {
  watch: [path],
})
if (!page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: surround } = await useAsyncData(
  `docs-surround:${path.value}`,
  () => queryCollectionItemSurroundings('docs', path.value, { fields: ['title', 'description'] }),
  { watch: [path] },
)

const { data: nav } = await useDocsNav()
const section = computed(() => nav.value?.find((s) => path.value.startsWith(s.path))?.title)
const slug = computed(() => (path.value.startsWith('/docs/components/') ? path.value.split('/').pop()! : ''))
const reactSoon = computed(() => isReact.value && !!slug.value && !hasReactVersion(slug.value))

// Headings inside an `::fw{when="..."}` block for the other framework aren't on this page.
type MNode = string | [string, Record<string, unknown>, ...MNode[]]
interface TocLink {
  id: string
  text: string
  depth: number
  children?: TocLink[]
}
const hiddenIds = computed(() => {
  const out = new Set<string>()
  const walk = (nodes: unknown, hidden: boolean) => {
    if (!Array.isArray(nodes)) return
    for (const n of nodes as MNode[]) {
      if (!Array.isArray(n)) continue
      const [tag, attrs, ...kids] = n
      const off = hidden || (tag === 'fw' && typeof attrs?.when === 'string' && attrs.when !== fw.value)
      if (off && /^h[2-6]$/.test(tag) && typeof attrs?.id === 'string') out.add(attrs.id)
      walk(kids, off)
    }
  }
  walk((page.value?.body as { value?: unknown } | undefined)?.value, false)
  return out
})
const toc = computed(() => {
  const keep = (links: TocLink[]): TocLink[] =>
    links.filter((l) => !hiddenIds.value.has(l.id)).map((l) => (l.children ? { ...l, children: keep(l.children) } : l))
  return keep(((page.value?.body as { toc?: { links?: TocLink[] } } | undefined)?.toc?.links ?? []) as TocLink[])
})

const fwPage = <T extends { path: string }>(item: T | null | undefined): T | null | undefined => (item ? { ...item, path: to(item.path) } : item)

useSeoMeta({
  title: () => (page.value?.title && isReact.value ? `${page.value.title} (React)` : page.value?.title),
  description: () => page.value?.description,
})
</script>

<template>
  <div v-if="page" class="flex gap-12 xl:gap-16">
    <article class="min-w-0 max-w-[46rem] flex-1 pb-24 pt-10 lg:pl-10 lg:pt-12 xl:pl-14">
      <header class="mb-10">
        <p v-if="section" class="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{{ section }}</p>
        <h1 class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[2.6rem]">
          {{ page.title }}
          <span
            v-if="page.status === 'soon'"
            class="rounded-full px-2 py-0.5 align-middle font-mono text-[11px] font-normal uppercase tracking-wider text-muted-foreground shadow-[inset_0_0_0_1px_var(--border-strong)]"
          >
            Coming soon
          </span>
          <span
            v-else-if="page.badge === 'experimental'"
            class="rounded-full bg-[color-mix(in_oklch,var(--goo)_16%,transparent)] px-2 py-0.5 align-middle font-mono text-[11px] font-normal uppercase tracking-wider text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--goo)_70%,transparent)]"
          >
            New · experimental
          </span>
        </h1>
        <p v-if="page.description" class="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {{ page.description }}
        </p>
        <div v-if="reactSoon" class="react-soon mt-6 rounded-xl px-4 py-3 text-sm leading-relaxed" role="note">
          <p class="font-medium text-foreground">React version coming soon</p>
          <p class="mt-1 text-muted-foreground">
            {{ page.title }} isn't in <code>@goopui/react</code> yet. The previews and code on this page are the Vue component.
            <NuxtLink :to="canonicalPath(route.path)" class="underline underline-offset-3 hover:text-foreground">Open the Vue page</NuxtLink>.
          </p>
        </div>
      </header>

      <ContentRenderer :value="page" class="prose" />

      <DocsPager :prev="fwPage(surround?.[0])" :next="fwPage(surround?.[1])" />
    </article>

    <aside class="hidden w-52 shrink-0 xl:block">
      <div class="sticky top-[var(--header-h)] max-h-[calc(100dvh-var(--header-h))] overflow-y-auto pb-10 pt-12" data-lenis-prevent>
        <DocsToc :links="toc" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.react-soon {
  background: color-mix(in oklch, var(--goo) 7%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--goo) 45%, transparent);
}
.react-soon code {
  font-family: var(--font-mono);
  font-size: 0.85em;
}
</style>

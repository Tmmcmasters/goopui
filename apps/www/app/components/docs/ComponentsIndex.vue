<script setup lang="ts">
// /docs/components and /react/docs/components: every component docs page as a tile, grouped
// like the sidebar. On the React index, components not in @goopui/react yet say so.
import { categoryOf, componentCount, hasReactVersion } from '~/component-docs/registry'
import { CATEGORIES } from '~/component-docs/types'

const { isReact, to } = useFramework()

const { data: nav } = await useDocsNav()
const pages = computed(() => nav.value?.find((s) => s.path === '/docs/components')?.children ?? [])
const slugOf = (path: string) => path.split('/').pop() ?? ''
const groups = computed(() =>
  CATEGORIES.map((title) => ({ title, items: pages.value.filter((p) => categoryOf(slugOf(p.path)) === title) })).filter((g) => g.items.length),
)

const reactCount = computed(() => pages.value.filter((p) => hasReactVersion(slugOf(p.path))).length)
const description = computed(() =>
  isReact.value
    ? `The shadcn/ui catalog for React, made gooey. ${reactCount.value} components are ported so far; the rest show their Vue version until they land.`
    : `${componentCount} components from the shadcn catalog, made gooey. Each page has a live demo you can tune.`,
)
useSeoMeta({ title: () => (isReact.value ? 'Components (React)' : 'Components'), description })
</script>

<template>
  <div class="max-w-[60rem] pb-24 pt-10 lg:pl-10 lg:pt-12 xl:pl-14">
    <header class="mb-10">
      <p class="font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">Components</p>
      <h1 class="mt-3 text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.04em] sm:text-[2.6rem]">All components</h1>
      <p class="mt-4 max-w-[40rem] text-lg leading-relaxed text-muted-foreground text-pretty">{{ description }}</p>
    </header>

    <section v-for="g in groups" :key="g.title" class="mb-10" :aria-labelledby="`cat-${g.title}`">
      <h2 :id="`cat-${g.title}`" class="mb-3 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{{ g.title }}</h2>
      <ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <li v-for="p in g.items" :key="p.path">
          <NuxtLink :to="to(p.path)" class="tile group block overflow-hidden rounded-xl border border-border bg-card">
            <div class="tile-stage h-28">
              <DocsComponentTile :slug="slugOf(p.path)" :title="p.title" />
            </div>
            <div class="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
              <span class="truncate text-sm font-medium">{{ p.title }}</span>
              <span v-if="p.status === 'soon'" class="badge">soon</span>
              <span v-else-if="isReact && !hasReactVersion(slugOf(p.path))" class="badge" title="React version coming soon">Vue only</span>
              <span v-else-if="p.badge === 'experimental'" class="badge new">New</span>
              <SiteIcon v-else name="arrowRight" :size="14" class="arrow text-subtle" />
            </div>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.tile {
  transition:
    border-color 160ms ease,
    transform 200ms var(--ease-out-strong);
}
.tile:hover {
  border-color: var(--border-strong);
}
.tile:active {
  transform: scale(0.985);
}
.tile-stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 14px 14px;
}
.arrow {
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 160ms ease,
    transform 200ms var(--ease-out-strong);
}
.tile:hover .arrow,
.tile:focus-visible .arrow {
  opacity: 1;
  transform: none;
}
.badge {
  flex-shrink: 0;
  border-radius: 999px;
  padding: 0 0.4rem;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--subtle);
}
.badge.new {
  color: var(--foreground);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--goo) 70%, transparent);
  background: color-mix(in oklch, var(--goo) 16%, transparent);
}
@media (prefers-reduced-motion: reduce) {
  .tile,
  .arrow {
    transition: none;
  }
  .tile:active {
    transform: none;
  }
}
</style>

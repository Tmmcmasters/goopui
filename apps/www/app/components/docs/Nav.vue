<script setup lang="ts">
// Docs sidebar: a filter box, then each section. Components are grouped by category (from
// their docs entries, app/component-docs). Filtering matches page titles across sections.
import type { ContentNavigationItem } from '@nuxt/content'
import { categoryOf, hasReactVersion } from '~/component-docs/registry'
import { CATEGORIES } from '~/component-docs/types'

const emit = defineEmits<{ navigate: [] }>()
const route = useRoute()
const { isReact, to } = useFramework()
const here = computed(() => canonicalPath(route.path))
const { data: nav } = await useDocsNav()

const COMPONENTS = '/docs/components'
const filter = ref('')
const q = computed(() => filter.value.trim().toLowerCase())

interface Group {
  title: string
  items: ContentNavigationItem[]
}
const sections = computed(() =>
  (nav.value ?? [])
    .map((section) => {
      const match = (i: ContentNavigationItem) => !q.value || i.title.toLowerCase().includes(q.value)
      const items = (section.children ?? []).filter(match)
      let groups: Group[]
      if (section.path === COMPONENTS) {
        groups = CATEGORIES.map((title) => ({ title, items: items.filter((i) => categoryOf(i.path.split('/').pop() ?? '') === title) })).filter((g) => g.items.length)
      } else {
        groups = items.length ? [{ title: '', items }] : []
      }
      return { path: section.path, title: section.title, groups }
    })
    .filter((s) => s.groups.length || (!q.value && s.path === COMPONENTS)),
)
const empty = computed(() => !!q.value && !sections.value.length)
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') filter.value = ''
}
</script>

<template>
  <nav aria-label="Docs" class="text-sm">
    <div class="filter relative mb-6">
      <SiteIcon name="search" :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-subtle" />
      <input
        v-model="filter"
        type="search"
        class="h-8 w-full rounded-lg pl-8 pr-2.5 text-base lg:text-[13px]"
        placeholder="Filter pages"
        aria-label="Filter docs pages"
        @keydown="onKey"
      />
    </div>

    <div v-for="section in sections" :key="section.path" class="mb-7">
      <p class="mb-2 px-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-subtle">{{ section.title }}</p>
      <NuxtLink
        v-if="section.path === COMPONENTS && !q"
        :to="to(COMPONENTS)"
        class="nav-item mb-1 flex items-center rounded-lg px-2.5 py-1.5"
        :aria-current="here === COMPONENTS ? 'page' : undefined"
        @click="emit('navigate')"
      >
        Overview
      </NuxtLink>
      <div v-for="group in section.groups" :key="group.title" :class="group.title ? 'mt-3 first:mt-0' : ''">
        <p v-if="group.title" class="mb-1 px-2.5 text-xs text-subtle">{{ group.title }}</p>
        <ul class="grid gap-px">
          <li v-for="item in group.items" :key="item.path">
            <NuxtLink
              :to="to(item.path)"
              class="nav-item flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5"
              :aria-current="here === item.path ? 'page' : undefined"
              @click="emit('navigate')"
            >
              <span>{{ item.title }}</span>
              <span v-if="item.status === 'soon'" class="soon">soon</span>
              <span
                v-else-if="isReact && section.path === COMPONENTS && !hasReactVersion(item.path.split('/').pop() ?? '')"
                class="soon"
                title="React version coming soon"
              >Vue only</span>
              <span v-else-if="item.badge === 'experimental'" class="new" title="New · experimental">
                New<span class="sr-only"> · experimental</span>
              </span>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
    <p v-if="empty" class="px-2.5 text-[13px] text-subtle" role="status">No pages match “{{ filter }}”.</p>
  </nav>
</template>

<style scoped>
.filter input {
  color: var(--foreground);
  background: color-mix(in oklch, var(--foreground) 3%, transparent);
  box-shadow: inset 0 0 0 1px var(--border);
  transition: box-shadow 150ms ease;
}
.filter input::placeholder {
  color: var(--subtle);
}
.filter input:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.filter input:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 1px;
}
.filter input::-webkit-search-cancel-button {
  filter: grayscale(1);
  opacity: 0.6;
}
.nav-item {
  color: var(--muted-foreground);
  transition:
    color 120ms ease,
    background-color 120ms ease;
}
.nav-item:hover {
  color: var(--foreground);
  background: var(--muted);
}
.nav-item[aria-current='page'] {
  color: var(--foreground);
  background: var(--muted);
  font-weight: 500;
}
.soon {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--subtle);
}
.new {
  border-radius: 999px;
  padding: 0 0.4rem;
  font-family: var(--font-mono);
  font-size: 10px;
  line-height: 1.5;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--foreground);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--goo) 70%, transparent);
  background: color-mix(in oklch, var(--goo) 16%, transparent);
}
</style>

<script setup lang="ts">
const props = defineProps<{ wide?: boolean }>()
const route = useRoute()
const scrolled = ref(false)

const onScroll = () => {
  scrolled.value = window.scrollY > 8
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const links = [
  { to: '/docs/getting-started/introduction', label: 'Docs', match: '/docs/getting-started' },
  { to: '/docs/components/button', label: 'Components', match: '/docs/components' },
  { to: '/docs/core/api', label: 'Core', match: '/docs/core' },
]
const isActive = (match: string) => route.path.startsWith(match)
</script>

<template>
  <header
    class="site-header fixed inset-x-0 top-0 z-40 h-[var(--header-h)]"
    :data-scrolled="scrolled || undefined"
  >
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
    >
      Skip to content
    </a>
    <div
      class="mx-auto flex h-full items-center gap-2 px-4 sm:px-6"
      :class="props.wide ? 'max-w-[1440px]' : 'max-w-6xl'"
    >
      <NuxtLink to="/" class="-ml-1 rounded-md px-1 py-1 [-webkit-user-drag:none]" aria-label="goopUI home" draggable="false">
        <SiteLogo />
      </NuxtLink>
      <span
        class="ml-1 hidden rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline"
      >
        alpha
      </span>

      <nav class="ml-auto flex items-center gap-0.5" aria-label="Main">
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="l.to"
          class="nav-link hidden rounded-lg px-3 py-2 text-sm sm:inline-block"
          :data-active="isActive(l.match) || undefined"
        >
          {{ l.label }}
        </NuxtLink>
        <NuxtLink
          to="/docs/getting-started/introduction"
          class="nav-link rounded-lg px-3 py-2 text-sm sm:hidden"
          :data-active="route.path.startsWith('/docs') || undefined"
        >
          Docs
        </NuxtLink>
        <a
          href="https://github.com/Tmmcmasters/goopui"
          class="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
          aria-label="goopUI on GitHub"
          rel="noopener"
          target="_blank"
        >
          <SiteIcon name="github" :size="17" />
        </a>
        <ThemeToggle />
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  background: color-mix(in oklch, var(--background) 82%, transparent);
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  box-shadow: 0 1px 0 0 transparent;
  transition: box-shadow 200ms ease;
}
.site-header[data-scrolled] {
  box-shadow: 0 1px 0 0 var(--border);
}
.nav-link {
  color: var(--muted-foreground);
  transition:
    color 150ms ease,
    background-color 150ms ease;
}
.nav-link:hover {
  color: var(--foreground);
  background: var(--muted);
}
.nav-link[data-active] {
  color: var(--foreground);
}
</style>

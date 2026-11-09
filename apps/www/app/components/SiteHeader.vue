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

// Links follow the current framework (/docs or /react/docs; see useFramework).
const { to } = useFramework()
const links = [
  { to: '/docs/getting-started/introduction', label: 'Docs', match: '/docs/getting-started' },
  { to: '/docs/components', label: 'Components', match: '/docs/components' },
  { to: '/docs/core/api', label: 'Core', match: '/docs/core' },
]
const here = computed(() => canonicalPath(route.path))
const isActive = (match: string) => here.value.startsWith(match)
// The name starts from the visible count ("4.3k"), so voice users can say what they see.
const { stars, label: starsLabel } = useGithubStars()
const githubLabel = computed(() => (stars.value === null ? 'goopUI on GitHub' : `${starsLabel.value} stars, goopUI on GitHub`))
// The landing keeps the header quiet: see-through over the lava lamp, just Docs + GitHub + sound + theme.
const landing = computed(() => route.path === '/')
// One goo blob is the hover / keyboard-focus background of the header's links and icon
// buttons (hover only: the current section is marked by its text colour, not a pill).
const navEl = ref<HTMLElement | null>(null)
useChromeGoo(() => navEl.value, { row: true })
</script>

<template>
  <header
    class="site-header fixed inset-x-0 top-0 z-40 h-[var(--header-h)]"
    :data-scrolled="scrolled || undefined"
    :data-landing="landing || undefined"
  >
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-sm focus:text-background"
    >
      Skip to content
    </a>
    <div
      class="mx-auto flex h-full items-center gap-2 px-3 min-[360px]:px-4 sm:px-6"
      :class="props.wide ? 'max-w-[1440px]' : 'max-w-6xl'"
    >
      <NuxtLink to="/" class="-ml-1 rounded-md px-1 py-1 [-webkit-user-drag:none]" aria-label="goopUI home" draggable="false">
        <SiteLogo />
      </NuxtLink>
      <span
        v-if="!landing"
        class="ml-1 hidden rounded-full border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline"
      >
        alpha
      </span>

      <nav ref="navEl" class="ml-auto flex items-center gap-0.5" aria-label="Main" data-chrome-goo>
        <SearchPalette :wide="landing" />
        <NuxtLink
          v-for="l in links"
          :key="l.to"
          :to="to(l.to)"
          class="nav-link hidden rounded-lg px-3 py-2 text-sm"
          :class="landing ? '' : 'lg:inline-block'"
          data-chrome-item
          :data-active="isActive(l.match) || undefined"
        >
          {{ l.label }}
        </NuxtLink>
        <NuxtLink
          :to="to('/docs/getting-started/introduction')"
          class="nav-link rounded-lg px-3 py-2 text-sm"
          :class="landing ? '' : 'hidden'"
          data-chrome-item
          :data-active="here.startsWith('/docs') || undefined"
        >
          Docs
        </NuxtLink>
        <!-- The landing's quiet mobile header has no room for it (Docs, GitHub, sound, theme). -->
        <div class="mx-1 flex max-sm:mx-0" :class="landing ? 'max-sm:hidden' : ''">
          <FrameworkSwitch />
        </div>
        <a
          :href="GITHUB_URL"
          class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground max-[374.98px]:hidden"
          :aria-label="githubLabel"
          data-chrome-item
          rel="noopener"
          target="_blank"
        >
          <SiteIcon name="github" :size="17" class="shrink-0" />
          <GithubStars class="text-[13px] font-medium leading-none max-[379.98px]:hidden" />
        </a>
        <!-- Under 375px the GitHub link (also in the footer) and under 380px the star count give way so sound + theme stay on screen; the desktop links and Vue/React labels wait for `lg`. -->
        <SoundToggle data-chrome-item />
        <ThemeToggle data-chrome-item />
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
.site-header[data-landing]:not([data-scrolled]) {
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
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
}
@media (hover: hover) {
  .nav-link:hover {
    background: var(--muted);
  }
}
.nav-link[data-active] {
  color: var(--foreground);
}
</style>

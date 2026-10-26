<script setup lang="ts">
import type { GoopOptions } from '@goopui/core'

const NuxtLink = resolveComponent('NuxtLink')

// The dark card is the landing's oil slick: the whole card is a goo body with the oil
// finish (thin-film iridescence, canvas renderer). It hangs two drips, drips more where
// you hover, ripples when you click, and leans a little with the pointer. The content
// sits above the goo, unfiltered. Under reduced motion the sheen and drips hold still.
const oilCard: GoopOptions = {
  finish: 'oil',
  softness: 8,
  edge: 0.5,
  edgeSharpness: 24,
  squish: 0,
  pointerReaction: 0.3,
  inertia: 0.6,
  clickGoop: 0.25,
  shockwave: 1.2,
  dripCount: 2,
  dripSize: 16,
  dripLength: 64,
  fallDistance: 90,
  maxDrips: 12,
  restingDrips: [0.3, 0.68],
  oiliness: 0.9,
}
const ctaOptions: GoopOptions = { restingDrips: 1, dripSize: 6, dripLength: 12 }
const tab = ref<'nuxt' | 'vue'>('nuxt')

const snippets = {
  nuxt: {
    install: 'pnpm add @goopui/nuxt',
    file: 'nuxt.config.ts',
    lang: 'ts' as const,
    code: `export default defineNuxtConfig({
  modules: ['@goopui/nuxt'],
})`,
  },
  vue: {
    install: 'pnpm add @goopui/vue',
    file: 'main.css',
    lang: 'css' as const,
    code: `@import "tailwindcss";
@import "@goopui/vue/goop.css";`,
  },
}
const current = computed(() => snippets[tab.value])
</script>

<template>
  <section class="px-3 pb-24 pt-8 sm:px-6 sm:pb-32" aria-labelledby="install">
    <!-- Always the dark palette: `.dark` re-scopes every token for this subtree. -->
    <GoopHost
      v-reveal
      class="install-card dark relative mx-auto max-w-6xl rounded-[clamp(22px,3vw,34px)] px-5 py-14 sm:px-12 sm:py-20"
      :options="oilCard"
    >
      <div class="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-14">
        <div>
          <p class="font-mono text-[11px] uppercase tracking-[0.12em] opacity-60">06 · Install</p>
          <h2 id="install" class="type-display mt-4 text-[clamp(2rem,4.6vw,3.25rem)] leading-[1.02]">
            Two lines to goopy.
          </h2>
          <p class="mt-4 max-w-md leading-relaxed opacity-75">
            Add the module or the stylesheet. Then use GoopButton anywhere you'd use Button. The packages publish with v0.1.
          </p>
          <div class="mt-8 flex flex-wrap gap-3">
            <GoopHost
              :as="NuxtLink"
              to="/docs/getting-started/installation"
              class="goop-btn install-cta"
              data-size="lg"
              :options="ctaOptions"
            >
              <span data-goop-label class="inline-flex items-center gap-2">
                Installation guide
                <SiteIcon name="arrowRight" :size="16" />
              </span>
            </GoopHost>
          </div>
        </div>

        <div class="install-code min-w-0">
          <div class="mb-3 flex items-center gap-1" role="group" aria-label="Framework">
            <button
              v-for="t in ['nuxt', 'vue'] as const"
              :key="t"
              type="button"
              class="tab"
              :aria-pressed="tab === t"
              @click="tab = t"
            >
              {{ t === 'nuxt' ? 'Nuxt' : 'Vue' }}
            </button>
            <span class="ml-auto rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider soon">Coming soon</span>
          </div>
          <CodeSnippet :code="current.install" lang="shell" />
          <CodeSnippet :code="current.code" :lang="current.lang" :filename="current.file" />
        </div>
      </div>
    </GoopHost>
  </section>
</template>

<style scoped>
.install-card {
  /* The goo body paints the card; the host stays transparent. */
  --goop-color: oklch(0.15 0.008 60);
  --goop-oil-intensity: 0.62;
  --goop-oil-band-size: 1.5;
  color: var(--foreground);
}
.install-cta {
  --goop-color: var(--goo);
  color: var(--goo-foreground);
}
.tab {
  height: 2rem;
  padding: 0 0.8rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease;
}
.tab:hover {
  color: var(--foreground);
}
.tab[aria-pressed='true'] {
  color: var(--foreground);
  background: var(--muted);
}
.soon {
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
}
</style>

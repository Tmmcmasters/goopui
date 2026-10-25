<script setup lang="ts">
import type { GoopOptions } from '@goopui/core'

const NuxtLink = resolveComponent('NuxtLink')

// The dark card is the landing's oil slick: its bottom edge drips in the card's own color.
// TODO(core-feel-1): finish: 'oil' turns this edge (and the CTA) iridescent.
const oilEdge: GoopOptions = nextOptions(
  {
    interactive: false,
    drips: false,
    squish: 0,
    blur: 7,
    contrast: 24,
    threshold: 0.5,
    dripSize: 16,
    dripLength: 70,
    restingDrips: 2,
  },
  { finish: 'oil' },
)
// TODO(core-feel-1): the CTA fires a shockwave on click.
const ctaOptions: GoopOptions = nextOptions({ restingDrips: 1, dripSize: 6, dripLength: 12 }, { shockwave: true })
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
    <div v-reveal class="install-card dark relative mx-auto max-w-6xl rounded-[clamp(22px,3vw,34px)] px-5 py-14 sm:px-12 sm:py-20">
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
              Installation guide
              <SiteIcon name="arrowRight" :size="16" />
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
      <GoopHost class="oil-edge" aria-hidden="true" :options="oilEdge" />
    </div>
  </section>
</template>

<style scoped>
.install-card {
  background: var(--card);
  color: var(--foreground);
  box-shadow: inset 0 0 0 1px var(--border);
}
.oil-edge {
  position: absolute;
  left: 1px;
  right: 1px;
  bottom: 1px;
  height: 40px;
  border-radius: 0 0 calc(clamp(22px, 3vw, 34px) - 1px) calc(clamp(22px, 3vw, 34px) - 1px);
  pointer-events: none;
  --goop-color: var(--card);
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

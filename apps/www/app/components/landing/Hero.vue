<script setup lang="ts">
import { componentCount } from '~/component-docs/registry'
// The whole landing: one screen. The lava lamp carries it; the copy stays short and left.
const repo = 'https://github.com/Tmmcmasters/goopui'
// GitHub's mark (Octicons "mark-github", 16px grid).
const githubMark =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'

// Top-level components in @goopui/vue's manifest (parts like GoopDialogContent don't count).
const count = componentCount
</script>

<template>
  <section class="hero relative isolate flex min-h-[100svh] items-start sm:items-center">
    <LandingLavaLamp />
    <div class="mx-auto w-full max-w-6xl px-4 pb-20 pt-[calc(var(--header-h)+40px)] sm:pt-[calc(var(--header-h)+32px)] sm:px-6 lg:pb-24">
      <div class="max-w-[34rem]">
        <a :href="repo" target="_blank" rel="noopener" class="intro intro-1 wip">
          <span class="wip-dot" aria-hidden="true" />
          <span>Work in progress</span>
          <span class="wip-sep" aria-hidden="true">·</span>
          <span class="font-mono text-[11px] tracking-wide">alpha</span>
        </a>

        <h1 class="type-display intro intro-2 mt-6 text-[clamp(2.75rem,11vw,5.5rem)] leading-[0.95] text-balance">
          Components that drip.
        </h1>
        <p class="intro intro-3 mt-5 max-w-[36ch] text-[1.0625rem] leading-relaxed text-muted-foreground text-pretty">
          The shadcn catalog for Vue, made gooey.
        </p>

        <div class="intro intro-4 cta-row mt-8">
          <GoopButton as-child size="lg" class="cta-primary h-12 px-6 text-[15px]">
            <NuxtLink to="/docs/components">
              Browse components
              <SiteIcon name="arrowRight" :size="16" data-icon="inline-end" />
            </NuxtLink>
          </GoopButton>
          <GoopButton as-child size="lg" variant="outline" class="h-12 px-6 text-[15px]">
            <a :href="repo" target="_blank" rel="noopener">
              <svg data-icon="inline-start" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path :d="githubMark" />
              </svg>
              Star on GitHub
            </a>
          </GoopButton>
        </div>

        <p class="intro intro-4 mt-6 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
          {{ count }} components <span aria-hidden="true">·</span> Vue + Nuxt <span aria-hidden="true">·</span> MIT
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* Primary CTA in Slime: the goo button reads its color from these tokens. */
.cta-primary {
  --primary: var(--slime);
  --primary-foreground: var(--goo-foreground);
  font-weight: 600;
}
.wip {
  display: flex;
  width: fit-content;
  align-items: center;
  gap: 0.5rem;
  height: 1.875rem;
  padding: 0 0.8rem 0 0.7rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  background: color-mix(in oklch, var(--card) 70%, transparent);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    color 150ms ease,
    box-shadow 150ms ease;
}
.wip:hover {
  color: var(--foreground);
  box-shadow: inset 0 0 0 1px var(--border-strong);
}
.wip-dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: var(--slime);
  box-shadow: 0 0 0 3px color-mix(in oklch, var(--slime) 22%, transparent);
}
.wip-sep {
  color: var(--subtle);
}
/* Phones: full-width stacked CTAs (easy thumbs). From sm: side by side. */
.cta-row {
  display: grid;
  gap: 0.75rem;
}
@media (min-width: 640px) {
  .cta-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
}

/* Load-in: one short staggered rise. */
.intro {
  animation: intro-rise 900ms var(--ease-out-strong) both;
}
.intro-1 {
  animation-delay: 60ms;
}
.intro-2 {
  animation-delay: 110ms;
}
.intro-3 {
  animation-delay: 170ms;
}
.intro-4 {
  animation-delay: 230ms;
}
@keyframes intro-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (prefers-reduced-motion: reduce) {
  .intro {
    animation: none;
  }
}
html[data-reduced-motion='true'] .intro {
  animation: none;
}
</style>

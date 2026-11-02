<script setup lang="ts">
// The landing is (nearly) just this: one screen. Left, the live puddle logo, the line, two
// CTAs and a one-line meta. Right, one live card to poke (LandingLiveCard). Dark ink
// everywhere; green only on the logo and the status dot.
const repo = 'https://github.com/Tmmcmasters/goopui'
// GitHub's mark (Octicons "mark-github", 16px grid).
const githubMark =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'
</script>

<template>
  <section class="hero relative isolate">
    <div class="hero-dots" aria-hidden="true" />
    <div
      class="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-[calc(var(--header-h)+40px)] sm:px-6 sm:pt-[calc(var(--header-h)+64px)] lg:min-h-[min(100svh,960px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-14 lg:pb-20 lg:pt-[calc(var(--header-h)+32px)]"
    >
      <div class="min-w-0">
        <!-- A NuxtLink to "/": on the landing a click stays put, so the goo's click squish plays. -->
        <NuxtLink to="/" class="intro logo-link" aria-label="goopUI home" draggable="false">
          <SiteLogo size="xl" />
        </NuxtLink>

        <a :href="repo" target="_blank" rel="noopener" class="intro intro-1 wip mt-9">
          <span class="wip-dot" aria-hidden="true" />
          <span>Work in progress</span>
          <span class="wip-sep" aria-hidden="true">·</span>
          <span class="font-mono text-[11px] tracking-wide">alpha</span>
        </a>

        <h1 class="type-display intro intro-2 mt-5 text-[clamp(2.75rem,11vw,5.25rem)] leading-[0.95] text-balance">
          Components that drip.
        </h1>
        <p class="intro intro-3 mt-5 max-w-[40ch] text-[1.0625rem] leading-relaxed text-muted-foreground text-pretty">
          The shadcn catalog, made gooey. Same components and API on reka-ui, with a tiny physics engine underneath.
        </p>

        <div class="intro intro-4 cta-row mt-8">
          <GoopButton as-child size="lg" class="h-12 px-6 text-[15px]">
            <NuxtLink to="/docs/getting-started/installation">
              Get started
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
          Vue + Nuxt <span aria-hidden="true">·</span> MIT <span aria-hidden="true">·</span> Reduced-motion aware
        </p>
      </div>

      <LandingLiveCard class="intro intro-3 min-w-0" />
    </div>
  </section>
</template>

<style scoped>
/* A faint ink dot grid that fades out toward the edges: texture, not decoration. */
.hero-dots {
  position: absolute;
  inset: 0;
  z-index: -1;
  background-image: radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--foreground) 14%, transparent) 1px, transparent 0);
  background-size: 22px 22px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
  pointer-events: none;
}
.logo-link {
  display: inline-block;
  border-radius: 0.75rem;
  outline-offset: 8px;
  -webkit-user-drag: none;
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
  background: var(--card);
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

<script setup lang="ts">
// Launch hero: the live puddle logo, the line, two CTAs. The showcase right under it is
// the real demo, so the hero stays short and quiet (dark ink; green only on the logo).
const repo = 'https://github.com/Tmmcmasters/goopui'
// GitHub's mark (Octicons "mark-github", 16px grid).
const githubMark =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'
</script>

<template>
  <section class="hero mx-auto flex max-w-6xl flex-col items-center px-4 pb-12 pt-[calc(var(--header-h)+56px)] text-center sm:px-6 sm:pb-16 sm:pt-[calc(var(--header-h)+80px)]">
    <!-- A NuxtLink to "/": on the landing a click stays put, so the goo's click squish plays. -->
    <NuxtLink to="/" class="intro logo-link" aria-label="goopUI home" draggable="false">
      <SiteLogo size="xl" />
    </NuxtLink>

    <a :href="repo" target="_blank" rel="noopener" class="intro intro-1 wip mt-10">
      <span class="wip-dot" aria-hidden="true" />
      <span>Work in progress</span>
      <span class="wip-sep" aria-hidden="true">·</span>
      <span class="font-mono text-[11px] tracking-wide">alpha</span>
    </a>

    <h1 class="type-display intro intro-2 mt-5 text-[clamp(2.75rem,8.4vw,6rem)] leading-[0.95] text-balance">
      Components that drip.
    </h1>
    <p class="intro intro-3 mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-muted-foreground text-pretty sm:text-lg">
      goopUI is the shadcn catalog made gooey. Same components, same API, built on reka-ui, with a tiny physics engine
      that makes them swell, squish, and drip.
    </p>

    <div class="intro intro-4 mt-9 flex flex-wrap items-center justify-center gap-3">
      <GoopButton as-child size="lg" class="h-11 px-5 text-[15px]" :resting-drips="1">
        <NuxtLink to="/docs/getting-started/installation">
          Get started
          <SiteIcon name="arrowRight" :size="16" data-icon="inline-end" />
        </NuxtLink>
      </GoopButton>
      <GoopButton as-child size="lg" variant="outline" class="h-11 px-5 text-[15px]">
        <a :href="repo" target="_blank" rel="noopener">
          <svg data-icon="inline-start" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path :d="githubMark" />
          </svg>
          Star on GitHub
        </a>
      </GoopButton>
    </div>
  </section>
</template>

<style scoped>
.logo-link {
  display: block;
  border-radius: 0.75rem;
  outline-offset: 8px;
  -webkit-user-drag: none;
}
.wip {
  display: inline-flex;
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

/* Load-in: one short staggered rise for the hero. */
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

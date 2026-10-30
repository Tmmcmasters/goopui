<script setup lang="ts">
// The whole site: brand, a "coming soon" line, and four live components to poke.
const pokes = ref(0)
const goo = ref(true)
const level = ref([62])

const repo = 'https://github.com/Tmmcmasters/goopui'
// GitHub's mark (Octicons "mark-github", 16px grid).
const githubMark =
  'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'
</script>

<template>
  <main class="relative flex min-h-dvh w-full flex-col overflow-x-clip">
    <div class="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
      <header class="flex justify-center pt-10 sm:pt-14">
        <!-- NuxtLink: on this one-page site a click stays put, so the goo's click splash plays. -->
        <NuxtLink to="/" class="logo-link" aria-label="goopUI home" draggable="false">
          <GoopLogo size="lg" />
        </NuxtLink>
      </header>

      <section class="intro flex flex-1 flex-col items-center justify-center py-12 text-center sm:py-16">
        <p class="inline-flex items-center gap-2 rounded-full bg-goo px-3 py-1 text-xs font-medium text-goo-foreground">
          <span class="size-1.5 rounded-full bg-goo-foreground" aria-hidden="true" />
          Coming soon
        </p>
        <h1 class="type-display mt-6 text-[clamp(2.75rem,9vw,6.5rem)] leading-[0.95] text-balance">
          Components that drip.
        </h1>
        <p class="mt-5 max-w-[42ch] text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          goopUI is the shadcn catalog made gooey: same components, same API, with a tiny physics engine that makes
          them swell, squish, and drip. Vue first. Here's a sneak peek.
        </p>
        <div class="mt-7">
          <GoopButton as-child size="lg">
            <a :href="repo" target="_blank" rel="noopener">
              <svg data-icon="inline-start" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path :d="githubMark" />
              </svg>
              Star on GitHub
            </a>
          </GoopButton>
        </div>

        <ul class="mt-12 grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Sneak peek">
          <li class="peek">
            <span class="peek-label">Button</span>
            <div class="peek-stage">
              <GoopButton :resting-drips="1" @click="pokes++">Poke me</GoopButton>
            </div>
            <span class="peek-hint" aria-live="polite">{{ pokes ? `${pokes} poke${pokes === 1 ? '' : 's'}` : 'Click or swipe it' }}</span>
          </li>

          <li class="peek">
            <span class="peek-label">Switch</span>
            <div class="peek-stage">
              <label class="flex items-center gap-2.5 text-sm">
                <GoopSwitch v-model="goo" />
                Goo {{ goo ? 'on' : 'off' }}
              </label>
            </div>
            <span class="peek-hint">Flip it a few times</span>
          </li>

          <li class="peek">
            <span class="peek-label">Slider</span>
            <div class="peek-stage px-2">
              <GoopSlider v-model="level" :max="100" :step="1" aria-label="Gooeyness" class="w-full" />
            </div>
            <span class="peek-hint tabular-nums">Gooeyness {{ level[0] }}%</span>
          </li>

          <li class="peek">
            <span class="peek-label">Tooltip</span>
            <div class="peek-stage">
              <GoopTooltipProvider :delay-duration="150">
                <GoopTooltip>
                  <GoopTooltipTrigger as-child>
                    <GoopButton variant="outline">Hover me</GoopButton>
                  </GoopTooltipTrigger>
                  <GoopTooltipContent>Dripping with details</GoopTooltipContent>
                </GoopTooltip>
              </GoopTooltipProvider>
            </div>
            <span class="peek-hint">Hover or focus it</span>
          </li>
        </ul>
      </section>

      <footer class="pb-8 text-center text-xs text-muted-foreground">
        goopUI · Vue and Nuxt first, React and Svelte after ·
        <a :href="repo" target="_blank" rel="noopener" class="underline underline-offset-4 hover:text-foreground">GitHub</a>
      </footer>
    </div>
  </main>
</template>

<style scoped>
.logo-link {
  display: block;
  border-radius: 0.75rem;
  outline-offset: 6px;
  -webkit-user-drag: none;
}
.logo-link:focus-visible {
  outline: 2px solid var(--ring);
}
.peek {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 0.875rem 1rem;
  border: 1px solid var(--border);
  border-radius: 1.25rem;
  min-width: 0;
  background: var(--card);
}
.peek-label {
  align-self: flex-start;
  font-family: var(--font-display);
  font-weight: 560;
  font-size: 0.9375rem;
  color: var(--goo-ink);
}
.peek-stage {
  display: grid;
  place-items: center;
  width: 100%;
  /* Room under the button for its resting drip. */
  min-height: 5rem;
}
.peek-hint {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted-foreground);
}

.intro > * {
  animation: rise 800ms var(--ease-out-strong) both;
}
.intro > :nth-child(2) {
  animation-delay: 60ms;
}
.intro > :nth-child(3) {
  animation-delay: 120ms;
}
.intro > :nth-child(4) {
  animation-delay: 160ms;
}
.intro > :nth-child(5) {
  animation-delay: 220ms;
}
@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@media (min-width: 640px) {
  .peek {
    padding: 1rem 1.25rem 1.125rem;
  }
}
@media (prefers-reduced-motion: reduce) {
  .intro > * {
    animation: none;
  }
}
</style>

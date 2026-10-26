<script setup lang="ts">
// The slime slab. The whole panel is one goo body (canvas renderer, interactive), so the
// engine does all of it: hover drips along the bottom edge under the cursor, lean and
// momentum, a click-like shockwave on fast swipes (hitEffect: 'shockwave') and on clicks,
// with particles that fly across the page (splash: 'escape'). Organic resting drips are
// placed per drip ({ x, size, length }). Reduced motion: still shape + resting drips.
//
// Until the goo attaches (SSR, slow JS) the panel paints its own background, so it never
// flashes empty.
import type { GoopHandle, GoopOptions } from '@goopui/core'

const { reduced } = useMotionPreference()
const NuxtLink = resolveComponent('NuxtLink')

const section = ref<HTMLElement | null>(null)
const ready = ref(false)
let slab: GoopHandle | null = null

const SLAB: GoopOptions = {
  renderer: 'canvas',
  softness: 7,
  edgeSharpness: 24,
  // 0.5 keeps the straight edges exactly on the box, so the goo body matches the panel.
  edge: 0.5,
  thickness: 1.2,
  dripSize: 15,
  dripLength: 70,
  dripCount: 2,
  dripVariance: 0.75,
  maxDrips: 16,
  fallDistance: 170,
  gravity: 950,
  // A big fat drip, a little one beside it, the longest one, a medium one near the corner.
  restingDrips: [
    { x: 0.25, size: 1.15, length: 1.3 },
    { x: 0.37, size: 0.6, length: 0.55 },
    { x: 0.71, size: 1.45, length: 2.1 },
    { x: 0.885, size: 0.85, length: 0.9 },
  ],
  // A panel this big should barely lean; the goo, not the layout, does the moving.
  pointerReaction: 0.22,
  inertia: 0.8,
  squish: 0.012,
  clickGoop: 0.12,
  shockwave: 1.4,
  hitEffect: 'shockwave',
  splash: 'escape',
  oiliness: 0.6,
  // Pulling taffy out of a text panel fights text selection; gloss and puddles stay off.
  taffy: false,
  gloss: false,
  puddles: false,
  keyboard: false,
}

const ctaOptions: GoopOptions = { restingDrips: 1, dripSize: 7, dripLength: 14 }

const onSlab = (h: GoopHandle) => {
  slab = h
  ready.value = true
}

// An idle drip now and then keeps the panel alive when nobody's touching it.
let visible = true
let lastActive = 0
let ambientTimer: ReturnType<typeof setTimeout> | undefined
const scheduleAmbient = () => {
  clearTimeout(ambientTimer)
  ambientTimer = setTimeout(
    () => {
      const host = slab?.layer.parentElement
      if (host && visible && !document.hidden && performance.now() - lastActive > 2200) {
        slab?.drip(host.offsetWidth * (0.1 + Math.random() * 0.8))
      }
      scheduleAmbient()
    },
    1900 + Math.random() * 2200,
  )
}
const markActive = () => (lastActive = performance.now())

let io: IntersectionObserver | null = null
onMounted(() => {
  io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
  if (section.value) io.observe(section.value)
  scheduleAmbient()
})
onUnmounted(() => {
  clearTimeout(ambientTimer)
  io?.disconnect()
})

const copied = ref(false)
const copyInstall = async () => {
  try {
    await navigator.clipboard.writeText('pnpm add @goopui/nuxt')
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  } catch {}
}
</script>

<template>
  <section
    ref="section"
    class="hero relative px-3 pb-16 pt-[calc(var(--header-h)+12px)] sm:px-6 sm:pb-24 sm:pt-[calc(var(--header-h)+20px)]"
    data-goop-splash-zone
    @pointermove.passive="markActive"
  >
    <!-- pb-16/24 below the slab is the runway for falling drops. Shockwave particles leave
         it and fly across the page in the engine's shared overlay. -->
    <GoopHost
      class="slab relative mx-auto max-w-6xl"
      :data-ready="ready || undefined"
      :data-reduced="reduced || undefined"
      :options="SLAB"
      @ready="onSlab"
    >
      <div class="relative z-10 px-6 pb-16 pt-14 sm:px-12 sm:pb-24 sm:pt-20 lg:px-16 lg:pb-28 lg:pt-24">
        <p class="intro intro-1 inline-flex items-center gap-2 rounded-full bg-goo-foreground/8 px-3 py-1 font-mono text-xs">
          <span class="size-1.5 rounded-full bg-goo-foreground" />
          shadcn, but it drips
        </p>
        <h1
          class="type-display intro intro-2 mt-6 text-[clamp(3rem,9.6vw,8.5rem)] leading-[0.94] text-balance"
        >
          Components that drip.
        </h1>
        <p class="intro intro-3 mt-6 max-w-[44ch] text-[1.0625rem] leading-relaxed text-goo-foreground/80 sm:text-lg">
          goopUI is the shadcn catalog made gooey. Same components, same API, built on reka-ui, with a tiny physics
          engine that makes them swell, squish, and drip.
        </p>
        <!-- The CTAs have their own goo; keep their presses from also hitting the panel. -->
        <div class="intro intro-4 mt-9 flex flex-wrap items-center gap-3" @pointerdown.stop>
          <GoopHost
            :as="NuxtLink"
            to="/docs/getting-started/introduction"
            class="goop-btn hero-cta"
            data-size="lg"
            :options="ctaOptions"
          >
            <span data-goop-label class="inline-flex items-center gap-2">
              Read the docs
              <SiteIcon name="arrowRight" :size="16" />
            </span>
          </GoopHost>
          <button type="button" class="install-chip" :aria-label="copied ? 'Copied' : 'Copy install command'" @click="copyInstall">
            <span class="opacity-60">$</span>
            <span>pnpm add @goopui/nuxt</span>
            <span class="relative grid size-4 place-items-center">
              <Transition name="swap" mode="out-in">
                <SiteIcon v-if="copied" key="c" name="check" :size="15" />
                <SiteIcon v-else key="p" name="copy" :size="15" class="opacity-60" />
              </Transition>
            </span>
          </button>
        </div>
        <p class="intro intro-4 mt-3 font-mono text-[11px] text-goo-foreground/80">Packages publish with v0.1. The engine is live on this page.</p>
        <p class="intro intro-5 mt-14 font-mono text-xs text-goo-foreground/80 sm:absolute sm:bottom-14 sm:right-12 sm:mt-0 lg:right-16">
          <span class="hidden sm:inline">Hover, swipe hard, click ↓</span>
          <span class="sm:hidden">Tap the slime ↓</span>
        </p>
      </div>

    </GoopHost>
  </section>
</template>

<style scoped>
.slab {
  --slab-r: clamp(22px, 3vw, 34px);
  /* Painted by the goo body once it attaches; until then (SSR) the panel paints itself. */
  background: var(--goo);
  color: var(--goo-foreground);
  border-radius: var(--slab-r);
  --goop-color: var(--goo);
}
.slab[data-ready] {
  background: transparent;
}
.hero-cta {
  --goop-color: var(--goo-foreground);
  color: var(--goo);
}
.install-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  height: 3rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--goo-foreground);
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--goo-foreground) 22%, transparent);
  transition:
    background-color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.install-chip:hover {
  background: color-mix(in oklch, var(--goo-foreground) 7%, transparent);
}
.install-chip:active {
  transform: scale(0.97);
}

/* Load-in: a short staggered rise. Hero only; the rest of the page uses v-reveal. */
.intro {
  animation: intro-rise 900ms var(--ease-out-strong) both;
}
.intro-2 {
  animation-delay: 60ms;
}
.intro-3 {
  animation-delay: 120ms;
}
.intro-4 {
  animation-delay: 180ms;
}
.intro-5 {
  animation-delay: 420ms;
}
.slab {
  animation: slab-in 1000ms var(--ease-out-strong) both;
}
@keyframes intro-rise {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}
@keyframes slab-in {
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
}
@media (prefers-reduced-motion: reduce) {
  .intro,
  .slab {
    animation: none;
  }
}
html[data-reduced-motion='true'] .intro,
html[data-reduced-motion='true'] .slab {
  animation: none;
}

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 120ms ease,
    transform 160ms var(--ease-out-strong);
}
.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>

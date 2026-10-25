<script setup lang="ts">
// The slime slab. A solid rounded panel whose bottom edge is a live goo body:
// moving the pointer across the hero pours drips from the edge right under the cursor,
// taps drip on touch, and an idle "ambient" drip keeps it alive when nobody's touching it.
// Only the thin edge strip is filtered (not the whole panel), which keeps the SVG filter
// region small enough to stay smooth in Safari.
import type { GoopHandle, GoopOptions } from '@goopui/core'

const { reduced } = useMotionPreference()
const NuxtLink = resolveComponent('NuxtLink')

const section = ref<HTMLElement | null>(null)
const edge = ref<{ $el: HTMLElement } | null>(null)
let handle: GoopHandle | null = null

const edgeOptions: GoopOptions = {
  interactive: false,
  squish: 0,
  blur: 7,
  contrast: 24,
  // 0.5 keeps straight goo edges exactly on the box edge, so the strip meets the slab
  // without a visible step.
  threshold: 0.5,
  dripSize: 12,
  dripLength: 30,
  dripCount: 1,
  fall: 150,
  gravity: 950,
  viscosity: 1.15,
  restingDrips: 5,
}

const ctaOptions: GoopOptions = { restingDrips: 1, dripSize: 6, dripLength: 12 }

let lastX = -1e9
let lastT = 0
let visible = true
let ambientTimer: ReturnType<typeof setTimeout> | undefined

const edgeX = (clientX: number): number | null => {
  const el = edge.value?.$el
  if (!el) return null
  const r = el.getBoundingClientRect()
  const x = clientX - r.left
  return x >= 0 && x <= r.width ? x : null
}

const pour = (x: number) => {
  handle?.drip(x)
  lastX = x
  lastT = performance.now()
}

const onMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse' || !handle) return
  const x = edgeX(e.clientX)
  if (x === null) return
  // A drip per ~80px of travel, or every ~0.6s while hovering in one spot.
  const now = performance.now()
  if (Math.abs(x - lastX) > 80 || now - lastT > 600) pour(x)
}

const onTap = (e: PointerEvent) => {
  if (e.pointerType === 'mouse' || !handle) return
  const x = edgeX(e.clientX)
  if (x !== null) pour(x)
}

const scheduleAmbient = () => {
  clearTimeout(ambientTimer)
  ambientTimer = setTimeout(
    () => {
      const el = edge.value?.$el
      // Only when idle, on screen, and the tab is visible.
      if (handle && el && visible && !document.hidden && performance.now() - lastT > 1800) {
        const w = el.offsetWidth
        handle.drip(w * (0.12 + Math.random() * 0.76))
      }
      scheduleAmbient()
    },
    1600 + Math.random() * 1600,
  )
}

let io: IntersectionObserver | null = null
const onReady = (h: GoopHandle) => {
  handle = h
}

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
    class="hero relative px-3 pt-[calc(var(--header-h)+12px)] sm:px-6 sm:pt-[calc(var(--header-h)+20px)]"
    @pointermove="onMove"
    @pointerup="onTap"
  >
    <div class="slab relative mx-auto max-w-6xl" :data-reduced="reduced || undefined">
      <div class="relative z-10 px-6 pb-16 pt-14 sm:px-12 sm:pb-24 sm:pt-20 lg:px-16 lg:pb-28 lg:pt-24">
        <p class="intro intro-1 inline-flex items-center gap-2 rounded-full bg-goo-foreground/8 px-3 py-1 font-mono text-xs">
          <span class="size-1.5 rounded-full bg-goo-foreground" />
          shadcn, but it drips
        </p>
        <h1
          class="intro intro-2 mt-6 text-[clamp(3rem,10.2vw,9.25rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-balance"
        >
          Components that drip.
        </h1>
        <p class="intro intro-3 mt-6 max-w-[44ch] text-[1.0625rem] leading-relaxed text-goo-foreground/80 sm:text-lg">
          goopUI is the shadcn catalog made gooey. Same components, same API, built on reka-ui, with a tiny physics
          engine that makes them swell, squish, and drip.
        </p>
        <div class="intro intro-4 mt-9 flex flex-wrap items-center gap-3">
          <GoopHost
            :as="NuxtLink"
            to="/docs/getting-started/introduction"
            class="goop-btn hero-cta"
            data-size="lg"
            :options="ctaOptions"
          >
            Read the docs
            <SiteIcon name="arrowRight" :size="16" />
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
        <p class="intro intro-4 mt-3 font-mono text-[11px] text-goo-foreground/65">Packages publish with v0.1. The engine is live on this page.</p>
        <p class="intro intro-5 mt-14 font-mono text-xs text-goo-foreground/70 sm:absolute sm:bottom-14 sm:right-12 sm:mt-0 lg:right-16">
          <span class="hidden sm:inline">Run your cursor along the slime ↓</span>
          <span class="sm:hidden">Tap the slime ↓</span>
        </p>
      </div>

      <!-- The dripping edge: same color as the slab, overlapping its bottom. -->
      <GoopHost ref="edge" class="slab-edge" aria-hidden="true" :options="edgeOptions" @ready="onReady" />
    </div>

  </section>
</template>

<style scoped>
.slab {
  --slab-r: clamp(22px, 3vw, 34px);
  /* The goo strip overlaps the slab's bottom edge in the same color. With threshold 0.5
     its straight edges land exactly on the box, and its slightly softer corners hide
     under the slab's own, so the drips read as coming out of the panel itself. */
  background: var(--goo);
  color: var(--goo-foreground);
  border-radius: var(--slab-r);
  --goop-color: var(--goo);
}
.slab-edge {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 40px;
  border-radius: 0 0 var(--slab-r) var(--slab-r);
  pointer-events: none;
  z-index: 1;
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

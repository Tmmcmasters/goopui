<script setup lang="ts">
// The slime slab. A solid rounded panel whose bottom edge is live goo.
//
// The edge is one full-width goo body (the "main" edge: pointer drips, splashes,
// shockwaves) plus two short accent bodies that only hold one fat or one small resting
// drip each. Resting drips take positions now, but every drip on one body shares a size,
// so the accents are what make the edge uneven: a big long drip, a little one, and two
// medium ones on the main body. Accent spans overlap the main body, so their softened
// corners hide under its flat edge.
//
// Interaction:
//   - moving the pointer pours a drip from the edge under the cursor;
//   - a hard swipe punches goo out of the edge and it flies across the page
//     (splash: 'escape', carrying the swipe's velocity);
//   - clicking the slab fires a shockwave from that spot and swells the edge;
//   - taps drip on touch; an idle drip keeps it alive while on screen.
// Reduced motion: the engine ignores all of it and keeps the still resting drips.
import type { GoopHandle, GoopOptions } from '@goopui/core'

const { reduced } = useMotionPreference()
const NuxtLink = resolveComponent('NuxtLink')

const section = ref<HTMLElement | null>(null)
const slab = ref<HTMLElement | null>(null)

/** px/s of pointer travel that counts as a hard swipe. */
const HARD_SWIPE_SPEED = 2000
/** Cap on the velocity handed to the splash. */
const SPLASH_MAX_SPEED = 2600

const edgeBase: GoopOptions = {
  interactive: false,
  squish: 0,
  blur: 7,
  contrast: 24,
  // 0.5 keeps straight goo edges exactly on the box edge, so the bodies meet the slab
  // (and each other) without a visible step.
  threshold: 0.5,
  gravity: 950,
  viscosity: 1.2,
}

const MAIN: GoopOptions = {
  ...edgeBase,
  dripCount: 1,
  dripSize: 15,
  dripLength: 70,
  fall: 170,
  maxDrips: 16,
  restingDrips: [0.25, 0.885],
  splash: 'escape',
  splashAmount: 2.2,
  oiliness: 0.6,
  shockwave: 1.4,
  clickMass: 0,
}

interface Accent {
  from: number
  to: number
  options: GoopOptions
}
const ACCENTS: Accent[] = [
  // A small one close beside the left drip.
  { from: 0.31, to: 0.43, options: { ...edgeBase, drips: false, dripSize: 10, dripLength: 34, restingDrips: [0.5] } },
  // The biggest, longest drip.
  { from: 0.62, to: 0.8, options: { ...edgeBase, drips: false, dripSize: 22, dripLength: 112, restingDrips: [0.5] } },
]

let main: GoopHandle | null = null
const onMain = (h: GoopHandle) => {
  main = h
}

const ctaOptions: GoopOptions = { restingDrips: 1, dripSize: 7, dripLength: 14 }

/** Viewport point -> main edge host px, or null if x isn't over the slab. */
const toEdge = (clientX: number, clientY?: number): { x: number; y: number } | null => {
  const host = main?.layer.parentElement
  if (!host) return null
  const r = host.getBoundingClientRect()
  const x = clientX - r.left
  if (x < 0 || x > r.width) return null
  return { x, y: clientY === undefined ? r.height / 2 : clientY - r.top }
}

let lastX = -1e9
let lastT = 0
let lastSplash = 0
let prevX = 0
let prevY = 0
let prevT = 0
let visible = true
let ambientTimer: ReturnType<typeof setTimeout> | undefined

const pour = (clientX: number) => {
  const p = toEdge(clientX)
  if (!p) return
  main?.drip(p.x)
  lastX = clientX
  lastT = performance.now()
}

const onMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return
  const now = performance.now()
  const dt = Math.max(1, now - prevT) / 1000
  const vx = prevT ? (e.clientX - prevX) / dt : 0
  const vy = prevT ? (e.clientY - prevY) / dt : 0
  prevX = e.clientX
  prevY = e.clientY
  prevT = now
  const speed = Math.hypot(vx, vy)
  if (speed > HARD_SWIPE_SPEED && now - lastSplash > 320) {
    const p = toEdge(e.clientX)
    if (p) {
      // Punch through the edge. Raw pointer speeds can hit 10k px/s, which throws the goo
      // off-screen in a frame, so cap it; tip it downward so it spills out of the slab and
      // arcs across the page instead of skimming along the edge.
      const k = Math.min(1, SPLASH_MAX_SPEED / speed)
      main?.splashThrough(p.x, p.y, vx * k, Math.max(vy * k, 220 + Math.abs(vx * k) * 0.2))
      lastSplash = now
      lastT = now
      return
    }
  }
  // Fewer, fatter drips: one per ~130px of travel, or every ~0.9s in one spot.
  if (Math.abs(e.clientX - lastX) > 130 || now - lastT > 900) pour(e.clientX)
}

const onTap = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') pour(e.clientX)
}

const onClick = (e: MouseEvent) => {
  // Clicks on the CTAs belong to them (they fire their own shockwave).
  if ((e.target as Element).closest('a, button')) return
  const p = toEdge(e.clientX)
  if (!p) return
  // The ring starts on the edge below the click, stronger the closer the click was.
  const host = main?.layer.parentElement
  const dist = host ? Math.max(0, host.getBoundingClientRect().top - e.clientY) : 0
  main?.shockwave(p.x, p.y, 1.8 - Math.min(0.9, dist / 600))
  lastT = performance.now()
}

const scheduleAmbient = () => {
  clearTimeout(ambientTimer)
  ambientTimer = setTimeout(
    () => {
      const el = slab.value
      // Only when idle, on screen, and the tab is visible.
      if (el && visible && !document.hidden && performance.now() - lastT > 2200) {
        const r = el.getBoundingClientRect()
        pour(r.left + r.width * (0.1 + Math.random() * 0.8))
      }
      scheduleAmbient()
    },
    1900 + Math.random() * 2200,
  )
}

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
    @pointermove="onMove"
    @pointerup="onTap"
  >
    <!-- pb-16/24 below the slab is the runway for falling drops. Escape splashes leave it
         and fly across the page in the engine's shared overlay. -->
    <div ref="slab" class="slab relative mx-auto max-w-6xl" :data-reduced="reduced || undefined" @click="onClick">
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
        <p class="intro intro-4 mt-3 font-mono text-[11px] text-goo-foreground/80">Packages publish with v0.1. The engine is live on this page.</p>
        <p class="intro intro-5 mt-14 font-mono text-xs text-goo-foreground/80 sm:absolute sm:bottom-14 sm:right-12 sm:mt-0 lg:right-16">
          <span class="hidden sm:inline">Run your cursor along the slime ↓</span>
          <span class="sm:hidden">Tap the slime ↓</span>
        </p>
      </div>

      <!-- The dripping edge: one main body plus two accent drips, all in the slab's color. -->
      <GoopHost class="slab-edge inset-x-0 slab-edge-main" aria-hidden="true" :options="MAIN" @ready="onMain" />
      <GoopHost
        v-for="(a, i) in ACCENTS"
        :key="i"
        class="slab-edge"
        aria-hidden="true"
        :style="{ left: `${a.from * 100}%`, right: `${(1 - a.to) * 100}%` }"
        :options="a.options"
      />
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
  bottom: 0;
  height: 40px;
  pointer-events: none;
  z-index: 1;
}
.slab-edge-main {
  border-radius: 0 0 var(--slab-r) var(--slab-r);
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

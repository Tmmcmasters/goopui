<script setup lang="ts">
// The slime slab. A solid rounded panel whose bottom edge is live goo.
//
// The edge is several overlapping goo strips, not one. Today's engine spaces resting drips
// evenly along a body, so a single strip reads as a row of teeth; giving each strip its own
// span, drip size, and drip length puts a few fat, uneven drips exactly where we want them.
// Strips overlap so each one's softened corners hide under its neighbor's flat body.
//
// Interaction today:
//   - moving the pointer pours a drip from the strip under the cursor;
//   - a hard swipe pours a small burst;             TODO(core-feel-1): splash 'escape'
//   - clicking the slab drips at the click point;   TODO(core-feel-1): shockwave
//   - taps drip on touch; an idle drip keeps it alive while on screen.
// Round-3 options are already requested through nextOptions() (see utils/goopNext.ts).
import type { GoopHandle, GoopOptions } from '@goopui/core'

const { reduced } = useMotionPreference()
const NuxtLink = resolveComponent('NuxtLink')

const section = ref<HTMLElement | null>(null)
const slab = ref<HTMLElement | null>(null)

interface Segment {
  /** Span along the slab's bottom edge, as fractions of its width. */
  from: number
  to: number
  /** One resting drip at the span's center, or none. */
  rest: 0 | 1
  size: number
  length: number
  fall: number
}

// Hand-placed for an organic edge: a fat long drip, a small one close beside it, a wide
// calm stretch, the biggest drip, then a medium one near the right corner.
const SEGMENTS: Segment[] = [
  { from: 0, to: 0.2, rest: 0, size: 13, length: 36, fall: 150 },
  { from: 0.16, to: 0.34, rest: 1, size: 18, length: 84, fall: 190 },
  { from: 0.3, to: 0.44, rest: 1, size: 11, length: 34, fall: 120 },
  { from: 0.4, to: 0.66, rest: 0, size: 15, length: 48, fall: 160 },
  { from: 0.62, to: 0.8, rest: 1, size: 22, length: 112, fall: 220 },
  { from: 0.76, to: 1, rest: 1, size: 13, length: 52, fall: 150 },
]

const segmentOptions = (s: Segment): GoopOptions =>
  nextOptions(
    {
      interactive: false,
      squish: 0,
      blur: 7,
      contrast: 24,
      // 0.5 keeps straight goo edges exactly on the box edge, so strips meet the slab
      // (and each other) without a visible step.
      threshold: 0.5,
      dripCount: 1,
      dripSize: s.size,
      dripLength: s.length,
      fall: s.fall,
      gravity: 950,
      viscosity: 1.2,
      restingDrips: s.rest,
    },
    // TODO(core-feel-1): momentum-carrying goo, escape splashes, click shockwave.
    { momentum: true, splash: 'escape', shockwave: true },
  )
const SEGMENT_OPTIONS = SEGMENTS.map(segmentOptions)

const handles: (GoopHandle | null)[] = SEGMENTS.map(() => null)
const onReady = (i: number, h: GoopHandle) => {
  handles[i] = h
}

// TODO(core-feel-1): the CTA fires a shockwave on click.
const ctaOptions: GoopOptions = nextOptions({ restingDrips: 1, dripSize: 7, dripLength: 14 }, { shockwave: true })

/** Which strip owns slab-relative x: the one containing it whose center is nearest. */
const pick = (fx: number): number => {
  let best = -1
  let bestD = Infinity
  SEGMENTS.forEach((s, i) => {
    if (fx < s.from || fx > s.to) return
    const d = Math.abs(fx - (s.from + s.to) / 2)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return best
}

/** Drip at viewport x. Returns false if x isn't over the slab. */
const dripAt = (clientX: number): boolean => {
  const el = slab.value
  if (!el) return false
  const r = el.getBoundingClientRect()
  const fx = (clientX - r.left) / r.width
  const i = pick(fx)
  if (i < 0) return false
  const s = SEGMENTS[i]!
  handles[i]?.drip((fx - s.from) * r.width)
  return true
}

let lastX = -1e9
let lastT = 0
let prevX = 0
let prevT = 0
let visible = true
let ambientTimer: ReturnType<typeof setTimeout> | undefined

const pour = (clientX: number) => {
  if (dripAt(clientX)) {
    lastX = clientX
    lastT = performance.now()
  }
}

const onMove = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') return
  const now = performance.now()
  const speed = prevT ? (Math.abs(e.clientX - prevX) / Math.max(1, now - prevT)) * 1000 : 0
  const dir = Math.sign(e.clientX - prevX) || 1
  prevX = e.clientX
  prevT = now
  if (speed > HARD_SWIPE_SPEED && now - lastT > 250) {
    // TODO(core-feel-1): a hard swipe splashes goo across the page (splash: 'escape',
    // carrying the pointer velocity). Today: a small burst along the swipe.
    const x = e.clientX
    pour(x)
    setTimeout(() => dripAt(x + dir * 90), 70)
    return
  }
  // Fewer, fatter drips: one per ~130px of travel, or every ~0.9s in one spot.
  if (Math.abs(e.clientX - lastX) > 130 || now - lastT > 900) pour(e.clientX)
}

const onTap = (e: PointerEvent) => {
  if (e.pointerType !== 'mouse') pour(e.clientX)
}

const onClick = (e: MouseEvent) => {
  // Clicks on the CTAs belong to them.
  if ((e.target as Element).closest('a, button')) return
  // TODO(core-feel-1): fire a shockwave from the click point through the slab's goo.
  if (e.detail > 0) pour(e.clientX)
}

const scheduleAmbient = () => {
  clearTimeout(ambientTimer)
  ambientTimer = setTimeout(
    () => {
      const el = slab.value
      // Only when idle, on screen, and the tab is visible.
      if (el && visible && !document.hidden && performance.now() - lastT > 2200) {
        const r = el.getBoundingClientRect()
        dripAt(r.left + r.width * (0.1 + Math.random() * 0.8))
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
    <!-- pb-16/24 below the slab is the landing runway for falling drops (and, with the
         round-3 engine, where splashes land before escaping into the page overlay). -->
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

      <!-- The dripping edge: overlapping strips in the slab's color. -->
      <GoopHost
        v-for="(seg, i) in SEGMENTS"
        :key="i"
        class="slab-edge"
        aria-hidden="true"
        :style="{
          left: `${seg.from * 100}%`,
          right: `${(1 - seg.to) * 100}%`,
          borderBottomLeftRadius: seg.from === 0 ? 'var(--slab-r)' : '0',
          borderBottomRightRadius: seg.to === 1 ? 'var(--slab-r)' : '0',
        }"
        :options="SEGMENT_OPTIONS[i]"
        @ready="(h: GoopHandle) => onReady(i, h)"
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

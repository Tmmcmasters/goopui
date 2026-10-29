<script setup lang="ts">
// goopUI lockup with a LIVE mark: the Slime puddle is a real goop engine body (@goopui/core's
// attachGoop, SVG renderer), so it wobbles toward the cursor, sloshes, tears droplets off on a
// fast pass and squishes + ripples on click, like GoopButton. The wordmark is DynaPuff outlines
// (ink = currentColor).
//
// Shape: a round host (52x38 design px) with two lumps tucked into its underside
// (resting drips with a negative hang). brand/puddle/*.svg is this exact pose traced from the
// engine (brand/tools/puddle.mjs + puddle.py; numbers from brand/puddle/geometry.json), and
// that path is the static fallback here: server render, before mount, and reduced motion
// (no engine at all then). Decorative: everything is aria-hidden; label the link around it.
import { attachGoop, type GoopHandle, type GoopOptions } from '@goopui/core'

const props = withDefaults(defineProps<{ size?: 'sm' | 'md' | 'lg' }>(), { size: 'md' })

/** Lockup height in px per size (the host scales with it). */
const HEIGHT = { sm: 22, md: 26, lg: 40 } as const
/** Design size of the goo host the brand capture used. */
const DESIGN = { width: 52, height: 38 }
/** Host box inside the lockup, as fractions of the lockup box. */
const HOST_HEIGHT = 0.72127
const BLOB =
  'M19.8 41.3C21.85 41.18 23.88 40.89 25.92 40.69C29.84 40.32 33.87 40.32 37.54 38.73C41.14 37.17 43.88 34.23 46.06 31.05C48.14 28 49.84 24.52 50.23 20.8C50.55 17.81 49.97 14.76 48.58 12.09C45.16 5.53 37.96 1.81 30.88 0.68C25.31 -0.21 19.39 0.4 14.19 2.62C6.5 5.91 0.85 12.41 1.55 21.16C1.82 24.43 2.9 27.59 4.18 30.58C5.69 34.11 7.76 37.91 11.22 39.87C13.98 41.43 16.72 41.48 19.8 41.3Z'

/** Engine options at host scale k (px options scale with the host, so the pose matches). */
function options(k: number): GoopOptions {
  return {
    renderer: 'svg',
    // The puddle shape (keep in sync with brand/tools/puddle.mjs).
    drips: false,
    dripSize: 6.5 * k,
    softness: 8 * k,
    edge: 0.45,
    restingDrips: [
      { x: 0.26, size: 1.3, length: -1.2 },
      { x: 0.7, size: 1.0, length: -1.4 },
    ],
    seed: 7,
    // A small body: fast passes count from a lower speed, and the click wave stays near it.
    splashMinSpeed: 0.6,
    shockwave: 0.6,
    clickGoop: 0.25,
    // The link owns the keyboard (Enter navigates).
    keyboard: false,
  }
}

const host = useTemplateRef<HTMLElement>('host')
const live = ref(false)
let handle: GoopHandle | null = null
const scale = (): number => (HEIGHT[props.size] * HOST_HEIGHT) / DESIGN.height

const reduced = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  document.documentElement.dataset.reducedMotion === 'true'

onMounted(() => {
  if (!host.value || reduced()) return
  handle = attachGoop(host.value, options(scale()))
  // Swap the static path out once the goo has painted (same shape, so no visible jump).
  requestAnimationFrame(() => (live.value = handle !== null))
})
watch(
  () => props.size,
  () => handle?.update(options(scale())),
  { flush: 'post' },
)
onBeforeUnmount(() => {
  handle?.destroy()
  handle = null
})
</script>

<template>
  <span class="goop-logo" :data-size="size" aria-hidden="true">
    <svg class="word" viewBox="-5.14 -79.0 451.68 101.1" preserveAspectRatio="xMinYMid meet" focusable="false">
      <path d="M130.61 -3.85Q121.21 -3.85 115.72 -10.8Q110.23 -17.75 110.23 -32.02Q110.23 -47.23 115.49 -54.26Q120.73 -61.3 130.11 -61.3Q135.91 -61.3 140.26 -58.8Q144.61 -56.3 148.06 -51.73L146.66 -48.08Q146.36 -49.48 146.16 -51.08Q145.96 -52.68 145.96 -53.48Q145.96 -58.1 147.95 -60.65Q149.94 -63.2 154.11 -63.2Q158.73 -63.2 161.56 -60.04Q164.39 -56.88 165.69 -50.95Q166.84 -46.5 167.51 -39.55Q168.19 -32.6 168.19 -25.5Q168.19 -15.9 167.49 -9.4Q166.79 -2.9 165.19 1.4Q163.59 5.7 160.99 8.9Q156.46 14.33 148.89 16.96Q141.31 19.6 131.61 19.6Q124.41 19.6 120.09 18.15Q115.76 16.7 113.85 14.26Q111.94 11.83 111.94 8.75Q111.94 4.98 113.75 2.43Q115.56 -0.12 119.26 -0.12Q122.66 -0.12 126.57 0.38Q130.49 0.88 135.16 0.88Q142.91 0.88 146.13 -2.14Q149.36 -5.15 149.36 -10.8Q149.36 -13.1 149.06 -16.2L150.46 -16.82Q147.81 -10.88 142.69 -7.36Q137.56 -3.85 130.61 -3.85ZM139.14 -19.53Q141.44 -19.53 143.51 -20.81Q145.59 -22.1 146.86 -25.1Q148.14 -28.1 148.14 -33.12Q148.14 -39.15 145.9 -42.95Q143.66 -46.75 138.91 -46.75Q134.91 -46.75 132.7 -43.4Q130.49 -40.05 130.49 -33.25Q130.49 -26.78 132.73 -23.15Q134.99 -19.53 139.14 -19.53Z"/>
      <path d="M199.94 0.3Q191.21 0.3 184.72 -3.25Q178.23 -6.8 174.68 -13.4Q171.14 -20 171.14 -29.1Q171.14 -38.6 174.73 -45.7Q178.32 -52.8 184.91 -56.8Q191.5 -60.8 200.21 -60.8Q209.57 -60.8 216.43 -56.95Q223.29 -53.1 227.1 -46.2Q230.91 -39.3 230.91 -30.1Q230.91 -20.7 227.07 -13.9Q223.23 -7.1 216.3 -3.4Q209.36 0.3 199.94 0.3ZM201.33 -18.53Q205.81 -18.53 208.49 -22.01Q211.16 -25.5 211.16 -31.28Q211.16 -37.12 208.5 -40.6Q205.85 -44.08 201.34 -44.08Q196.71 -44.08 194.03 -40.61Q191.36 -37.15 191.36 -31.29Q191.36 -25.5 194.03 -22.01Q196.71 -18.53 201.33 -18.53Z"/>
      <path d="M261.73 0.3Q253.01 0.3 246.52 -3.25Q240.03 -6.8 236.48 -13.4Q232.94 -20 232.94 -29.1Q232.94 -38.6 236.53 -45.7Q240.12 -52.8 246.71 -56.8Q253.3 -60.8 262.01 -60.8Q271.37 -60.8 278.23 -56.95Q285.09 -53.1 288.9 -46.2Q292.71 -39.3 292.71 -30.1Q292.71 -20.7 288.87 -13.9Q285.04 -7.1 278.1 -3.4Q271.16 0.3 261.73 0.3ZM263.13 -18.53Q267.61 -18.53 270.29 -22.01Q272.96 -25.5 272.96 -31.28Q272.96 -37.12 270.3 -40.6Q267.65 -44.08 263.14 -44.08Q258.51 -44.08 255.83 -40.61Q253.16 -37.15 253.16 -31.29Q253.16 -25.5 255.83 -22.01Q258.51 -18.53 263.13 -18.53Z"/>
      <path d="M305.51 -62Q309.26 -62 311.62 -58.7Q313.99 -55.4 315.06 -48.3L312.96 -47Q314.76 -54 319.66 -57.7Q324.56 -61.4 331.26 -61.4Q337.59 -61.4 342.49 -58.2Q347.39 -55 350.2 -48.55Q353.01 -42.1 353.01 -32.4Q353.01 -16.7 347.21 -9.25Q341.41 -1.8 331.56 -1.8Q324.78 -1.8 320.91 -4.8Q317.03 -7.8 315.49 -12.1L316.69 -12.7Q317.49 -6.98 318.04 -1.44Q318.59 4.11 318.59 8.28Q318.59 13.25 316.25 16.67Q313.92 20.1 308.81 20.1Q304.06 20.1 301.57 16.94Q299.09 13.78 298.14 8.35Q297.54 4.2 296.94 -2.31Q296.34 -8.81 295.99 -16.36Q295.64 -23.9 295.64 -31.2Q295.64 -38.48 296.19 -44.87Q296.73 -51.26 297.54 -55.28Q298.39 -58.68 300.44 -60.34Q302.49 -62 305.51 -62ZM324.39 -45.93Q320.24 -45.93 317.75 -41.81Q315.26 -37.7 315.26 -31.18Q315.26 -24.5 317.74 -21.2Q320.22 -17.9 324.19 -17.9Q328.99 -17.9 331.04 -21.63Q333.09 -25.36 333.09 -31.33Q333.09 -38.86 330.5 -42.39Q327.91 -45.93 324.39 -45.93Z"/>
      <path d="M384.21 0.8Q369.46 0.8 362.95 -6.29Q356.44 -13.38 356.44 -29.6Q356.44 -34.9 356.75 -40.45Q357.06 -46 357.71 -51.15Q358.36 -56.3 359.19 -60.15Q360.39 -65.4 363.31 -68.45Q366.23 -71.5 371.56 -71.5Q376.29 -71.5 378.91 -69.1Q381.54 -66.7 381.54 -61.95Q381.54 -59.88 380.84 -56.23Q380.14 -52.58 379.29 -48.3Q378.43 -44.03 377.73 -39.93Q377.04 -35.83 377.04 -32.83Q377.04 -27.33 379.36 -25.06Q381.68 -22.8 385.81 -22.8Q390.04 -22.8 392.06 -25.23Q394.09 -27.65 394.09 -32.83Q394.09 -35.43 393.68 -39.55Q393.29 -43.68 392.79 -48.16Q392.29 -52.65 391.89 -56.43Q391.49 -60.2 391.49 -62.15Q391.49 -73.1 401.26 -73.1Q406.18 -73.1 408.84 -70.39Q411.49 -67.67 412.49 -62.25Q413.18 -58.68 413.68 -53.59Q414.18 -48.5 414.43 -43.04Q414.68 -37.58 414.68 -32.7Q414.68 -20.83 411.52 -13.44Q408.36 -6.05 401.67 -2.62Q394.99 0.8 384.21 0.8Z"/>
      <path d="M432.44 -74.5Q436.61 -74.5 439.23 -72.05Q441.86 -69.6 443.01 -63.45Q443.73 -59.6 444.14 -53.16Q444.54 -46.73 444.54 -39.7Q444.54 -33.33 444.16 -27.62Q443.79 -21.93 442.99 -16.98Q441.81 -9.45 438.91 -6.33Q436.01 -3.2 431.54 -3.2Q427.39 -3.2 424.56 -5.71Q421.73 -8.22 420.69 -14.48Q420.23 -17.62 419.89 -23.03Q419.54 -28.43 419.54 -34.7Q419.54 -43.23 420.1 -50.66Q420.66 -58.1 421.66 -62.95Q422.94 -69.1 425.59 -71.8Q428.23 -74.5 432.44 -74.5Z"/>
    </svg>
    <span ref="host" class="blob" :data-live="live || undefined">
      <svg v-if="!live" class="blob-static" viewBox="0 0 52 38" focusable="false"><path :d="BLOB" /></svg>
    </span>
  </span>
</template>

<style scoped>
.goop-logo {
  position: relative;
  display: block;
  flex: none;
  height: 26px;
  aspect-ratio: 451.68 / 101.1;
  color: var(--foreground);
}
.goop-logo[data-size='sm'] {
  height: 22px;
}
.goop-logo[data-size='lg'] {
  height: 40px;
}
.word {
  /* Above the goo (splashes fly behind the letters) and transparent to the pointer, so the
     blob underneath gets hover / press / pass-through. */
  position: relative;
  z-index: 1;
  pointer-events: none;
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: currentColor;
}
.blob {
  position: absolute;
  left: 0.082%;
  top: 2.374%;
  width: 22.091%;
  height: 72.127%;
  border-radius: 50%;
  /* The goo paints with the host's color. */
  color: var(--slime);
  --goop-color: var(--slime);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
.blob-static {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  fill: currentColor;
}
</style>

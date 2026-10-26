<script setup lang="ts">
// GoopSpinner: shadcn-vue's Spinner (role="status", aria-label="Loading", `class` merge,
// size via classes like `size-6`) drawn as an orbit of goo blobs that merge and split.
//
// Before mount, during SSR, and while hydrating it renders a static inline SVG of the merged
// reduced-motion pose (its own tiny goo filter, scaled with the viewBox), so first paint and
// hydration match. On mount core's `attachSpinner` takes over: a goo renderer layer driven by
// a ticker on the shared rAF loop, paused offscreen / in hidden tabs / under reduced motion.
// Color is currentColor, like the lucide icon.
import {
  attachSpinner,
  gooColorMatrix,
  SPINNER_DEFAULT_BLOBS,
  SPINNER_FEEL,
  spinnerGooParams,
  spinnerStaticPose,
  type GoopPreset,
  type GoopRendererOption,
  type SpinnerHandle,
  type SpinnerOptions,
} from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Number of blobs in the orbit, 3..6. */
  blobs: { type: Number, default: SPINNER_DEFAULT_BLOBS },
  /** Orbit speed multiplier (1 = about 1.15s per turn on `playful`). */
  speed: { type: Number, default: 1 },
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset: { type: String as PropType<GoopPreset>, default: undefined },
  /** A couple of drips fall through the middle as it turns. */
  drips: { type: Boolean, default: true },
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer: { type: [String, Function] as PropType<GoopRendererOption>, default: undefined },
})

const host = useTemplateRef<HTMLElement>('host')
const config = useGoopConfig()
const id = useId()

const options = computed<SpinnerOptions>(() => ({
  blobs: props.blobs,
  speed: props.speed,
  drips: props.drips,
  preset: props.preset ?? config.preset,
  renderer: props.renderer ?? config.renderer,
  reducedMotion: config.reducedMotion,
}))

const handle = shallowRef<SpinnerHandle | null>(null)
const active = computed(() => handle.value !== null)

onMounted(() => {
  if (host.value) handle.value = attachSpinner(host.value, options.value)
})
onBeforeUnmount(() => {
  handle.value?.destroy()
  handle.value = null
})
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

// ---- static fallback (SSR / pre-mount): pure math, no DOM ---------------------------------
const VIEW = 24
const fmt = (n: number): string => String(Math.round(n * 1000) / 1000)
const feel = computed(() => SPINNER_FEEL[props.preset ?? config.preset ?? 'playful'])
const circles = computed(() =>
  spinnerStaticPose(props.blobs, feel.value)
    .filter((c) => c.r > 0)
    .map((c) => ({ cx: fmt(c.x * VIEW), cy: fmt(c.y * VIEW), r: fmt(c.r * VIEW) })),
)
const goo = computed(() => spinnerGooParams(VIEW, feel.value))
const filterId = `goop-spinner-${id.replace(/[^\w-]/g, '')}`

defineExpose({
  /** The live spinner handle (null before mount). */
  get handle() {
    return handle.value
  },
  get el() {
    return host.value ?? null
  },
})
</script>

<template>
  <span
    ref="host"
    role="status"
    aria-label="Loading"
    data-slot="spinner"
    :data-goop-active="active ? '' : undefined"
    :class="cn('relative inline-block size-4 shrink-0 pointer-events-none', props.class)"
    style="--goop-color: currentColor"
  >
    <svg
      v-if="!active"
      aria-hidden="true"
      :viewBox="`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`"
      class="block size-full overflow-visible"
      fill="currentColor"
    >
      <filter :id="filterId" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
        <feGaussianBlur in="SourceGraphic" :stdDeviation="goo.blur" result="b" />
        <feColorMatrix in="b" type="matrix" :values="gooColorMatrix(goo)" result="g" />
        <feComposite in="SourceGraphic" in2="g" operator="atop" />
      </filter>
      <g :filter="`url(#${filterId})`">
        <circle v-for="(c, i) in circles" :key="i" :cx="c.cx" :cy="c.cy" :r="c.r" />
      </g>
    </svg>
  </span>
</template>

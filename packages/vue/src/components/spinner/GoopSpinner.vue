<script setup lang="ts">
// GoopSpinner: shadcn-vue's Spinner (role="status", aria-label="Loading", `class` merge,
// size via classes like `size-6`) drawn in goo: by default an orbit of blobs that merge and
// split, or one of the other `variant` shapes.
//
// Before mount, during SSR, and while hydrating it renders a static inline SVG of the merged
// reduced-motion pose (its own tiny goo filter, scaled with the viewBox), so first paint and
// hydration match. On mount core's `attachSpinner` takes over: a goo renderer layer driven by
// a ticker on the shared rAF loop, paused offscreen / under reduced motion (hidden tabs pause rAF itself).
// Color is currentColor, like the lucide icon. It is playful by default (`interactive`): pointer
// moves slosh it, press-and-drag pulls it out in lumps, click/tap pops it. `:interactive="false"`
// turns all three off (and makes it pointer-events: none again); `slosh`/`grab`/`pop` each.
import {
  attachSpinner,
  gooColorMatrix,
  SPINNER_DEFAULT_BLOBS,
  SPINNER_DEFAULT_VARIANT,
  SPINNER_FEEL,
  spinnerGooParams,
  spinnerStaticPose,
  type GoopPreset,
  type GoopRendererOption,
  type SpinnerHandle,
  type SpinnerOptions,
  type SpinnerVariant,
} from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Shape: 'orbit' (chasing blobs) | 'comet' (a spinning arc) | 'ring' (a bead rolling round a
   *  donut) | 'dots' (a bead rolling along three dots) | 'pulse' (a core budding satellites). */
  variant: { type: String as PropType<SpinnerVariant>, default: SPINNER_DEFAULT_VARIANT },
  /** Number of blobs, 3..6 (orbit and pulse). */
  blobs: { type: Number, default: SPINNER_DEFAULT_BLOBS },
  /** Orbit speed multiplier (1 = about 1.15s per turn on `playful`). */
  speed: { type: Number, default: 1 },
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset: { type: String as PropType<GoopPreset>, default: undefined },
  /** Drips hang off the bottom and fall away as it turns (orbit only). */
  drips: { type: Boolean, default: false },
  /** Pointer play: master switch for slosh, grab and pop. Off under reduced motion. */
  interactive: { type: Boolean, default: true },
  /** Moving the pointer over it sloshes the goo. */
  slosh: { type: Boolean, default: true },
  /** Press and drag pulls the goo out in lumps; release snaps it back. */
  grab: { type: Boolean, default: true },
  /** Click / tap squishes it, then it swells back with a ripple. */
  pop: { type: Boolean, default: true },
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer: { type: [String, Function] as PropType<GoopRendererOption>, default: undefined },
})

const host = useTemplateRef<HTMLElement>('host')
const config = useGoopConfig()
const id = useId()

const options = computed<SpinnerOptions>(() => ({
  variant: props.variant,
  blobs: props.blobs,
  speed: props.speed,
  drips: props.drips,
  interactive: props.interactive,
  slosh: props.slosh,
  grab: props.grab,
  pop: props.pop,
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
  spinnerStaticPose(props.blobs, feel.value, props.variant)
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
    :data-variant="props.variant"
    :data-goop-active="active ? '' : undefined"
    :class="cn('relative inline-block size-4 shrink-0', !props.interactive && 'pointer-events-none', props.class)"
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

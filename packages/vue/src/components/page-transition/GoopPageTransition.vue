<script setup lang="ts">
// GoopPageTransition: renders nothing itself. Mounts core's goo page transition (a fixed,
// aria-hidden wall that pours in from one edge, holds, and drains out the other) for its
// lifetime. Pass a vue-router `router` to run it on every route change, or call `cover()` /
// `reveal()` through a template ref or the default slot. Reduced motion: a quick fade.
// In Nuxt, prefer the module option `goop: { pageTransition: true }`.
import { onBeforeUnmount, watch } from 'vue'
import type { GoopPageTransitionProps } from '../../goop-props'
import { goopRouterTransition, useGoopPageTransition, type GoopRouterTransitionOptions, type GoopTransitionRouter } from './use-page-transition'

const props = withDefaults(
  defineProps<
    GoopPageTransitionProps & {
      /** A vue-router instance: cover before each route change, reveal after it renders. */
      router?: GoopTransitionRouter
      /** Reveal timing with `router`: 'afterEach' (default) or 'manual'. */
      revealOn?: GoopRouterTransitionOptions['revealOn']
      /** With `router`: element (selector) to fade in as the new page swaps in, or false. */
      fade?: GoopRouterTransitionOptions['fade']
    }
  >(),
  {
    goo: true,
    direction: undefined,
    color: undefined,
    accent: undefined,
    highlight: undefined,
    duration: undefined,
    coverDuration: undefined,
    revealDuration: undefined,
    speed: undefined,
    preset: undefined,
    band: undefined,
    bubbles: undefined,
    bulge: undefined,
    wobble: undefined,
    lag: undefined,
    zIndex: undefined,
    seed: undefined,
    split: undefined,
    router: undefined,
    revealOn: undefined,
    fade: undefined,
  },
)

const transition = useGoopPageTransition(() => {
  const { router: _router, revealOn: _revealOn, fade: _fade, ...rest } = props
  return rest
})

let off: (() => void) | null = null
watch(
  () => [props.router, props.revealOn, props.fade] as const,
  ([router, revealOn, fade]) => {
    off?.()
    off = router ? goopRouterTransition(router, transition, { revealOn, fade }) : null
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  off?.()
  off = null
})

defineExpose({
  cover: transition.cover,
  reveal: transition.reveal,
  /** The live core handle (null on the server and before mount). */
  get handle() {
    return transition.handle.value
  },
})
</script>

<template>
  <slot :cover="transition.cover" :reveal="transition.reveal" />
</template>

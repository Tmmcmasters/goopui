<script setup lang="ts">
// The site's only bridge to the goo engine. A stand-in for @goopui/vue until that package
// exists: swap usages of <GoopHost> for the real components when it ships.
//
// Renders `as` (default div), calls attachGoop on mount, forwards option changes to
// handle.update(), and destroys on unmount. The host's color is `--goop-color`.
// Inside a `data-goop-stage` element it also follows the stage's controls (see
// utils/goopStage.ts): drip-all and option overrides such as a per-frame timeScale.
//
// Note: the renderer is chosen at attach time (`finish: 'oil'` upgrades to canvas), so
// switching finish/renderer needs a remount: give the host a :key that includes them.
import { attachGoop, type GoopHandle, type GoopOptions } from '@goopui/core'
import type { Component } from 'vue'

const props = withDefaults(defineProps<{ as?: string | Component; options?: GoopOptions }>(), {
  as: 'div',
  options: () => ({}),
})
const emit = defineEmits<{ ready: [handle: GoopHandle] }>()

// `as` may be a component (e.g. NuxtLink), in which case the ref is its instance.
const el = ref<HTMLElement | { $el: HTMLElement } | null>(null)
const node = (): HTMLElement | null => {
  const v = el.value
  if (!v) return null
  return v instanceof HTMLElement ? v : v.$el
}
let handle: GoopHandle | null = null
let stage: Element | null = null

const merged = (): GoopOptions => ({ ...props.options, ...stageOptions(stage) })
const onStageDrip = () => handle?.drip()
const onStageOptions = () => handle?.update(merged())

onMounted(() => {
  const host = node()
  if (!host) return
  stage = host.parentElement?.closest(`[${STAGE_ATTR}]`) ?? null
  handle = attachGoop(host, merged())
  stage?.addEventListener(STAGE_DRIP, onStageDrip)
  stage?.addEventListener(STAGE_OPTIONS, onStageOptions)
  emit('ready', handle)
})

watch(
  () => props.options,
  () => handle?.update(merged()),
  { deep: true },
)

onUnmounted(() => {
  stage?.removeEventListener(STAGE_DRIP, onStageDrip)
  stage?.removeEventListener(STAGE_OPTIONS, onStageOptions)
  handle?.destroy()
  handle = null
})

defineExpose({
  /** The live handle (null before mount / after unmount). */
  getHandle: () => handle,
  /** Re-read `--goop-*` CSS vars, e.g. after changing them on an ancestor. */
  refresh: () => handle?.update(),
})
</script>

<template>
  <component :is="as" ref="el"><slot /></component>
</template>

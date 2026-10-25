<script setup lang="ts">
// The site's only bridge to the goo engine. A stand-in for @goopui/vue until that package
// exists: swap usages of <GoopHost> for the real components when it ships.
//
// Renders `as` (default div), calls attachGoop on mount, forwards option changes to
// handle.update(), and destroys on unmount. The host's color is `--goop-color`.
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

onMounted(() => {
  const host = node()
  if (!host) return
  handle = attachGoop(host, { ...props.options })
  // Demo frames (<Preview>, tuners) can ask every goo inside them to drip at once.
  stage = host.parentElement?.closest('[data-goop-stage]') ?? null
  stage?.addEventListener('goop:drip', onStageDrip)
  emit('ready', handle)
})

let stage: Element | null = null
const onStageDrip = () => handle?.drip()

watch(
  () => props.options,
  (opts) => handle?.update({ ...opts }),
  { deep: true },
)

onUnmounted(() => {
  stage?.removeEventListener('goop:drip', onStageDrip)
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

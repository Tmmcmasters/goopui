<script setup lang="ts">
// Bridge to the goo engine for NON-button surfaces (hero slab, install card, placeholder
// shapes, error blob). Buttons use the real <GoopButton> from @goopui/vue.
//
// Renders `as` (default div), calls attachGoop on mount, forwards option changes to
// handle.update(), and destroys on unmount. The host's color is `--goop-color`.
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

const merged = (): GoopOptions => ({ ...props.options })

onMounted(() => {
  const host = node()
  if (!host) return
  handle = attachGoop(host, merged())
  emit('ready', handle)
})

watch(
  () => props.options,
  () => handle?.update(merged()),
  { deep: true },
)

onUnmounted(() => {
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

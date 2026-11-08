<script setup lang="ts">
// GoopSkeletonReveal: a goopUI addition (shadcn has no equivalent). Wraps a loading state:
// while `loading`, the `#skeleton` slot renders and its GoopSkeleton blocks pool into one
// soft body of goo (a sheen flows through the group and bridges close neighbours; each
// block breathes). When `loading` turns false, the default slot renders in the same place
// and each block's goo melts into the element replacing it, then drains to reveal it.
// Engine: core's `attachSkeletonReveal`. Both slots render inside one `display: contents`
// wrapper each, so the root's classes lay them out the same way (no jump on the swap).
// SSR / before mount: just the slot for the current state. Reduced motion: a cross-fade.
import { attachSkeletonReveal, type SkeletonRevealHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSkeletonRevealProps, toSkeletonRevealOptions } from '../../goop-props'

const props = defineProps({
  ...goopSkeletonRevealProps,
  /** Show the skeleton. Turning it false melts the skeleton into the default slot. */
  loading: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const emit = defineEmits<{
  /** The melt finished (or was skipped): the content is fully shown. */
  revealed: []
}>()

defineSlots<{
  /** The placeholder: GoopSkeleton blocks laid out like the content. */
  skeleton?: () => unknown
  /** The real content. */
  default?: () => unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const skeletonEl = useTemplateRef<HTMLElement>('skeletonEl')
const contentEl = useTemplateRef<HTMLElement>('contentEl')
const config = useGoopConfig()
const options = computed(() => toSkeletonRevealOptions(props, config))
const handle = shallowRef<SkeletonRevealHandle | null>(null)

onMounted(() => {
  if (!root.value) return
  handle.value = attachSkeletonReveal(root.value, options.value)
  if (props.loading) handle.value.pool(skeletonEl.value)
})
onBeforeUnmount(() => {
  handle.value?.destroy()
  handle.value = null
})
watch(options, (next) => handle.value?.update(next))
// Before the DOM swaps: measure the blocks while they are still there.
watch(
  () => props.loading,
  (now, was) => {
    if (!now && was) handle.value?.capture()
  },
  { flush: 'pre' },
)
// After it: pool the new skeleton, or melt into the new content.
watch(
  () => props.loading,
  async (now) => {
    const h = handle.value
    if (!h) return
    if (now) h.pool(skeletonEl.value)
    else if (contentEl.value) {
      await h.reveal(contentEl.value)
      if (!props.loading) emit('revealed')
    }
  },
  { flush: 'post' },
)

defineExpose({
  /** The live engine handle (null before mount). */
  get handle() {
    return handle.value
  },
  /** The root element. */
  get el() {
    return root.value ?? null
  },
})
</script>

<template>
  <div ref="root" data-slot="skeleton-reveal" :aria-busy="loading ? 'true' : undefined" :class="cn('relative', props.class)">
    <div v-if="loading" key="skeleton" ref="skeletonEl" data-slot="skeleton-reveal-skeleton" style="display: contents">
      <slot name="skeleton" />
    </div>
    <div v-else key="content" ref="contentEl" data-slot="skeleton-reveal-content" style="display: contents">
      <slot />
    </div>
  </div>
</template>

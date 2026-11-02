<script setup lang="ts">
// GoopSkeleton: shadcn-vue's Skeleton (a div, `class` merge) whose grey pulse becomes a slow
// goo shimmer: a soft, low mound of slightly lighter goo drifts across the shape. CSS only
// (goop.css: one radial gradient on a pseudo-element, transform-animated), so a page full of
// skeletons stays smooth. Reduced motion: static. `:shimmer="false"` is shadcn's pulse.
import { skeletonShimmerOn, skeletonStyle } from '@goopui/core'
import { cn } from 'cn'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSkeletonProps, toSkeletonOptions } from '../../goop-props'
import { SKELETON_BASE, SKELETON_PULSE, goopSkeletonShimmer } from './variants'

const props = defineProps({
  ...goopSkeletonProps,
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const config = useGoopConfig()
const options = computed(() => toSkeletonOptions(props, config))
const on = computed(() => skeletonShimmerOn(options.value))
const style = computed(() => skeletonStyle(options.value))
</script>

<template>
  <div
    data-slot="skeleton"
    :data-goop-shimmer="on ? '' : undefined"
    :data-goop-still="on && options.reducedMotion === true ? '' : undefined"
    :style="style"
    :class="cn(SKELETON_BASE, on ? goopSkeletonShimmer : SKELETON_PULSE, props.class)"
  />
</template>

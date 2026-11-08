<script setup lang="ts">
// GoopBreadcrumb: shadcn-vue's Breadcrumb (a <nav aria-label="breadcrumb">, `class` merge).
// Engine props set here (goo, highlight, wobble, momentum, followPointer, speed, preset,
// renderer) are inherited by GoopBreadcrumbList, where the goo highlight lives.
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { resolveBreadcrumbProps, type GoopBreadcrumbProps } from '../../goop-props'
import { provideGoopBreadcrumb } from './context'

const props = withDefaults(defineProps<GoopBreadcrumbProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  highlight: undefined,
  wobble: undefined,
  momentum: undefined,
  followPointer: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
provideGoopBreadcrumb(computed(() => resolveBreadcrumbProps(props)))
</script>

<template>
  <nav aria-label="breadcrumb" data-slot="breadcrumb" :class="cn('', props.class)">
    <slot />
  </nav>
</template>

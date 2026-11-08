<script setup lang="ts">
// GoopEmpty: shadcn-vue's Empty (a div, `class` merge). Engine props set here (goo, puddle,
// breathe, speed, preset) are inherited by GoopEmptyMedia, where the goo puddle lives.
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { resolveEmptyProps, type GoopEmptyProps } from '../../goop-props'
import { provideGoopEmpty } from './context'
import { EMPTY } from './variants'

const props = withDefaults(defineProps<GoopEmptyProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  puddle: undefined,
  breathe: undefined,
  speed: undefined,
  preset: undefined,
})
provideGoopEmpty(computed(() => resolveEmptyProps(props)))
</script>

<template>
  <div data-slot="empty" :class="cn(EMPTY, props.class)">
    <slot />
  </div>
</template>

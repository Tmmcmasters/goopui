<script setup lang="ts">
// GoopFieldLegend: shadcn-vue's FieldLegend (a legend, `variant` legend | label, `class`
// merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_LEGEND } from './variants'

const props = withDefaults(defineProps<{ class?: HTMLAttributes['class']; variant?: 'legend' | 'label' }>(), {
  variant: 'legend',
})
</script>

<template>
  <legend data-slot="field-legend" :data-variant="variant" :class="cn(FIELD_LEGEND, props.class)">
    <slot />
  </legend>
</template>

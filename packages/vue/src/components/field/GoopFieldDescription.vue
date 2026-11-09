<script setup lang="ts">
// GoopFieldDescription: shadcn-vue's FieldDescription (a p, `class` merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_DESCRIPTION } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <p data-slot="field-description" :class="cn(...FIELD_DESCRIPTION, props.class)">
    <slot />
  </p>
</template>

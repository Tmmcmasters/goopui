<script setup lang="ts">
// GoopEmptyDescription: shadcn-vue's EmptyDescription (a <p>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { EMPTY_DESCRIPTION } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <p data-slot="empty-description" :class="cn(EMPTY_DESCRIPTION, props.class)">
    <slot />
  </p>
</template>

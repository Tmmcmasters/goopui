<script setup lang="ts">
// GoopEmptyTitle: shadcn-vue's EmptyTitle (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { EMPTY_TITLE } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="empty-title" :class="cn(EMPTY_TITLE, props.class)">
    <slot />
  </div>
</template>

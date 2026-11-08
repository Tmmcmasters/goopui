<script setup lang="ts">
// GoopEmptyContent: shadcn-vue's EmptyContent (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { EMPTY_CONTENT } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="empty-content" :class="cn(EMPTY_CONTENT, props.class)">
    <slot />
  </div>
</template>

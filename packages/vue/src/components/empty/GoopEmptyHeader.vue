<script setup lang="ts">
// GoopEmptyHeader: shadcn-vue's EmptyHeader (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { EMPTY_HEADER } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="empty-header" :class="cn(EMPTY_HEADER, props.class)">
    <slot />
  </div>
</template>

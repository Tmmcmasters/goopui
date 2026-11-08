<script setup lang="ts">
// GoopBreadcrumbSeparator: shadcn-vue's BreadcrumbSeparator (an aria-hidden <li> with lucide's
// chevron-right, inlined; `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { BREADCRUMB_SEPARATOR } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <li data-slot="breadcrumb-separator" role="presentation" aria-hidden="true" :class="cn(BREADCRUMB_SEPARATOR, props.class)">
    <slot>
      <svg class="cn-rtl-flip" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </slot>
  </li>
</template>

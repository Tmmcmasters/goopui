<script setup lang="ts">
// GoopBreadcrumbEllipsis: shadcn-vue's BreadcrumbEllipsis (lucide's more-horizontal, inlined;
// `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { BREADCRUMB_ELLIPSIS } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span data-slot="breadcrumb-ellipsis" role="presentation" aria-hidden="true" :class="cn(BREADCRUMB_ELLIPSIS, props.class)">
    <slot>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
    </slot>
    <span class="sr-only">More</span>
  </span>
</template>

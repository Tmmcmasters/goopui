<script setup lang="ts">
// GoopBreadcrumbPage: shadcn-vue's BreadcrumbPage (the current page, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { BREADCRUMB_PAGE } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span data-slot="breadcrumb-page" role="link" aria-disabled="true" aria-current="page" :class="cn(BREADCRUMB_PAGE, props.class)">
    <slot />
  </span>
</template>

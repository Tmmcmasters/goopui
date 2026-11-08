<script setup lang="ts">
// GoopBreadcrumbItem: shadcn-vue's BreadcrumbItem (an <li>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { BREADCRUMB_ITEM } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <li data-slot="breadcrumb-item" :class="cn(BREADCRUMB_ITEM, props.class)">
    <slot />
  </li>
</template>

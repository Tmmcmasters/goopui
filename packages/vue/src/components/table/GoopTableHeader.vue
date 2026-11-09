<script setup lang="ts">
// GoopTableHeader: shadcn-vue's TableHeader (a <thead>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_HEADER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <thead data-slot="table-header" :class="cn(TABLE_HEADER, props.class)">
    <slot />
  </thead>
</template>

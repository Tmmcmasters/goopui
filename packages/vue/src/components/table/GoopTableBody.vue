<script setup lang="ts">
// GoopTableBody: shadcn-vue's TableBody (a <tbody>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_BODY } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <tbody data-slot="table-body" :class="cn(TABLE_BODY, props.class)">
    <slot />
  </tbody>
</template>

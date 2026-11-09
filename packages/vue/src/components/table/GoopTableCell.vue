<script setup lang="ts">
// GoopTableCell: shadcn-vue's TableCell (a <td>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_CELL } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <td data-slot="table-cell" :class="cn(TABLE_CELL, props.class)">
    <slot />
  </td>
</template>

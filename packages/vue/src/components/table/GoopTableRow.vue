<script setup lang="ts">
// GoopTableRow: shadcn-vue's TableRow (a <tr>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_ROW } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <tr data-slot="table-row" :class="cn(TABLE_ROW, props.class)">
    <slot />
  </tr>
</template>

<script setup lang="ts">
// GoopTableHead: shadcn-vue's TableHead (a <th>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_HEAD } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <th data-slot="table-head" :class="cn(TABLE_HEAD, props.class)">
    <slot />
  </th>
</template>

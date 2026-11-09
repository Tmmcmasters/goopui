<script setup lang="ts">
// GoopTableCaption: shadcn-vue's TableCaption (a <caption>, `class` merge). Plain: the goo lives on GoopTable.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { TABLE_CAPTION } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <caption data-slot="table-caption" :class="cn(TABLE_CAPTION, props.class)">
    <slot />
  </caption>
</template>

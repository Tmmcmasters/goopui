<script setup lang="ts">
// GoopItemHeader: shadcn-vue's ItemHeader (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_HEADER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="item-header" :class="cn(ITEM_HEADER, props.class)">
    <slot />
  </div>
</template>

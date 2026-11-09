<script setup lang="ts">
// GoopItemContent: shadcn-vue's ItemContent (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_CONTENT } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="item-content" :class="cn(ITEM_CONTENT, props.class)">
    <slot />
  </div>
</template>

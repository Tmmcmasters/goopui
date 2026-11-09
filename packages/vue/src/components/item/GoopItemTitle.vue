<script setup lang="ts">
// GoopItemTitle: shadcn-vue's ItemTitle (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_TITLE } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="item-title" :class="cn(ITEM_TITLE, props.class)">
    <slot />
  </div>
</template>

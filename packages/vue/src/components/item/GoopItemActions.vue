<script setup lang="ts">
// GoopItemActions: shadcn-vue's ItemActions (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_ACTIONS } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="item-actions" :class="cn(ITEM_ACTIONS, props.class)">
    <slot />
  </div>
</template>

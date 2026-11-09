<script setup lang="ts">
// GoopItemFooter: shadcn-vue's ItemFooter (a <div>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_FOOTER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="item-footer" :class="cn(ITEM_FOOTER, props.class)">
    <slot />
  </div>
</template>

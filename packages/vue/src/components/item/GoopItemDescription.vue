<script setup lang="ts">
// GoopItemDescription: shadcn-vue's ItemDescription (a <p>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ITEM_DESCRIPTION } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <p data-slot="item-description" :class="cn(ITEM_DESCRIPTION, props.class)">
    <slot />
  </p>
</template>

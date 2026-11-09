<script setup lang="ts">
// GoopItemSeparator: shadcn-vue's ItemSeparator (a horizontal GoopSeparator, `class` merge). Plain.
import { cn } from 'cn'
import type { SeparatorProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import GoopSeparator from '../separator/GoopSeparator.vue'
import { ITEM_SEPARATOR } from './styles'

const props = defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>()
</script>

<template>
  <GoopSeparator data-slot="item-separator" orientation="horizontal" :class="cn(ITEM_SEPARATOR, props.class)" />
</template>

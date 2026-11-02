<script setup lang="ts">
// GoopCardTitle: shadcn-vue's CardTitle (an h3).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_TITLE } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <h3 data-slot="card-title" :class="cn(CARD_TITLE, props.class)">
    <slot />
  </h3>
</template>

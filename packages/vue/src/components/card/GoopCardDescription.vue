<script setup lang="ts">
// GoopCardDescription: shadcn-vue's CardDescription (a p).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_DESCRIPTION } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <p data-slot="card-description" :class="cn(CARD_DESCRIPTION, props.class)">
    <slot />
  </p>
</template>

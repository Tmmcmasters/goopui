<script setup lang="ts">
// GoopCardContent: shadcn-vue's CardContent.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_CONTENT } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="card-content" :class="cn(CARD_CONTENT, props.class)">
    <slot />
  </div>
</template>

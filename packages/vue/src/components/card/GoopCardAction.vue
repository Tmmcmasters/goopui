<script setup lang="ts">
// GoopCardAction: shadcn-vue's CardAction (top-right of a CardHeader).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_ACTION } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="card-action" :class="cn(CARD_ACTION, props.class)">
    <slot />
  </div>
</template>

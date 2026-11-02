<script setup lang="ts">
// GoopCardFooter: shadcn-vue's CardFooter.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_FOOTER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="card-footer" :class="cn(CARD_FOOTER, props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
// GoopCardHeader: shadcn-vue's CardHeader.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { CARD_HEADER } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="card-header" :class="cn(CARD_HEADER, props.class)">
    <slot />
  </div>
</template>

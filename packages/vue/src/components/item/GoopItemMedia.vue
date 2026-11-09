<script setup lang="ts">
// GoopItemMedia: shadcn-vue's ItemMedia (a <div>, `variant` default | icon | image, `class`
// merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { itemMediaVariants, type ItemMediaVariant } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class']; variant?: ItemMediaVariant }>()
</script>

<template>
  <div data-slot="item-media" :data-variant="props.variant ?? 'default'" :class="cn(itemMediaVariants({ variant: props.variant }), props.class)">
    <slot />
  </div>
</template>

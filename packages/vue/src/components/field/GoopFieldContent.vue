<script setup lang="ts">
// GoopFieldContent: shadcn-vue's FieldContent (a div, `class` merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_CONTENT } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="field-content" :class="cn(FIELD_CONTENT, props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
// GoopFieldTitle: shadcn-vue's FieldTitle (a div styled as a label, `class` merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_TITLE } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="field-label" :class="cn(FIELD_TITLE, props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
// GoopFieldSeparator: shadcn-vue's FieldSeparator (a GoopSeparator line, with the slot as a
// label in the middle when given; `class` merge, same classes). No goo.
import { cn } from 'cn'
import { useSlots, type HTMLAttributes } from 'vue'
import GoopSeparator from '../separator/GoopSeparator.vue'
import { FIELD_SEPARATOR, FIELD_SEPARATOR_CONTENT, FIELD_SEPARATOR_LINE } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const slots = useSlots()
</script>

<template>
  <div data-slot="field-separator" :data-content="!!slots.default" :class="cn(FIELD_SEPARATOR, props.class)">
    <GoopSeparator :class="FIELD_SEPARATOR_LINE" />
    <span v-if="slots.default" :class="FIELD_SEPARATOR_CONTENT" data-slot="field-separator-content">
      <slot />
    </span>
  </div>
</template>

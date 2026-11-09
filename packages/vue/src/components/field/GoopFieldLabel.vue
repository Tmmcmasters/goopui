<script setup lang="ts">
// GoopFieldLabel: shadcn-vue's FieldLabel (GoopLabel, i.e. reka Label: `for`, `class` merge,
// same classes). No goo: a choice card (a FieldLabel around a Field) keeps its control's goo.
import { cn } from 'cn'
import type { LabelProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import GoopLabel from '../label/GoopLabel.vue'
import { FIELD_LABEL } from './variants'

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <GoopLabel data-slot="field-label" v-bind="delegated" :class="cn(...FIELD_LABEL, props.class)">
    <slot />
  </GoopLabel>
</template>

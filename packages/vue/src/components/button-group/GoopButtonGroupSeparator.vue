<script setup lang="ts">
// GoopButtonGroupSeparator: shadcn-vue's ButtonGroupSeparator (reka Separator with shadcn's
// Separator classes, vertical by default, `class` merge). Plain.
import { cn } from 'cn'
import type { SeparatorProps } from 'reka-ui'
import { Separator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { SEPARATOR } from '../separator/styles'
import { BUTTON_GROUP_SEPARATOR } from './variants'

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'vertical',
  decorative: true,
})
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <Separator data-slot="button-group-separator" v-bind="delegated" :orientation="props.orientation" :class="cn(SEPARATOR, BUTTON_GROUP_SEPARATOR, props.class)" />
</template>

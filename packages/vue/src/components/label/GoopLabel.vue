<script setup lang="ts">
// GoopLabel: shadcn-vue's Label (reka Label), a plain port with no goo.
import { cn } from 'cn'
import type { LabelProps } from 'reka-ui'
import { Label } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { LABEL } from './styles'

const props = defineProps<LabelProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <Label
    data-slot="label"
    v-bind="delegated"
    :class="cn(LABEL, props.class)"
  >
    <slot />
  </Label>
</template>

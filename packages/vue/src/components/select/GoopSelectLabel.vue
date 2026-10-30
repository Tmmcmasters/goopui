<script setup lang="ts">
// GoopSelectLabel: shadcn-vue's SelectLabel (`class`).
import { cn } from 'cn'
import type { SelectLabelProps } from 'reka-ui'
import { SelectLabel } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<SelectLabelProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <SelectLabel
    data-slot="select-label"
    v-bind="delegated"
    :class="cn('text-muted-foreground px-1.5 py-1 text-xs', props.class)"
  >
    <slot />
  </SelectLabel>
</template>

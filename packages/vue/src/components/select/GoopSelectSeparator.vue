<script setup lang="ts">
// GoopSelectSeparator: shadcn-vue's SelectSeparator.
import { cn } from 'cn'
import type { SelectSeparatorProps } from 'reka-ui'
import { SelectSeparator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<SelectSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <SelectSeparator
    data-slot="select-separator"
    v-bind="delegated"
    :class="cn('bg-border pointer-events-none -mx-1 my-1 h-px', props.class)"
  />
</template>

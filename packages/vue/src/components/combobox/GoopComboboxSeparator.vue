<script setup lang="ts">
// GoopComboboxSeparator: shadcn-vue's ComboboxSeparator (reka-ui ComboboxSeparator).
import { cn } from 'cn'
import type { ComboboxSeparatorProps } from 'reka-ui'
import { ComboboxSeparator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ComboboxSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <ComboboxSeparator
    data-slot="combobox-separator"
    v-bind="delegated"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>

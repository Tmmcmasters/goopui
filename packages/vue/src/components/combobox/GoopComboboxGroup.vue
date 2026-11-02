<script setup lang="ts">
// GoopComboboxGroup: shadcn-vue's ComboboxGroup (reka-ui ComboboxGroup with an optional
// `heading` label, `class` merge).
import { cn } from 'cn'
import type { ComboboxGroupProps } from 'reka-ui'
import { ComboboxGroup, ComboboxLabel } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ComboboxGroupProps & { class?: HTMLAttributes['class']; heading?: string }>()

const delegated = computed(() => {
  const { class: _class, heading: _heading, ...rest } = props
  return rest
})
</script>

<template>
  <ComboboxGroup
    data-slot="combobox-group"
    v-bind="delegated"
    :class="cn('text-foreground overflow-hidden p-1', props.class)"
  >
    <ComboboxLabel
      v-if="heading"
      data-slot="combobox-group-heading"
      class="text-muted-foreground px-2 py-1.5 text-xs font-medium"
    >
      {{ heading }}
    </ComboboxLabel>
    <slot />
  </ComboboxGroup>
</template>

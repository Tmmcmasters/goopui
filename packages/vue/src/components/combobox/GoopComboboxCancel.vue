<script setup lang="ts">
// GoopComboboxCancel: shadcn-vue's ComboboxCancel (reka-ui ComboboxCancel, clears the search).
import { cn } from 'cn'
import type { ComboboxCancelProps } from 'reka-ui'
import { ComboboxCancel } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ComboboxCancelProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <ComboboxCancel
    data-slot="combobox-cancel"
    v-bind="delegated"
    :class="cn('', props.class)"
  >
    <slot />
  </ComboboxCancel>
</template>

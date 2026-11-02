<script setup lang="ts">
// GoopComboboxTrigger: shadcn-vue's ComboboxTrigger (reka-ui ComboboxTrigger, `class`
// merge, `asChild`).
import { cn } from 'cn'
import type { ComboboxTriggerProps } from 'reka-ui'
import { ComboboxTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ComboboxTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <ComboboxTrigger
    data-slot="combobox-trigger"
    v-bind="forwarded"
    :class="cn('', props.class)"
  >
    <slot />
  </ComboboxTrigger>
</template>

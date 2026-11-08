<script setup lang="ts">
// GoopComboboxEmpty: shadcn-vue's ComboboxEmpty (reka-ui ComboboxEmpty, shown when nothing matches).
import { cn } from 'cn'
import type { ComboboxEmptyProps } from 'reka-ui'
import { ComboboxEmpty } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ComboboxEmptyProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <ComboboxEmpty
    data-slot="combobox-empty"
    v-bind="delegated"
    :class="cn('text-muted-foreground flex w-full justify-center py-2 text-center text-sm', props.class)"
  >
    <slot />
  </ComboboxEmpty>
</template>

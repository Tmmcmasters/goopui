<script setup lang="ts">
// GoopCommandSeparator: shadcn-vue's CommandSeparator (reka-ui Separator).
// Always decorative (role none): a listbox may only own groups and options.
import { cn } from 'cn'
import type { SeparatorProps } from 'reka-ui'
import { Separator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <Separator
    data-slot="command-separator"
    v-bind="delegated"
    decorative
    :class="cn('bg-border -mx-1 h-px', props.class)"
  />
</template>

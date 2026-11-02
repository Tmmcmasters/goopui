<script setup lang="ts">
// GoopContextMenuSeparator: shadcn-vue's ContextMenuSeparator.
import { cn } from 'cn'
import type { ContextMenuSeparatorProps } from 'reka-ui'
import { ContextMenuSeparator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ContextMenuSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <ContextMenuSeparator
    data-slot="context-menu-separator"
    v-bind="delegated"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>

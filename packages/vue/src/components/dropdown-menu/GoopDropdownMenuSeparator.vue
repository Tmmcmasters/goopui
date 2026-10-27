<script setup lang="ts">
// GoopDropdownMenuSeparator: shadcn-vue's DropdownMenuSeparator.
import { cn } from 'cn'
import type { DropdownMenuSeparatorProps } from 'reka-ui'
import { DropdownMenuSeparator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DropdownMenuSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DropdownMenuSeparator
    data-slot="dropdown-menu-separator"
    v-bind="delegated"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>

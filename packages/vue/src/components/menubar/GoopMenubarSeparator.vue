<script setup lang="ts">
// GoopMenubarSeparator: shadcn-vue's MenubarSeparator.
import { cn } from 'cn'
import type { MenubarSeparatorProps } from 'reka-ui'
import { MenubarSeparator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<MenubarSeparatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <MenubarSeparator
    data-slot="menubar-separator"
    v-bind="delegated"
    :class="cn('bg-border -mx-1 my-1 h-px', props.class)"
  />
</template>

<script setup lang="ts">
// GoopContextMenuLabel: shadcn-vue's ContextMenuLabel (`inset`, `class`).
import { cn } from 'cn'
import type { ContextMenuLabelProps } from 'reka-ui'
import { ContextMenuLabel, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<ContextMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
</script>

<template>
  <ContextMenuLabel
    data-slot="context-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn('text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-7', props.class)"
  >
    <slot />
  </ContextMenuLabel>
</template>

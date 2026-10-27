<script setup lang="ts">
// GoopDropdownMenuLabel: shadcn-vue's DropdownMenuLabel (`inset`, `class`).
import { cn } from 'cn'
import type { DropdownMenuLabelProps } from 'reka-ui'
import { DropdownMenuLabel, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DropdownMenuLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
</script>

<template>
  <DropdownMenuLabel
    data-slot="dropdown-menu-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn('text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-7', props.class)"
  >
    <slot />
  </DropdownMenuLabel>
</template>

<script setup lang="ts">
// GoopMenubarLabel: shadcn-vue's MenubarLabel (`inset`, `class`).
import { cn } from 'cn'
import type { MenubarLabelProps } from 'reka-ui'
import { MenubarLabel, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<MenubarLabelProps & { class?: HTMLAttributes['class']; inset?: boolean }>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
</script>

<template>
  <MenubarLabel
    data-slot="menubar-label"
    :data-inset="inset ? '' : undefined"
    v-bind="forwardedProps"
    :class="cn('px-1.5 py-1 text-sm font-medium data-inset:pl-7', props.class)"
  >
    <slot />
  </MenubarLabel>
</template>

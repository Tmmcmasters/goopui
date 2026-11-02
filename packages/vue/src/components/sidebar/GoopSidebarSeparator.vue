<script setup lang="ts">
// GoopSidebarSeparator: shadcn-vue's SidebarSeparator (reka-ui Separator in the sidebar's
// border color).
import { cn } from 'cn'
import type { SeparatorProps } from 'reka-ui'
import { Separator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'horizontal',
  decorative: true,
})
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <Separator
    data-slot="sidebar-separator"
    data-sidebar="separator"
    v-bind="delegated"
    :class="
      cn(
        'bg-sidebar-border mx-2 w-auto shrink-0 data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        props.class,
      )
    "
  />
</template>

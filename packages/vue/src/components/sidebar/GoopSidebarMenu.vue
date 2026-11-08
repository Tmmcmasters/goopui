<script setup lang="ts">
// GoopSidebarMenu: shadcn-vue's SidebarMenu (a list of menu items; `class` merge).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <ul
    data-slot="sidebar-menu"
    data-sidebar="menu"
    :class="cn('flex w-full min-w-0 flex-col gap-0', props.class)"
  >
    <slot />
  </ul>
</template>

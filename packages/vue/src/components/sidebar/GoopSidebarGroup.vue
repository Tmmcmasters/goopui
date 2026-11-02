<script setup lang="ts">
// GoopSidebarGroup: shadcn-vue's SidebarGroup (a section of the sidebar; `class` merge).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    data-slot="sidebar-group"
    data-sidebar="group"
    :class="cn('relative flex w-full min-w-0 flex-col p-2', props.class)"
  >
    <slot />
  </div>
</template>

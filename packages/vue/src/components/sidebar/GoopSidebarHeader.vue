<script setup lang="ts">
// GoopSidebarHeader: shadcn-vue's SidebarHeader (the top of the sidebar; `class` merge).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    data-slot="sidebar-header"
    data-sidebar="header"
    :class="cn('flex flex-col gap-2 p-2', props.class)"
  >
    <slot />
  </div>
</template>

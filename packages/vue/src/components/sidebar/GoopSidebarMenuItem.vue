<script setup lang="ts">
// GoopSidebarMenuItem: shadcn-vue's SidebarMenuItem (one menu row; `class` merge).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <li
    data-slot="sidebar-menu-item"
    data-sidebar="menu-item"
    :class="cn('group/menu-item relative', props.class)"
  >
    <slot />
  </li>
</template>

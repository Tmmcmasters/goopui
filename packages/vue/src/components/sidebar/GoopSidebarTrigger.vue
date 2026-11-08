<script setup lang="ts">
// GoopSidebarTrigger: shadcn-vue's SidebarTrigger, a ghost icon GoopButton that toggles the
// sidebar (the sheet on mobile). Default slot replaces the panel icon.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import GoopButton from '../button/GoopButton.vue'
import { useSidebar } from './utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const { toggleSidebar } = useSidebar()
</script>

<template>
  <GoopButton
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="icon-sm"
    :class="cn(props.class)"
    @click="toggleSidebar"
  >
    <slot>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        class="cn-rtl-flip"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
    </slot>
    <span class="sr-only">Toggle Sidebar</span>
  </GoopButton>
</template>

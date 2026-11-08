<script setup lang="ts">
// GoopSidebarMenuSkeleton: shadcn-vue's SidebarMenuSkeleton, a loading placeholder row
// (`showIcon`). The text bar's width (50..90%) comes from a stable id, so SSR and hydration
// agree.
import { cn } from 'cn'
import { computed, useId, type HTMLAttributes } from 'vue'
import { skeletonWidth } from './utils'

const props = defineProps<{ showIcon?: boolean; class?: HTMLAttributes['class'] }>()
const id = useId()
const width = computed(() => skeletonWidth(id ?? ''))
</script>

<template>
  <div
    data-slot="sidebar-menu-skeleton"
    data-sidebar="menu-skeleton"
    :class="cn('flex h-8 items-center gap-2 rounded-md px-2', props.class)"
  >
    <div v-if="showIcon" data-sidebar="menu-skeleton-icon" class="size-4 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
    <div
      data-sidebar="menu-skeleton-text"
      class="h-4 max-w-(--skeleton-width) flex-1 animate-pulse rounded-md bg-muted motion-reduce:animate-none"
      :style="{ '--skeleton-width': width }"
    />
  </div>
</template>

<script setup lang="ts">
// GoopSidebarMenuSub: shadcn-vue's SidebarMenuSub (a nested sub-menu; `class` merge). With
// GoopSidebar's `pour` on (and `submenus`), its guide line pours down as the sub-menu springs
// open: a goo bead rides the opening edge, the line thick and glossy behind it, and both melt
// into shadcn's hairline as the jelly settles; closing draws the bead back up (goop.css).
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { injectSidebarGoo } from './utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const goo = injectSidebarGoo()
const pour = computed(() => !!goo?.value.pour)
</script>

<template>
  <ul
    data-slot="sidebar-menu-sub"
    data-sidebar="menu-sub"
    :data-goop-pour="pour ? '' : undefined"
    :class="cn('border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5 group-data-[collapsible=icon]:hidden', props.class)"
  >
    <slot />
  </ul>
</template>

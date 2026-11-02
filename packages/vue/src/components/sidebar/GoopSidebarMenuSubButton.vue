<script setup lang="ts">
// GoopSidebarMenuSubButton: shadcn-vue's SidebarMenuSubButton (`size` sm | md, `isActive`,
// `as` / `asChild`, default `a`). In a goo sidebar the highlight blob rides it too (the flat
// hover bg is dropped), and the active one gets the soft pill.
import { cn } from 'cn'
import type { PrimitiveProps } from 'reka-ui'
import { Primitive } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectSidebarGoo, withoutFlatActive, withoutFlatHover } from './utils'

const props = withDefaults(
  defineProps<PrimitiveProps & { size?: 'sm' | 'md'; isActive?: boolean; class?: HTMLAttributes['class'] }>(),
  { as: 'a', size: 'md' },
)
const goo = injectSidebarGoo()
const BASE =
  'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden'
const classes = computed(() => {
  let base = BASE
  if (goo?.value.highlight) base = withoutFlatHover(base)
  if (goo?.value.pill) base = withoutFlatActive(base)
  return cn(base, props.size === 'sm' && 'text-xs', props.size === 'md' && 'text-sm', props.class)
})
</script>

<template>
  <Primitive
    data-slot="sidebar-menu-sub-button"
    data-sidebar="menu-sub-button"
    :as="as"
    :as-child="asChild"
    :data-size="size"
    :data-active="isActive"
    :data-goop-pill="goo?.pill ? '' : undefined"
    :class="classes"
  >
    <slot />
  </Primitive>
</template>

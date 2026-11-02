<script setup lang="ts">
// The element of a GoopSidebarMenuButton (shadcn-vue's SidebarMenuButtonChild). Inside a goo
// sidebar the highlight blob paints the hover background (the flat hover bg is dropped) and,
// with `pill` on, the active item is a soft filled pill (goop.css `[data-goop-pill]`).
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import { computed } from 'vue'
import { injectSidebarGoo, sidebarMenuButtonVariants, withoutFlatActive, withoutFlatHover, type SidebarMenuButtonProps } from './utils'

const props = withDefaults(defineProps<SidebarMenuButtonProps>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})
const goo = injectSidebarGoo()
const classes = computed(() => {
  let base = sidebarMenuButtonVariants({ variant: props.variant, size: props.size })
  if (goo?.value.highlight) base = withoutFlatHover(base)
  if (goo?.value.pill) base = withoutFlatActive(base)
  return cn(base, props.class)
})
</script>

<template>
  <Primitive
    data-slot="sidebar-menu-button"
    data-sidebar="menu-button"
    :data-size="size"
    :data-active="isActive"
    :data-goop-pill="goo?.pill ? '' : undefined"
    :class="classes"
    :as="as"
    :as-child="asChild"
  >
    <slot />
  </Primitive>
</template>

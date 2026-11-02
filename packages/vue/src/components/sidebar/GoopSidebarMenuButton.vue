<script setup lang="ts">
// GoopSidebarMenuButton: shadcn-vue's SidebarMenuButton (`variant` default | outline, `size`
// default | sm | lg, `isActive`, `tooltip`, `as` / `asChild`, `class`). With `tooltip`, the
// collapsed (icon mode) sidebar shows it to the right of the button: a GoopTooltip that blooms
// (GoopSidebar `tooltips`; off: shadcn's tooltip).
import type { Component } from 'vue'
import { computed } from 'vue'
import GoopTooltip from '../tooltip/GoopTooltip.vue'
import GoopTooltipContent from '../tooltip/GoopTooltipContent.vue'
import GoopTooltipTrigger from '../tooltip/GoopTooltipTrigger.vue'
import GoopSidebarMenuButtonChild from './GoopSidebarMenuButtonChild.vue'
import { injectSidebarGoo, useSidebar, type SidebarMenuButtonProps } from './utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<SidebarMenuButtonProps & { tooltip?: string | Component }>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})
const { isMobile, state } = useSidebar()
const goo = injectSidebarGoo()
const delegated = computed(() => {
  const { tooltip: _tooltip, ...rest } = props
  return rest
})
const showTip = computed(() => state.value === 'collapsed' && !isMobile.value)
</script>

<template>
  <GoopSidebarMenuButtonChild v-if="!tooltip" v-bind="{ ...delegated, ...$attrs }">
    <slot />
  </GoopSidebarMenuButtonChild>

  <GoopTooltip v-else :disabled="!showTip">
    <GoopTooltipTrigger as-child>
      <GoopSidebarMenuButtonChild v-bind="{ ...delegated, ...$attrs }">
        <slot />
      </GoopSidebarMenuButtonChild>
    </GoopTooltipTrigger>
    <GoopTooltipContent
      v-if="showTip"
      side="right"
      align="center"
      :side-offset="4"
      :goo="goo ? goo.tooltips : true"
      :speed="goo?.speed"
      :preset="goo?.preset"
    >
      <template v-if="typeof tooltip === 'string'">{{ tooltip }}</template>
      <component :is="tooltip" v-else />
    </GoopTooltipContent>
  </GoopTooltip>
</template>

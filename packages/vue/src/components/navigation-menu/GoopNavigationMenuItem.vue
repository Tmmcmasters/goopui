<script setup lang="ts">
// GoopNavigationMenuItem: shadcn-vue's NavigationMenuItem (reka-ui NavigationMenuItem, `class` merge).
import { cn } from 'cn'
import type { NavigationMenuItemProps } from 'reka-ui'
import { NavigationMenuItem } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<NavigationMenuItemProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <NavigationMenuItem
    data-slot="navigation-menu-item"
    v-bind="delegated"
    :class="cn('relative', props.class)"
  >
    <slot />
  </NavigationMenuItem>
</template>

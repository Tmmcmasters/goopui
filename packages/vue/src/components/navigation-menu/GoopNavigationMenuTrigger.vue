<script setup lang="ts">
// GoopNavigationMenuTrigger: shadcn-vue's NavigationMenuTrigger (reka-ui NavigationMenuTrigger,
// `navigationMenuTriggerStyle`, chevron, `class` merge, `asChild`). Inside a goo
// GoopNavigationMenu its hover / open background is painted by the list's goo blob.
import { NAVIGATION_MENU_ITEM_ATTR } from '@goopui/core'
import { cn } from 'cn'
import type { NavigationMenuTriggerProps } from 'reka-ui'
import { NavigationMenuTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopCue } from '../../sound'
import { injectGoopNavigationMenu } from './context'
import { NAVIGATION_MENU_TRIGGER_OPEN, navigationMenuTriggerStyle } from './variants'

const props = defineProps<NavigationMenuTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
const root = injectGoopNavigationMenu()
const item = computed(() => (root?.goo.value.highlight ? { [NAVIGATION_MENU_ITEM_ATTR]: '' } : {}))
const cue = useGoopCue('menuTrigger')
</script>

<template>
  <NavigationMenuTrigger
    data-slot="navigation-menu-trigger"
    v-bind="{ ...forwarded, ...item, ...cue }"
    :class="cn(navigationMenuTriggerStyle(), NAVIGATION_MENU_TRIGGER_OPEN, 'group', props.class)"
  >
    <slot />
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
      class="relative top-px ml-1 size-3 transition duration-300 group-data-[state=open]/navigation-menu-trigger:rotate-180"
      aria-hidden="true"
    ><path d="m6 9 6 6 6-6" /></svg>
  </NavigationMenuTrigger>
</template>

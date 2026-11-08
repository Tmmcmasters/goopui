<script setup lang="ts">
// GoopNavigationMenuLink: shadcn-vue's NavigationMenuLink (reka-ui NavigationMenuLink, same
// props/emits, `class` merge, `asChild`). Inside a goo GoopNavigationMenu its hover background
// is the goo blob: the list's for a top-level link, the panel's for a link inside a content panel.
import { NAVIGATION_MENU_ITEM_ATTR } from '@goopui/core'
import { cn } from 'cn'
import type { NavigationMenuLinkEmits, NavigationMenuLinkProps } from 'reka-ui'
import { NavigationMenuLink, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopCue } from '../../sound'
import { injectGoopNavigationMenu, injectInGoopNavigationMenuContent } from './context'
import { NAVIGATION_MENU_LINK } from './variants'

const props = defineProps<NavigationMenuLinkProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<NavigationMenuLinkEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const root = injectGoopNavigationMenu()
const inContent = injectInGoopNavigationMenuContent()
const item = computed(() => {
  const goo = root?.goo.value
  const on = inContent ? goo?.contentHighlight : goo?.highlight
  return on ? { [NAVIGATION_MENU_ITEM_ATTR]: '' } : {}
})
const cue = useGoopCue('menuItem')
</script>

<template>
  <NavigationMenuLink
    data-slot="navigation-menu-link"
    v-bind="{ ...forwarded, ...item, ...cue }"
    :class="cn(NAVIGATION_MENU_LINK, props.class)"
  >
    <slot />
  </NavigationMenuLink>
</template>

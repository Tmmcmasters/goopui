<script setup lang="ts">
// GoopNavigationMenuIndicator: shadcn-vue's NavigationMenuIndicator (reka-ui
// NavigationMenuIndicator, `class` merge): the small arrow under the open trigger.
import { cn } from 'cn'
import type { NavigationMenuIndicatorProps } from 'reka-ui'
import { NavigationMenuIndicator, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<NavigationMenuIndicatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
</script>

<template>
  <NavigationMenuIndicator
    data-slot="navigation-menu-indicator"
    v-bind="forwarded"
    :class="cn('data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-1 flex h-1.5 items-end justify-center overflow-hidden', props.class)"
  >
    <div class="bg-border rounded-tl-sm shadow-md relative top-[60%] h-2 w-2 rotate-45" />
  </NavigationMenuIndicator>
</template>

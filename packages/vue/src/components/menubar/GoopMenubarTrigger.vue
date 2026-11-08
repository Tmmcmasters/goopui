<script setup lang="ts">
// GoopMenubarTrigger: shadcn-vue's MenubarTrigger (`class`, `asChild`). Inside a GoopMenubar
// with the goo highlight on, its hover / open background is the bar's goo body behind it
// instead of the trigger's own bg.
import { cn } from 'cn'
import type { MenubarTriggerProps } from 'reka-ui'
import { MenubarTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopCue } from '../../sound'
import { injectGoopMenubar } from './context'

const props = defineProps<MenubarTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
const bar = injectGoopMenubar()

const classes = computed(() =>
  cn(
    bar?.blob.value ? '' : 'hover:bg-muted aria-expanded:bg-muted',
    'rounded-sm px-1.5 py-0.5 text-sm font-medium flex items-center outline-hidden select-none',
    props.class,
  ),
)
const cue = useGoopCue('menuTrigger', { claim: true })
</script>

<template>
  <MenubarTrigger
    data-slot="menubar-trigger"
    v-bind="{ ...forwardedProps, ...cue }"
    :class="classes"
  >
    <slot />
  </MenubarTrigger>
</template>

<script setup lang="ts">
// GoopContextMenuTrigger: shadcn-vue's ContextMenuTrigger (`asChild`, `disabled`). Records
// where the menu is opened (right-click, long-press; core `attachContextPoint`) so the
// panel's goo blooms out of that point.
import { attachContextPoint, type ContextPointHandle } from '@goopui/core'
import type { ContextMenuTriggerProps } from 'reka-ui'
import { ContextMenuTrigger, injectContextMenuRootContext, useForwardProps } from 'reka-ui'
import { onBeforeUnmount, onMounted } from 'vue'
import { injectGoopContextMenu } from './context'

const props = defineProps<ContextMenuTriggerProps>()
const forwardedProps = useForwardProps(props)
const ctx = injectGoopContextMenu()
// reka's trigger renders a fragment (anchor + element), so read the element it registers.
const root = injectContextMenuRootContext()
let tracker: ContextPointHandle | null = null

onMounted(() => {
  const el = root.triggerElement.value
  if (!ctx || !(el instanceof Element)) return
  tracker = attachContextPoint(el)
  ctx.point.value = tracker.point
})
onBeforeUnmount(() => {
  tracker?.destroy()
  tracker = null
  if (ctx) ctx.point.value = null
})
</script>

<template>
  <ContextMenuTrigger
    data-slot="context-menu-trigger"
    v-bind="forwardedProps"
  >
    <slot />
  </ContextMenuTrigger>
</template>

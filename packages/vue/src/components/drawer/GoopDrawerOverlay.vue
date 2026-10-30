<script setup lang="ts">
// GoopDrawerOverlay: shadcn-vue's DrawerOverlay (dimmed backdrop) on reka-ui's DialogOverlay.
// Its opacity follows the drawer's position every frame (the engine fades it as you drag,
// and only from `fadeFromIndex` with snap points), so it has no CSS fade animation.
import type { DialogOverlayProps } from 'reka-ui'
import { cn } from 'cn'
import { DialogOverlay } from 'reka-ui'
import { computed, onBeforeUnmount, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { injectDrawerRootContext } from './context'

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, forceMount: _forceMount, ...rest } = props
  return rest
})

const ctx = injectDrawerRootContext()
const overlay = useTemplateRef<{ $el?: Element } | null>('overlay')
watch(
  () => overlay.value?.$el,
  (el) => {
    if (el instanceof HTMLElement) ctx.overlay.value = el
    else if (ctx.overlay.value && !ctx.overlay.value.isConnected) ctx.overlay.value = null
  },
  { flush: 'post' },
)
onBeforeUnmount(() => {
  const el = overlay.value?.$el
  if (el && ctx.overlay.value === el) ctx.overlay.value = null
})
</script>

<template>
  <DialogOverlay
    v-if="ctx.present.value"
    ref="overlay"
    data-slot="drawer-overlay"
    data-vaul-overlay=""
    v-bind="delegated"
    :force-mount="true"
    :class="cn('fixed inset-0 z-50 bg-black/50', props.class)"
    style="opacity: 0"
  />
</template>

<script setup lang="ts">
// GoopDrawerOverlay: shadcn-vue's DrawerOverlay (vaul-vue's overlay, dimmed backdrop).
import type { DialogOverlayProps } from 'reka-ui'
import { cn } from 'cn'
import { DrawerOverlay } from 'vaul-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DialogOverlayProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DrawerOverlay
    data-slot="drawer-overlay"
    v-bind="delegated"
    :class="cn('data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50', props.class)"
  />
</template>

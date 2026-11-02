<script setup lang="ts">
// GoopContextMenu: shadcn-vue's ContextMenu root (reka-ui ContextMenuRoot, same
// props/emits/slot). Shares the open point between the trigger and the content.
import type { ContextMenuRootEmits, ContextMenuRootProps } from 'reka-ui'
import { ContextMenuRoot, useForwardPropsEmits } from 'reka-ui'
import { provideGoopContextMenu } from './context'

const props = withDefaults(defineProps<ContextMenuRootProps>(), { modal: true })
const emits = defineEmits<ContextMenuRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
provideGoopContextMenu()
</script>

<template>
  <ContextMenuRoot
    v-slot="slotProps"
    data-slot="context-menu"
    v-bind="forwarded"
  >
    <slot v-bind="slotProps" />
  </ContextMenuRoot>
</template>

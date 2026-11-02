<script setup lang="ts">
// GoopContextMenuSub: shadcn-vue's ContextMenuSub (same props/emits/slot). Tracks the open
// state for its SubContent's goo.
import type { ContextMenuSubEmits, ContextMenuSubProps } from 'reka-ui'
import { ContextMenuSub } from 'reka-ui'
import { ref, watch } from 'vue'
import { provideGoopMenuSub } from '../dropdown-menu/context'

const props = withDefaults(defineProps<ContextMenuSubProps>(), { open: undefined })
const emits = defineEmits<ContextMenuSubEmits>()

const open = ref(props.open ?? props.defaultOpen ?? false)
watch(
  () => props.open,
  (v) => {
    if (v !== undefined) open.value = v
  },
)
const onUpdate = (v: boolean) => {
  if (props.open === undefined) open.value = v
  emits('update:open', v)
}
provideGoopMenuSub(open)
</script>

<template>
  <ContextMenuSub
    v-slot="slotProps"
    data-slot="context-menu-sub"
    :open="open"
    @update:open="onUpdate"
  >
    <slot v-bind="slotProps" />
  </ContextMenuSub>
</template>

<script setup lang="ts">
// GoopDropdownMenuSub: shadcn-vue's DropdownMenuSub (same props/emits/slot). Tracks the open
// state for its SubContent's goo.
import type { DropdownMenuSubEmits, DropdownMenuSubProps } from 'reka-ui'
import { DropdownMenuSub } from 'reka-ui'
import { ref, watch } from 'vue'
import { provideGoopMenuSub } from './context'

const props = withDefaults(defineProps<DropdownMenuSubProps>(), { open: undefined })
const emits = defineEmits<DropdownMenuSubEmits>()

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
  <DropdownMenuSub
    v-slot="slotProps"
    data-slot="dropdown-menu-sub"
    :open="open"
    @update:open="onUpdate"
  >
    <slot v-bind="slotProps" />
  </DropdownMenuSub>
</template>

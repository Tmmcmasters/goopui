<script setup lang="ts">
// GoopMenubarSub: shadcn-vue's MenubarSub (same props/emits/slot). Tracks the open
// state for its SubContent's goo.
import type { MenubarSubEmits, MenubarSubProps } from 'reka-ui'
import { MenubarSub } from 'reka-ui'
import { ref, watch } from 'vue'
import { provideGoopMenuSub } from '../dropdown-menu/context'

const props = withDefaults(defineProps<MenubarSubProps>(), { open: undefined })
const emits = defineEmits<MenubarSubEmits>()

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
  <MenubarSub
    v-slot="slotProps"
    data-slot="menubar-sub"
    :open="open"
    @update:open="onUpdate"
  >
    <slot v-bind="slotProps" />
  </MenubarSub>
</template>

<script setup lang="ts">
// GoopContextMenu: shadcn-vue's ContextMenu root (reka-ui ContextMenuRoot, same
// props/emits/slot). Shares the open point between the trigger and the content.
import type { ContextMenuRootEmits, ContextMenuRootProps } from 'reka-ui'
import { ContextMenuRoot, useForwardPropsEmits } from 'reka-ui'
import { provideGoopContextMenu } from './context'
import type { GoopSoundProps } from '../../goop-props'
import { omitSound, useGoopSound } from '../../sound'

const props = withDefaults(defineProps<ContextMenuRootProps & GoopSoundProps>(), { modal: true, sound: undefined })
const emits = defineEmits<ContextMenuRootEmits>()

const forwarded = useForwardPropsEmits(omitSound(props), emits)
useGoopSound(() => props.sound)
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

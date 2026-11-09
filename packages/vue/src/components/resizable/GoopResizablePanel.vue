<script setup lang="ts">
// GoopResizablePanel: shadcn-vue's ResizablePanel (reka SplitterPanel: sizes, collapsible,
// events, slot props, the exposed collapse / expand / resize methods). Plain: no goo.
import { SplitterPanel, useForwardExpose, useForwardPropsEmits, type SplitterPanelEmits, type SplitterPanelProps } from 'reka-ui'

const props = defineProps<SplitterPanelProps>()
const emits = defineEmits<SplitterPanelEmits>()

const forwarded = useForwardPropsEmits(props, emits)
const { forwardRef } = useForwardExpose()
</script>

<template>
  <SplitterPanel :ref="forwardRef" v-slot="slotProps" data-slot="resizable-panel" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </SplitterPanel>
</template>

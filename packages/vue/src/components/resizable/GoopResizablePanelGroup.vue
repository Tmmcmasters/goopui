<script setup lang="ts">
// GoopResizablePanelGroup: shadcn-vue's ResizablePanelGroup (reka SplitterGroup, `direction`,
// `autoSaveId`, `keyboardResizeBy`, layout events, `class` merge, nova classes). Engine props
// set here (goo, bulge, wobble, speed, preset) are inherited by its GoopResizableHandles.
import { cn } from 'cn'
import { SplitterGroup, useForwardPropsEmits, type SplitterGroupEmits, type SplitterGroupProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { resolveResizableProps, type GoopResizableProps } from '../../goop-props'
import { provideGoopResizable } from './context'
import { RESIZABLE_PANEL_GROUP } from './styles'

const props = withDefaults(defineProps<GoopResizableProps & SplitterGroupProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  bulge: undefined,
  wobble: undefined,
  speed: undefined,
  preset: undefined,
})
const emits = defineEmits<SplitterGroupEmits>()

const delegated = computed(() => {
  const { class: _c, goo: _g, bulge: _b, wobble: _w, speed: _s, preset: _p, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
provideGoopResizable(computed(() => resolveResizableProps(props)))
</script>

<template>
  <SplitterGroup v-slot="slotProps" data-slot="resizable-panel-group" v-bind="forwarded" :class="cn(RESIZABLE_PANEL_GROUP, props.class)">
    <slot v-bind="slotProps" />
  </SplitterGroup>
</template>

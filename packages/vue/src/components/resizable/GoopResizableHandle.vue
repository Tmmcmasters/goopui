<script setup lang="ts">
// GoopResizableHandle: shadcn-vue's ResizableHandle (reka SplitterResizeHandle, `withHandle`,
// `disabled`, `hitAreaMargins`, drag events, `class` merge, nova classes and grip) whose grip is
// a goo bead: while dragged it swells a little and bulges toward the drag direction in a low,
// wide mound, and on release it wobbles back like jelly (core `attachResizableHandle` on mount:
// one aria-hidden svg, painted overflow, no layout shift). Without `withHandle` the mound rises
// on the line under the pointer. Engine props inherit GoopResizablePanelGroup's; set here they
// win. Before mount, during SSR, under reduced motion or with `:goo="false"` it is a plain
// shadcn handle.
import { attachResizableHandle, RESIZABLE_GRIP_ATTR, type ResizableHandle } from '@goopui/core'
import { cn } from 'cn'
import { SplitterResizeHandle, useForwardPropsEmits, type SplitterResizeHandleEmits, type SplitterResizeHandleProps } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolveResizableProps, toResizableOptions, type GoopResizableProps } from '../../goop-props'
import { injectGoopResizable } from './context'
import { RESIZABLE_HANDLE, RESIZABLE_HANDLE_GRIP } from './styles'

const props = withDefaults(
  defineProps<GoopResizableProps & SplitterResizeHandleProps & { class?: HTMLAttributes['class']; withHandle?: boolean }>(),
  {
    goo: undefined,
    bulge: undefined,
    wobble: undefined,
    speed: undefined,
    preset: undefined,
  },
)
const emits = defineEmits<SplitterResizeHandleEmits>()

const delegated = computed(() => {
  const { class: _c, withHandle: _h, goo: _g, bulge: _b, wobble: _w, speed: _s, preset: _p, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

const group = injectGoopResizable()
const config = useGoopConfig()
const options = computed(() => toResizableOptions(resolveResizableProps(props, group?.value), config))
const root = useTemplateRef<{ $el: unknown }>('root')
const handle = shallowRef<ResizableHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  const el = root.value?.$el as Element | null | undefined
  if (handle.value || !mounted || !opts || !el || el.nodeType !== 1) return
  handle.value = attachResizableHandle(el as HTMLElement, opts)
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(options, (next) => {
  if (!next) detach()
  else if (handle.value) handle.value.update(next)
  else attach()
})

const gripAttrs = { [RESIZABLE_GRIP_ATTR]: '' }

defineExpose({
  /** The live bead handle (null before mount / when off). */
  get handle() {
    return handle.value
  },
  /** The handle element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <SplitterResizeHandle ref="root" data-slot="resizable-handle" v-bind="forwarded" :class="cn(RESIZABLE_HANDLE, props.class)">
    <template v-if="props.withHandle">
      <div v-bind="gripAttrs" :class="RESIZABLE_HANDLE_GRIP">
        <slot />
      </div>
    </template>
  </SplitterResizeHandle>
</template>

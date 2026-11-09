<script setup lang="ts">
// GoopScrollArea: shadcn-vue's ScrollArea (reka ScrollAreaRoot / Viewport / Corner with one
// vertical GoopScrollBar, `type`, `dir`, `scrollHideDelay`, `class` merge, same classes) whose
// scrollbar thumb is a goo body: it stretches a little with the scroll speed and, pushed past
// an end, squashes against it and springs back with a small jelly wobble (core
// `attachScrollArea` on mount: transforms on the thumb's body only, nothing shifts, the scroll
// size never changes and the stretch stays inside the track). Reka keeps all scrolling. Before
// mount, during SSR, or under reduced motion the thumb is still; with `:goo="false"` it is a
// plain shadcn ScrollArea.
import { attachScrollArea, SCROLL_VIEWPORT_ATTR, type ScrollAreaHandle } from '@goopui/core'
import { cn } from 'cn'
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport, type ScrollAreaRootProps } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toScrollAreaOptions, type GoopScrollAreaProps } from '../../goop-props'
import { provideGoopScrollArea } from './context'
import GoopScrollBar from './GoopScrollBar.vue'
import { SCROLL_AREA, SCROLL_AREA_VIEWPORT } from './styles'

const props = withDefaults(defineProps<GoopScrollAreaProps & ScrollAreaRootProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  stretch: undefined,
  jelly: undefined,
  speed: undefined,
  preset: undefined,
})

const rootProps = computed(() => {
  const { class: _c, goo: _g, stretch: _s, jelly: _j, speed: _sp, preset: _p, ...rest } = props
  return rest
})

const config = useGoopConfig()
const options = computed(() => toScrollAreaOptions(props, config))
provideGoopScrollArea(computed(() => props.goo !== false))
const root = useTemplateRef<{ $el: unknown }>('root')
const handle = shallowRef<ScrollAreaHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  const el = root.value?.$el as Element | null | undefined
  if (handle.value || !mounted || !opts || !el || el.nodeType !== 1) return
  handle.value = attachScrollArea(el as HTMLElement, opts)
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

const viewportAttrs = { [SCROLL_VIEWPORT_ATTR]: '' }

defineExpose({
  /** The live thumb handle (null before mount / when off). */
  get handle() {
    return handle.value
  },
  /** The root element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <ScrollAreaRoot
    ref="root"
    data-slot="scroll-area"
    v-bind="rootProps"
    :data-goop-host="goo !== false ? 'scroll-area' : undefined"
    :class="cn(SCROLL_AREA, props.class)"
  >
    <ScrollAreaViewport data-slot="scroll-area-viewport" v-bind="viewportAttrs" :class="SCROLL_AREA_VIEWPORT">
      <slot />
    </ScrollAreaViewport>
    <GoopScrollBar />
    <ScrollAreaCorner />
  </ScrollAreaRoot>
</template>

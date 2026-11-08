<script setup lang="ts">
// GoopPaginationContent: shadcn-vue's PaginationContent (reka-ui PaginationList, same slot
// `{ items }`, `class` merge, `asChild`) whose current page is ONE goo blob (core
// `attachPaginationIndicator`, the Tabs indicator fed PAGINATION_FEEL). It slides between page
// numbers with momentum and a gentle stretch, also across jumps of several pages, and lands
// with a jelly overshoot. The blob is aria-hidden, behind the real items. Engine props are
// inherited from GoopPagination; set here they win. Reduced motion: the blob snaps.
// Browser-only: SSR renders shadcn markup, and goop.css styles the current page until the
// blob attaches.
import { attachPaginationIndicator, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import type { PaginationListProps } from 'reka-ui'
import { PaginationList } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolvePaginationProps, toPaginationOptions, type GoopPaginationProps } from '../../goop-props'
import { injectGoopPagination, provideGoopPaginationContent } from './context'

const props = withDefaults(defineProps<PaginationListProps & GoopPaginationProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  indicator: undefined,
  wobble: undefined,
  momentum: undefined,
  press: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  asChild: undefined,
})

const delegated = computed(() => ({ as: props.as, asChild: props.asChild }) as PaginationListProps)
const root = injectGoopPagination()
const config = useGoopConfig()
const options = computed(() => toPaginationOptions(resolvePaginationProps(props, root?.value), config))
const blob = computed(() => options.value !== null)
provideGoopPaginationContent({ blob })

const el = shallowRef<HTMLElement | null>(null)
const setEl = (c: Element | ComponentPublicInstance | null) => {
  const node = c && '$el' in c ? (c.$el as unknown) : c
  el.value = node instanceof HTMLElement ? node : null
}
const handle = shallowRef<MenuHighlightHandle | null>(null)

const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const sync = () => {
  const list = el.value
  const opts = options.value
  if (!list || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachPaginationIndicator(list, opts)
}
watch(el, () => {
  detach()
  sync()
}, { flush: 'post' })
watch(options, sync, { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live blob handle (null before mount / when the goo blob is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <PaginationList
    v-slot="slotProps"
    :ref="setEl"
    data-slot="pagination-content"
    :data-goop-pagination="blob ? '' : undefined"
    v-bind="delegated"
    :class="cn('gap-0.5 flex items-center', props.class)"
  >
    <slot v-bind="slotProps" />
  </PaginationList>
</template>

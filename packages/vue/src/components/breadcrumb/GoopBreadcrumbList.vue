<script setup lang="ts">
// GoopBreadcrumbList: shadcn-vue's BreadcrumbList (an <ol>, `class` merge) whose links'
// hover / keyboard-focus highlight is ONE goo blob (core `attachBreadcrumbHighlight`, the menu
// highlight engine with a calm feel and a pointer swell). It flows from link to link as the
// pointer moves along the trail and fades out when it leaves. The blob is aria-hidden, behind
// the real links. Engine props are inherited from GoopBreadcrumb; set here they win.
// Reduced motion: the blob snaps. Browser-only: SSR renders shadcn markup.
import { attachBreadcrumbHighlight, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolveBreadcrumbProps, toBreadcrumbOptions, type GoopBreadcrumbProps } from '../../goop-props'
import { injectGoopBreadcrumb, provideGoopBreadcrumbBlob } from './context'
import { BREADCRUMB_LIST } from './styles'

const props = withDefaults(defineProps<GoopBreadcrumbProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  highlight: undefined,
  wobble: undefined,
  momentum: undefined,
  followPointer: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})

const root = injectGoopBreadcrumb()
const config = useGoopConfig()
const options = computed(() => toBreadcrumbOptions(resolveBreadcrumbProps(props, root?.value), config))
const blob = computed(() => options.value !== null)
provideGoopBreadcrumbBlob(blob)

const el = useTemplateRef<HTMLElement>('el')
const handle = shallowRef<MenuHighlightHandle | null>(null)
let mounted = false
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
const sync = (): void => {
  const opts = options.value
  if (!mounted || !el.value || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachBreadcrumbHighlight(el.value, opts)
}
onMounted(() => {
  mounted = true
  sync()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(options, sync, { flush: 'post' })

defineExpose({
  /** The live highlight handle (null before mount / when the blob is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <ol ref="el" data-slot="breadcrumb-list" :data-goop-breadcrumb="blob ? '' : undefined" :class="cn(BREADCRUMB_LIST, props.class)">
    <slot />
  </ol>
</template>

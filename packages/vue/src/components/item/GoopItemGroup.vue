<script setup lang="ts">
// GoopItemGroup: shadcn-vue's ItemGroup (a `role="list"` <div>, `class` merge) whose
// interactive items' hover / keyboard-focus background is ONE goo blob (core
// `attachItemGroupHighlight`, the menu highlight engine with a calm feel and a pointer swell).
// It glides from item to item and fades out when the pointer leaves; only links / buttons are
// lit (shadcn only gives `a` items a hover fill). While it is attached the items drop their
// flat hover fill (goop.css). Items inherit `goo`, `press`, `speed` and `preset` from here.
// Touch never lights an item. Reduced motion: the blob snaps. Browser-only: SSR renders
// shadcn markup.
import { attachItemGroupHighlight, type ListHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { ITEM_GROUP_PROP_KEYS, toItemGroupOptions, type GoopItemGroupProps } from '../../goop-props'
import { provideGoopItemGroup } from './context'
import { ITEM_GROUP } from './styles'

const props = withDefaults(defineProps<GoopItemGroupProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  highlight: undefined,
  wobble: undefined,
  momentum: undefined,
  followPointer: undefined,
  press: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})

const own = computed<GoopItemGroupProps>(() => {
  const out: GoopItemGroupProps = {}
  for (const k of ITEM_GROUP_PROP_KEYS) if (props[k] !== undefined) (out as Record<string, unknown>)[k] = props[k]
  return out
})
provideGoopItemGroup(own)

const config = useGoopConfig()
const options = computed(() => toItemGroupOptions(props, config))
const blob = computed(() => options.value !== null)

const el = useTemplateRef<HTMLElement>('el')
const handle = shallowRef<ListHighlightHandle | null>(null)
let mounted = false
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
const sync = (): void => {
  const opts = options.value
  if (!mounted || !el.value || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachItemGroupHighlight(el.value, opts)
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
  <div ref="el" role="list" data-slot="item-group" :data-goop-item-group="blob ? '' : undefined" :class="cn(ITEM_GROUP, props.class)">
    <slot />
  </div>
</template>

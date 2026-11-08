<script setup lang="ts">
// GoopNavigationMenuList: shadcn-vue's NavigationMenuList (reka-ui NavigationMenuList, `class`
// merge, `asChild`). Inside a goo GoopNavigationMenu its items' hover / focus / open background
// is one goo blob (core `attachNavigationMenuHighlight` on reka's list wrapper) that slides
// between the triggers and links with momentum, stretching and necking as it travels and
// landing with a jelly overshoot; it rests on the open trigger while its panel is open.
import { attachNavigationMenuHighlight, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import type { NavigationMenuListProps } from 'reka-ui'
import { NavigationMenuList, useForwardProps } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type HTMLAttributes } from 'vue'
import { injectGoopNavigationMenu } from './context'

const props = defineProps<NavigationMenuListProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)

const root = injectGoopNavigationMenu()
const options = computed(() => root?.goo.value.highlight ?? null)

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
  const wrap = el.value
  const opts = options.value
  if (!wrap || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachNavigationMenuHighlight(wrap, opts)
}
watch(el, () => {
  detach()
  sync()
}, { flush: 'post' })
watch(options, sync, { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live highlight handle (null before mount / when the goo highlight is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <NavigationMenuList
    :ref="setEl"
    data-slot="navigation-menu-list"
    v-bind="forwarded"
    :class="cn('gap-0 group flex flex-1 list-none items-center justify-center', props.class)"
  >
    <slot />
  </NavigationMenuList>
</template>

<script setup lang="ts">
// GoopNavigationMenuViewport: shadcn-vue's NavigationMenuViewport (reka-ui
// NavigationMenuViewport in shadcn's wrapper, `align`, `class` merge). GoopNavigationMenu
// renders it for you (shadcn's `viewport` prop).
//
// Goo (core `attachNavigationMenuViewport`): the panel is an emerge bloom out of the active
// trigger (it pools under the trigger, spreads with a lobed edge, overshoots and settles; it
// shrinks back into the trigger on close). It sits under the active trigger (reka's `align`,
// default centred), and moving to another trigger does not re-open it: its box slides and
// resizes on a spring as one goo body and settles with a gentle jelly wobble (`jelly`), while
// shadcn's content slide plays inside. The goo is the panel's background, ring and shadow; the
// content fades in as the bloom settles. `bloom: false` (or `:goo="false"`) is shadcn's zoom.
import { attachNavigationMenuViewport, type NavigationMenuBox, type NavigationMenuViewportHandle } from '@goopui/core'
import { cn } from 'cn'
import type { NavigationMenuViewportProps } from 'reka-ui'
import { NavigationMenuViewport, injectNavigationMenuContext, useForwardProps } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type HTMLAttributes } from 'vue'
import { injectGoopNavigationMenu } from './context'
import {
  NAVIGATION_MENU_VIEWPORT,
  NAVIGATION_MENU_VIEWPORT_BOX_GOO,
  NAVIGATION_MENU_VIEWPORT_GOO,
  NAVIGATION_MENU_VIEWPORT_WRAP,
} from './variants'

const props = defineProps<NavigationMenuViewportProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)

const menu = injectNavigationMenuContext()
const root = injectGoopNavigationMenu()
const options = computed(() => root?.goo.value.viewport ?? null)
const open = computed(() => !!menu.modelValue.value)

const box = shallowRef<HTMLElement | null>(null)
const setBox = (c: Element | ComponentPublicInstance | null) => {
  box.value = c instanceof HTMLElement ? c : null
}
/** reka's viewport element (mounted while open or closing; its root is a Presence). */
const viewportEl = () => box.value?.querySelector<HTMLElement>(':scope > [data-slot="navigation-menu-viewport"]') ?? null

const px = (el: HTMLElement, name: string) => Number.parseFloat(el.style.getPropertyValue(name))
/** reka's measured box: the open content's size and the left that puts it under the trigger. */
const target = (): NavigationMenuBox | null => {
  const el = viewportEl()
  if (!el) return null
  const width = px(el, '--reka-navigation-menu-viewport-width')
  const height = px(el, '--reka-navigation-menu-viewport-height')
  const left = px(el, '--reka-navigation-menu-viewport-left')
  if (!(width > 0) || !(height > 0)) return null
  return { left: Number.isFinite(left) ? left : 0, width, height }
}
const trigger = () => menu.activeTrigger.value ?? null

const handle = shallowRef<NavigationMenuViewportHandle | null>(null)
const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const attach = () => {
  const host = box.value
  const opts = options.value
  if (!host || !opts) return detach()
  if (handle.value) detach()
  handle.value = attachNavigationMenuViewport(host, {
    ...opts,
    side: 'bottom',
    anchor: trigger,
    bloomOrigin: trigger,
    target,
  })
  if (open.value) handle.value.open()
}
watch(box, attach, { flush: 'post' })
watch(
  options,
  (next, prev) => {
    if (!next || !prev) return attach()
    handle.value?.update(next)
  },
  { flush: 'post' },
)
// Before render, so goop.css's hold picks up the close duration as data-state flips.
watch(open, (o) => {
  if (o) handle.value?.open()
  else handle.value?.close()
})
// Another trigger took over (or its content resized): the box springs to the new place.
watch(() => menu.modelValue.value, () => handle.value?.refresh(), { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live viewport handle (null before mount / when the goo bloom is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <div
    v-if="options"
    :ref="setBox"
    data-slot="navigation-menu-viewport-box"
    :class="NAVIGATION_MENU_VIEWPORT_BOX_GOO"
  >
    <NavigationMenuViewport
      data-slot="navigation-menu-viewport"
      v-bind="forwarded"
      :class="cn(NAVIGATION_MENU_VIEWPORT_GOO, props.class)"
    />
  </div>
  <div
    v-else
    :class="NAVIGATION_MENU_VIEWPORT_WRAP"
  >
    <NavigationMenuViewport
      data-slot="navigation-menu-viewport"
      v-bind="forwarded"
      :class="cn(NAVIGATION_MENU_VIEWPORT, props.class)"
    />
  </div>
</template>

<script setup lang="ts">
// GoopItem: shadcn-vue's Item (reka-ui Primitive, so `as` and `asChild` work, e.g. with an <a>
// or NuxtLink; `variant`, `size`, `class` merge). An interactive item (a link or button)
// squishes a little when pressed and settles with a small jelly bounce, like a GoopButton body
// (core `attachItemPress`; the CSS `scale` property, never past full size, so nothing shifts).
// A plain <div> item never squishes. In a GoopItemGroup its hover fill is the group's goo blob,
// and it inherits `goo`, `press`, `speed` and `preset` from the group (its own win). Reduced
// motion: no squish. Browser-only: SSR renders shadcn markup.
import { attachItemPress, type ItemPressHandle } from '@goopui/core'
import { cn } from 'cn'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolveItemProps, toItemPressOptions, type GoopItemProps } from '../../goop-props'
import { injectGoopItemGroup } from './context'
import { itemVariants, type ItemSize, type ItemVariant } from './styles'

const props = withDefaults(
  defineProps<
    PrimitiveProps &
      GoopItemProps & {
        class?: HTMLAttributes['class']
        variant?: ItemVariant
        size?: ItemSize
      }
  >(),
  {
    as: 'div',
    variant: 'default',
    size: 'default',
    goo: undefined,
    press: undefined,
    speed: undefined,
    preset: undefined,
  },
)

const group = injectGoopItemGroup()
const config = useGoopConfig()
const options = computed(() => toItemPressOptions(resolveItemProps(props, group?.value), config))

const primitive = useTemplateRef<{ $el: unknown }>('primitive')
const handle = shallowRef<ItemPressHandle | null>(null)
let mounted = false
const host = (): HTMLElement | null => {
  const el = primitive.value?.$el
  return el instanceof HTMLElement ? el : null
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
const sync = (): void => {
  const opts = options.value
  const el = host()
  if (!mounted || !el || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachItemPress(el, opts)
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
  /** The live press handle (null before mount / when the squish is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <Primitive
    ref="primitive"
    data-slot="item"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :class="cn(itemVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>

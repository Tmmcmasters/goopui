<script setup lang="ts">
// GoopCard: shadcn's Card (a div, `size`, `class` merge). Static by default. With `goo`, core's
// `attachCard` adds one aria-hidden svg behind the content and the edge nearest the pointer
// swells gently toward it in a low, wide mound (mouse / pen hover; no filter). Before mount,
// during SSR, with the goo off, or under reduced motion it is a plain shadcn Card.
import { attachCard, type CardHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopCardProps, toCardOptions } from '../../goop-props'
import { CARD, goopCardHost, type CardSize } from './styles'

const props = defineProps({
  ...goopCardProps,
  /** shadcn's size: `default` or `sm` (tighter spacing). */
  size: { type: String as PropType<CardSize>, default: 'default' },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const root = useTemplateRef<HTMLElement>('root')
const config = useGoopConfig()
const options = computed(() => toCardOptions(props, config))
const handle = shallowRef<CardHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !root.value) return
  handle.value = attachCard(root.value, opts)
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

defineExpose({
  /** The live card handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The card element. */
  get el() {
    return root.value ?? null
  },
})
</script>

<template>
  <div
    ref="root"
    data-slot="card"
    :data-size="size"
    :data-goop-host="goo ? 'card' : undefined"
    :class="cn(CARD, goo && goopCardHost, props.class)"
  >
    <slot />
  </div>
</template>

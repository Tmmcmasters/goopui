<script setup lang="ts">
// GoopKbd: shadcn-vue's Kbd (a <kbd>, `class` merge). Clicking it, or pressing the keys in
// `keys` (opt-in, e.g. ['Meta', 'K']), squishes it into its base like a soft key; it springs
// back with a small jelly rebound when released (core `attachKbd`, a transform: no layout
// shift). With the squish on it takes pointer events (shadcn's Kbd is pointer-events-none).
// Before mount, during SSR, with `:goo="false"` or under reduced motion it is a plain shadcn Kbd.
import { attachKbd, type KbdHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopKbdProps, toKbdOptions } from '../../goop-props'
import { KBD, goopKbdPressable } from './styles'

const props = defineProps({
  ...goopKbdProps,
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const root = useTemplateRef<HTMLElement>('root')
const config = useGoopConfig()
const options = computed(() => toKbdOptions(props, config))
const handle = shallowRef<KbdHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !root.value) return
  handle.value = attachKbd(root.value, opts)
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
  /** The live squish handle (null before mount / when off). */
  get handle() {
    return handle.value
  },
  /** Press and release it (a tap). */
  tap: () => handle.value?.tap(),
  get el() {
    return root.value ?? null
  },
})
</script>

<template>
  <kbd ref="root" data-slot="kbd" :class="cn(KBD, options && goopKbdPressable, props.class)">
    <slot />
  </kbd>
</template>

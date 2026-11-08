<script setup lang="ts">
// GoopAlert: shadcn-vue's Alert (a div with role="alert", same cva variants, `class` merge).
// When it mounts or appears (first on screen, or shown again after being hidden) core's
// `attachAlert` plays a soft goo entrance: the body blooms out of its top edge in a low, wide
// mound, overshoots a couple of px and settles (`bloom`); the icon gets one gentle jelly
// wobble (`wobble`). Nothing loops. The alert's box never moves (no layout shift). Before
// mount, during SSR, with `:goo="false"` or under reduced motion it is a plain shadcn Alert.
import { attachAlert, type AlertHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopAlertProps, toAlertOptions } from '../../goop-props'
import { alertVariants, type AlertVariants } from './variants'

const props = defineProps({
  ...goopAlertProps,
  variant: { type: String as PropType<AlertVariants['variant']>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const root = useTemplateRef<HTMLElement>('root')
const config = useGoopConfig()
const options = computed(() => toAlertOptions(props, config))
const handle = shallowRef<AlertHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !root.value) return
  handle.value = attachAlert(root.value, opts)
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
  /** The live entrance handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** Play the entrance again (e.g. when the message changes). */
  replay: () => handle.value?.replay(),
  /** The alert element. */
  get el() {
    return root.value ?? null
  },
})
</script>

<template>
  <div
    ref="root"
    data-slot="alert"
    :data-goop-host="goo ? 'alert' : undefined"
    :class="cn(alertVariants({ variant }), props.class)"
    role="alert"
  >
    <slot />
  </div>
</template>

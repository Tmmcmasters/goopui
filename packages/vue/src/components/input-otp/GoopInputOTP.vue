<script setup lang="ts">
// GoopInputOTP: shadcn-vue's InputOTP layout (group, slots, separator, `class` merge) on reka's
// PinInput (v-model as a string array, `otp`, `type`, `mask`, `placeholder`, `disabled`, ...
// forwarded). On mount core's `attachInputOTP` puts one aria-hidden goo layer behind the cells:
// the focused cell holds a pool of goo that flows into the next cell as you type (and back on
// Backspace), with a small pulse as each digit lands. With `:goo="false"` it is plain.
import { attachInputOTP, type InputOTPHandle } from '@goopui/core'
import { cn } from 'cn'
import { PinInputRoot } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputOTPProps, goopSoundProp, toInputOTPOptions } from '../../goop-props'
import { provideGoopInputOTP } from './context'
import { inputOTPVariants } from './variants'
import { useGoopCue } from '../../sound'

const props = defineProps({
  ...goopInputOTPProps,
  ...goopSoundProp,
  /** One-time-code autocomplete (reka `otp`). Default true, like shadcn's PinInput. */
  otp: { type: Boolean, default: true },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn InputOTP. */
  goo: { type: Boolean, default: true },
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const cue = useGoopCue('inputOtp', { sound: () => props.sound })
const options = computed(() => toInputOTPOptions(props, config))
const handle = shallowRef<InputOTPHandle | null>(null)
const active = ref(false)
provideGoopInputOTP({ active })
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) {
    handle.value = attachInputOTP(el as HTMLElement, options.value)
    active.value = true
  }
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
  active.value = false
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(() => props.goo, (on) => (on ? attach() : detach()), { flush: 'post' })
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <PinInputRoot
    ref="root"
    v-slot="slotProps"
    data-slot="input-otp"
    :otp="otp"
    v-bind="cue"
    :class="cn(inputOTPVariants(), props.class)"
    :data-goop-host="goo ? 'input-otp' : undefined"
    :data-goop-active="active ? '' : undefined"
  >
    <slot v-bind="slotProps" />
  </PinInputRoot>
</template>

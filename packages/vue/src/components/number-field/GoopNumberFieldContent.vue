<script setup lang="ts">
// GoopNumberFieldContent: shadcn-vue's NumberFieldContent (the relative box holding the field
// and its +/- buttons). Inside an active GoopNumberField it is the goo host: on mount core's
// `attachNumberField` puts the aria-hidden ring and stepper layers in it, behind the real
// input and buttons, and every value change nudges toward the side it came from.
import { attachNumberField, type NumberFieldHandle } from '@goopui/core'
import { cn } from 'cn'
import { onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { injectGoopNumberField } from './context'
import { numberFieldContentVariants } from './variants'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const ctx = injectGoopNumberField()
const host = useTemplateRef<HTMLElement>('host')
const handle = shallowRef<NumberFieldHandle | null>(null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !ctx?.goo.value || !host.value) return
  const field = host.value.querySelector<HTMLInputElement>('input[data-slot="input"]') ?? host.value.querySelector('input')
  if (!field) return
  handle.value = attachNumberField(host.value, field, ctx.options.value)
  ctx.active.value = true
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
  if (ctx) ctx.active.value = false
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
if (ctx) {
  watch(ctx.goo, (on) => (on ? attach() : detach()), { flush: 'post' })
  watch(ctx.options, (next) => handle.value?.update(next), { flush: 'post' })
  watch(ctx.value, (next, prev) => {
    if (typeof next === 'number' && typeof prev === 'number' && next !== prev) handle.value?.nudge(Math.sign(next - prev))
  })
}

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  get el() {
    return host.value
  },
})
</script>

<template>
  <div
    ref="host"
    data-slot="number-field-content"
    :data-goop-host="ctx?.goo.value ? 'number-field' : undefined"
    :data-goop-active="handle ? '' : undefined"
    :class="cn(numberFieldContentVariants(), props.class)"
  >
    <slot />
  </div>
</template>

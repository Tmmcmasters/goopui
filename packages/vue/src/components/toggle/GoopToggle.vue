<script setup lang="ts">
// GoopToggle: shadcn-vue's Toggle (reka Toggle, v-model, variants default | outline, sizes,
// `class` merge, `asChild`) whose pressed background is goo. On mount core's `attachToggle` adds
// one aria-hidden goo layer inside the button: pressing floods it from the press point,
// un-pressing drains it back there. Before mount, during SSR, or with `:goo="false"` it is a
// plain shadcn Toggle, so hydration matches.
import { attachToggle, type ToggleHandle } from '@goopui/core'
import { cn } from 'cn'
import { Toggle } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopToggleProps, toToggleOptions } from '../../goop-props'
import { goopToggleColors, goopToggleFilled, toggleVariants, type ToggleVariants } from './variants'

const props = defineProps({
  ...goopToggleProps,
  /** The controlled pressed state (v-model). */
  modelValue: { type: Boolean as PropType<boolean | null>, default: undefined },
  /** The initial pressed state when uncontrolled. */
  defaultValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  variant: { type: String as PropType<ToggleVariants['variant']>, default: 'default' },
  size: { type: String as PropType<ToggleVariants['size']>, default: 'default' },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Toggle. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [payload: boolean] }>()

const inner = ref(props.defaultValue)
const pressed = computed(() => (props.modelValue === undefined || props.modelValue === null ? inner.value : props.modelValue))
const onUpdate = (v: boolean): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const forwarded = computed(() => {
  const out: Record<string, unknown> = { disabled: props.disabled, required: props.required, asChild: props.asChild }
  for (const k of ['name', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({ ...toToggleOptions(props, config), pressed: pressed.value }))
const handle = shallowRef<ToggleHandle | null>(null)
const active = computed(() => handle.value !== null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachToggle(el as HTMLElement, options.value)
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
watch(() => props.goo, (on) => (on ? attach() : detach()), { flush: 'post' })
// flush: 'post' so data-state is patched before core reads it.
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

const classes = computed(() =>
  cn(
    toggleVariants({ variant: props.variant, size: props.size }),
    props.goo && goopToggleColors,
    active.value && goopToggleFilled,
    props.class,
  ),
)

defineExpose({
  /** The live toggle handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The button element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <Toggle
    ref="root"
    v-slot="slotProps"
    data-slot="toggle"
    v-bind="forwarded"
    :model-value="pressed"
    :class="classes"
    :data-goop-host="goo ? 'toggle' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
  >
    <slot v-bind="slotProps" />
  </Toggle>
</template>

<script setup lang="ts">
// GoopSwitch: shadcn-vue's Switch (reka SwitchRoot/SwitchThumb, v-model, `size`, `class`
// merge, same classes) whose thumb is a goo blob. On mount core's `attachSwitch` adds two
// aria-hidden goo layers inside the track: the primary fill, and the thumb on top of it. The
// real thumb stays in place (transparent) and reka keeps role="switch", aria-checked and
// keyboard handling. Before mount, during SSR, or with `:goo="false"` it is a plain shadcn
// Switch, so first paint and hydration match exactly.
import { attachSwitch, type SwitchHandle } from '@goopui/core'
import { cn } from 'cn'
import { SwitchRoot, SwitchThumb } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSwitchProps, toSwitchOptions } from '../../goop-props'
import { goopSwitchColors, goopSwitchFilledTrack, switchThumbVariants, switchVariants, type SwitchSize } from './variants'

const props = defineProps({
  ...goopSwitchProps,
  /** The controlled state (v-model). */
  modelValue: { type: Boolean as PropType<boolean | null>, default: undefined },
  /** The initial state when uncontrolled. */
  defaultValue: { type: Boolean, default: undefined },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  /** Form value when submitted with a `name`. */
  value: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  size: { type: String as PropType<SwitchSize>, default: 'default' },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Switch. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [payload: boolean] }>()

const inner = ref(!!props.defaultValue)
const checked = computed(() => (props.modelValue === undefined || props.modelValue === null ? inner.value : props.modelValue))
const onUpdate = (v: boolean): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const forwarded = computed(() => {
  const out: Record<string, unknown> = { disabled: props.disabled, required: props.required, asChild: props.asChild }
  for (const k of ['id', 'value', 'name', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({ ...toSwitchOptions(props, config), checked: checked.value }))
const handle = shallowRef<SwitchHandle | null>(null)
const active = computed(() => handle.value !== null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachSwitch(el as HTMLElement, options.value)
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
// flush: 'post' so data-state / classes are patched before core re-reads the host.
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

const fillOn = computed(() => props.fill !== false && props.fill !== 0)
const classes = computed(() =>
  cn(switchVariants(), props.goo && goopSwitchColors, active.value && fillOn.value && goopSwitchFilledTrack, props.class),
)

defineExpose({
  /** The live switch handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The track element (role="switch"). */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <SwitchRoot
    ref="root"
    v-slot="slotProps"
    data-slot="switch"
    :data-size="size"
    v-bind="forwarded"
    :model-value="checked"
    :class="classes"
    :data-goop-host="goo ? 'switch' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
  >
    <SwitchThumb
      data-slot="switch-thumb"
      :class="switchThumbVariants()"
      :style="active ? { backgroundColor: 'transparent' } : undefined"
    >
      <slot name="thumb" v-bind="slotProps" />
    </SwitchThumb>
  </SwitchRoot>
</template>

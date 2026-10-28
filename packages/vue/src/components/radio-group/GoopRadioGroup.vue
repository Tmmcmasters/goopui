<script setup lang="ts">
// GoopRadioGroup: shadcn-vue's RadioGroup (reka RadioGroupRoot, v-model, `class` merge, same
// classes) whose selected dot is a goo blob that jumps between items. On mount core's
// `attachRadioGroup` adds one aria-hidden goo layer to the root; every selection change (click,
// keyboard, v-model) re-reads the checked item and the blob bridges, flies and splats there.
// Before mount, during SSR, or with `:goo="false"` it is a plain shadcn RadioGroup.
import { attachRadioGroup, type RadioGroupHandle } from '@goopui/core'
import { cn } from 'cn'
import { RadioGroupRoot, type AcceptableValue } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopRadioProps, toRadioOptions } from '../../goop-props'
import { provideGoopRadioGroup } from './context'
import { goopRadioGroupColors, radioGroupVariants } from './variants'

const props = defineProps({
  ...goopRadioProps,
  /** The controlled value (v-model). */
  modelValue: { type: null as unknown as PropType<AcceptableValue | null>, default: undefined },
  /** The initial value when uncontrolled. */
  defaultValue: { type: null as unknown as PropType<AcceptableValue>, default: undefined },
  disabled: { type: Boolean, default: false },
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: undefined },
  dir: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
  loop: { type: Boolean, default: true },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn RadioGroup. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [payload: AcceptableValue] }>()

const inner = ref<AcceptableValue | undefined>(props.defaultValue)
const selected = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue))
const onUpdate = (v: AcceptableValue): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const forwarded = computed(() => {
  const out: Record<string, unknown> = {
    disabled: props.disabled,
    required: props.required,
    asChild: props.asChild,
    loop: props.loop,
  }
  for (const k of ['orientation', 'dir', 'name', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({ ...toRadioOptions(props, config), value: selected.value }))
const handle = shallowRef<RadioGroupHandle | null>(null)
const active = computed(() => handle.value !== null)
provideGoopRadioGroup({ active })
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachRadioGroup(el as HTMLElement, options.value)
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
// flush: 'post' so the items' aria-checked is patched before core reads the selection.
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

const classes = computed(() => cn(radioGroupVariants(), props.goo && goopRadioGroupColors, props.class))

defineExpose({
  /** The live radio group handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The root element (role="radiogroup"). */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <RadioGroupRoot
    ref="root"
    v-slot="slotProps"
    data-slot="radio-group"
    :class="classes"
    v-bind="forwarded"
    :model-value="selected"
    :data-goop-host="goo ? 'radio-group' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
  >
    <slot v-bind="slotProps" />
  </RadioGroupRoot>
</template>

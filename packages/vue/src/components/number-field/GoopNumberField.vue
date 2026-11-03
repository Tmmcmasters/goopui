<script setup lang="ts">
// GoopNumberField: shadcn-vue's NumberField (reka NumberFieldRoot: v-model, min / max / step,
// formatOptions, locale, disabled, ... all forwarded, `class` merge). The engine props live
// here and reach GoopNumberFieldContent, which attaches core's `attachNumberField`: the Input's
// goo focus ring around the field, +/- buttons that squish a goo dollop on press, and a nudge
// toward the pressed side (dollop + ring ripple) on every step. With `:goo="false"` it is a
// plain shadcn NumberField.
import { cn } from 'cn'
import { NumberFieldRoot } from 'reka-ui'
import { computed, ref, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSoundProp, goopNumberFieldProps, toNumberFieldOptions } from '../../goop-props'
import { provideGoopNumberField } from './context'
import { numberFieldVariants } from './variants'
import { useGoopSound } from '../../sound'

const props = defineProps({
  ...goopNumberFieldProps,
  ...goopSoundProp,
  /** The controlled value (v-model). */
  modelValue: { type: [Number, null] as PropType<number | null>, default: undefined },
  /** The initial value when uncontrolled. */
  defaultValue: { type: Number, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn NumberField. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [value: number | undefined] }>()

const inner = ref<number | null | undefined>(props.defaultValue)
const value = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue))
const onUpdate = (v: number | undefined): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const config = useGoopConfig()
useGoopSound(() => props.sound)
provideGoopNumberField({
  options: computed(() => toNumberFieldOptions(props, config)),
  goo: computed(() => props.goo),
  value,
  active: ref(false),
})
</script>

<template>
  <NumberFieldRoot
    v-slot="slotProps"
    data-slot="number-field"
    :model-value="value as number"
    :class="cn(numberFieldVariants(), props.class)"
    @update:model-value="onUpdate"
  >
    <slot v-bind="slotProps" />
  </NumberFieldRoot>
</template>

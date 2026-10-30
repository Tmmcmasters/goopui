<script setup lang="ts">
// GoopInput: shadcn-vue's Input (v-model, `class` merge, same classes, aria-invalid) with a
// goo focus ring. Focus flows goo around the border from the click point (or the left edge
// on keyboard focus) into a wobbly ring; typing ripples it near the caret; blur drains it.
// aria-invalid turns it destructive with a small drip. Core's `attachInput` draws it on an
// aria-hidden layer in a wrapper (`data-slot="input-goo"`); the real input stays on top,
// unfiltered, and gets every attribute. With `:goo="false"` it is a plain shadcn Input.
import { cn } from 'cn'
import { computed, useTemplateRef, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputProps, toInputOptions } from '../../goop-props'
import { useFieldGoo } from './use-field-goo'
import { goopFieldActive, goopFieldContainer, inputVariants } from './variants'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopInputProps,
  /** Initial value when uncontrolled. */
  defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Classes for the wrapper that holds the goo layer (default `relative w-full min-w-0`). */
  containerClass: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Input (no wrapper). */
  goo: { type: Boolean, default: true },
})

const model = defineModel<string | number>()
if (model.value === undefined && props.defaultValue !== undefined) model.value = props.defaultValue

const host = useTemplateRef<HTMLElement>('host')
const field = useTemplateRef<HTMLInputElement>('field')
const config = useGoopConfig()
const options = computed(() => toInputOptions(props, config))
const { handle, active } = useFieldGoo(host, field, () => props.goo, () => options.value)

const classes = computed(() => cn(inputVariants(), active.value && goopFieldActive, props.class))
const containerClasses = computed(() => cn(goopFieldContainer, props.containerClass))

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The <input> element. */
  get el() {
    return field.value
  },
})
</script>

<template>
  <div
    v-if="goo"
    ref="host"
    data-slot="input-goo"
    data-goop-host="input"
    :data-goop-active="active ? '' : undefined"
    :class="containerClasses"
  >
    <input ref="field" v-model="model" data-slot="input" v-bind="$attrs" :class="classes">
  </div>
  <input v-else ref="field" v-model="model" data-slot="input" v-bind="$attrs" :class="classes">
</template>

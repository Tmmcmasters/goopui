<script setup lang="ts">
// GoopTextarea: shadcn-vue's Textarea (v-model, `class` merge, same classes, aria-invalid)
// with the same goo focus ring as GoopInput (core `attachInput`). The ring follows the
// textarea as it grows (field-sizing-content); typing ripples the edge nearest the caret's
// line. With `:goo="false"` it is a plain shadcn Textarea.
import { cn } from 'cn'
import { computed, useTemplateRef, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputProps, toInputOptions } from '../../goop-props'
import { useFieldGoo } from '../input/use-field-goo'
import { goopFieldActive, goopFieldContainer, textareaVariants } from '../input/variants'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopInputProps,
  /** Initial value when uncontrolled. */
  defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Classes for the wrapper that holds the goo layer (default `relative w-full min-w-0`). */
  containerClass: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Textarea (no wrapper). */
  goo: { type: Boolean, default: true },
})

const model = defineModel<string | number>()
if (model.value === undefined && props.defaultValue !== undefined) model.value = props.defaultValue

const host = useTemplateRef<HTMLElement>('host')
const field = useTemplateRef<HTMLTextAreaElement>('field')
const config = useGoopConfig()
const options = computed(() => toInputOptions(props, config))
const { handle, active } = useFieldGoo(host, field, () => props.goo, () => options.value)

const classes = computed(() => cn(textareaVariants(), active.value && goopFieldActive, props.class))
const containerClasses = computed(() => cn(goopFieldContainer, props.containerClass))

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The <textarea> element. */
  get el() {
    return field.value
  },
})
</script>

<template>
  <div
    v-if="goo"
    ref="host"
    data-slot="textarea-goo"
    data-goop-host="textarea"
    :data-goop-active="active ? '' : undefined"
    :class="containerClasses"
  >
    <textarea ref="field" v-model="model" data-slot="textarea" v-bind="$attrs" :class="classes" />
  </div>
  <textarea v-else ref="field" v-model="model" data-slot="textarea" v-bind="$attrs" :class="classes" />
</template>

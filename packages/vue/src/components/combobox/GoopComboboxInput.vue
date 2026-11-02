<script setup lang="ts">
// GoopComboboxInput: shadcn-vue's ComboboxInput (reka-ui ComboboxInput with a search icon,
// `class` merge, `displayValue`, `autoFocus`) in a rounded input box with GoopInput's goo
// focus ring (core `attachInput`): focus flows goo around the box, typing ripples it, blur
// drains it. The ring's effects are GoopInput's props; `:goo="false"` drops it. Reduced
// motion: a static ring.
import { cn } from 'cn'
import { ComboboxInput } from 'reka-ui'
import { computed, shallowRef, useTemplateRef, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputProps, toInputOptions } from '../../goop-props'
import { useFieldGoo } from '../input/use-field-goo'
import { goopFieldActive } from '../input/variants'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopInputProps,
  /** The search text. */
  modelValue: { type: String, default: undefined },
  /** The text shown for the selected value. */
  displayValue: { type: Function as PropType<(value: any) => string>, default: undefined },
  autoFocus: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Goo focus ring (master switch). */
  goo: { type: Boolean, default: true },
})
const emits = defineEmits<{ 'update:modelValue': [value: string] }>()

const config = useGoopConfig()
const options = computed(() => toInputOptions(props, config))

const host = useTemplateRef<HTMLElement>('host')
const field = shallowRef<HTMLInputElement | null>(null)
const setField = (el: unknown) => {
  const node = (el as { $el?: unknown } | null)?.$el
  field.value = node instanceof HTMLInputElement ? node : null
}
const { handle, active } = useFieldGoo(host, field, () => props.goo, () => options.value)

const reka = computed(() => {
  const out: Record<string, unknown> = { autoFocus: props.autoFocus, disabled: props.disabled }
  if (props.modelValue !== undefined) out.modelValue = props.modelValue
  if (props.displayValue) out.displayValue = props.displayValue
  return out
})

const FIELD =
  'bg-input/30 border-input/30 placeholder:text-muted-foreground h-8 w-full min-w-0 rounded-lg border pr-2.5 pl-8 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50'
const classes = computed(() => cn(FIELD, active.value && goopFieldActive, props.class))

defineExpose({
  /** The live ring handle (null before mount / when goo is off). */
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
    ref="host"
    data-slot="combobox-input-goo"
    data-goop-host="input"
    :data-goop-active="active ? '' : undefined"
    class="relative flex w-full min-w-0 items-center"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class="text-muted-foreground pointer-events-none absolute left-2.5 z-1 size-4 shrink-0"
    >
      <circle
        cx="11"
        cy="11"
        r="8"
      />
      <path d="m21 21-4.3-4.3" />
    </svg>
    <ComboboxInput
      :ref="setField"
      data-slot="combobox-input"
      v-bind="{ ...reka, ...$attrs }"
      :class="classes"
      @update:model-value="(v: string) => emits('update:modelValue', v)"
    />
  </div>
</template>

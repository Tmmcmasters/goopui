<script setup lang="ts">
// GoopCommandInput: shadcn-vue's CommandInput (reka-ui ListboxFilter bound to the command's
// search, a search icon, `class` merge, `autoFocus`) in shadcn's rounded input box, with
// GoopInput's goo focus ring (core `attachInput`): focus flows goo around the box from the
// click point, typing ripples it near the caret, blur drains it. The ring follows the
// command's `ring` toggle; this input's own `goo` prop overrides it, and its ring effects
// (`flow`, `ripple`, `drain`...) are GoopInput's. Reduced motion: a static ring.
import { cn } from 'cn'
import { ListboxFilter } from 'reka-ui'
import { computed, shallowRef, useTemplateRef, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputProps, toInputOptions } from '../../goop-props'
import { useFieldGoo } from '../input/use-field-goo'
import { goopFieldActive } from '../input/variants'
import { injectGoopCommand } from './context'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopInputProps,
  /** The search text (defaults to the command's own filter state). */
  modelValue: { type: String, default: undefined },
  /** Focus the input on mount. */
  autoFocus: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Goo focus ring. Default: the command's `ring` (and `goo`) setting. */
  goo: { type: Boolean, default: undefined },
})
const emits = defineEmits<{ 'update:modelValue': [value: string] }>()

const command = injectGoopCommand()
const config = useGoopConfig()

const search = computed({
  get: () => props.modelValue ?? command.filterState.search,
  set: (v: string) => {
    command.filterState.search = v
    emits('update:modelValue', v)
  },
})
// A controlled search drives the filter too.
if (props.modelValue !== undefined) command.filterState.search = props.modelValue

const enabled = computed(() => command.cmd.value.goo && (props.goo ?? command.cmd.value.ring))
const options = computed(() => {
  const out: Record<string, unknown> = { ...(command.options.value.ring ?? {}) }
  for (const [k, v] of Object.entries(toInputOptions(props, config))) if (v !== undefined) out[k] = v
  return out
})

const host = useTemplateRef<HTMLElement>('host')
const field = shallowRef<HTMLInputElement | null>(null)
const setField = (el: unknown) => {
  const node = (el as { $el?: unknown } | null)?.$el
  field.value = node instanceof HTMLInputElement ? node : null
}
const { handle, active } = useFieldGoo(host, field, () => enabled.value, () => options.value)

const FIELD =
  'bg-input/30 border-input/30 placeholder:text-muted-foreground h-8 w-full min-w-0 rounded-lg border pr-2.5 pl-8 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50'
const classes = computed(() => cn(FIELD, active.value && goopFieldActive, props.class))

defineExpose({
  /** The live ring handle (null before mount / when the ring is off). */
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
    data-slot="command-input-wrapper"
    :class="active ? 'px-1.5 pt-1.5 pb-1' : 'p-1 pb-0'"
  >
    <div
      ref="host"
      data-slot="command-input-goo"
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
      <ListboxFilter
        :ref="setField"
        v-model="search"
        data-slot="command-input"
        :auto-focus="autoFocus"
        :disabled="disabled"
        v-bind="$attrs"
        :class="classes"
      />
    </div>
  </div>
</template>

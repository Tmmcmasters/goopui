<script setup lang="ts">
// GoopCheckbox: shadcn-vue's Checkbox (reka CheckboxRoot/CheckboxIndicator, v-model incl.
// 'indeterminate', `class` merge, same classes) where checking drops goo into the box. On mount
// core's `attachCheckbox` adds one aria-hidden goo layer inside the box; the real check icon
// stays unfiltered on top and is hidden (`data-goop-mark`) while the goo lands. Before mount,
// during SSR, or with `:goo="false"` it is a plain shadcn Checkbox, so hydration matches.
import { attachCheckbox, type CheckboxHandle, type CheckboxState } from '@goopui/core'
import { cn } from 'cn'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopCheckboxProps, toCheckboxOptions } from '../../goop-props'
import { checkboxIndicatorVariants, checkboxVariants, goopCheckboxColors, goopCheckboxFilledBox } from './variants'

const props = defineProps({
  ...goopCheckboxProps,
  /** The controlled state (v-model): true, false or 'indeterminate'. */
  modelValue: { type: [Boolean, String] as PropType<CheckboxState | null>, default: undefined },
  /** The initial state when uncontrolled. */
  defaultValue: { type: [Boolean, String] as PropType<CheckboxState>, default: undefined },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  /** Form value when submitted with a `name`. */
  value: { type: null as unknown as PropType<unknown>, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Checkbox. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [payload: CheckboxState] }>()

const inner = ref<CheckboxState>(props.defaultValue ?? false)
const checked = computed<CheckboxState>(() =>
  props.modelValue === undefined || props.modelValue === null ? inner.value : props.modelValue,
)
const onUpdate = (v: CheckboxState): void => {
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
const options = computed(() => ({ ...toCheckboxOptions(props, config), checked: checked.value }))
const handle = shallowRef<CheckboxHandle | null>(null)
const active = computed(() => handle.value !== null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachCheckbox(el as HTMLElement, options.value)
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
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

const fillOn = computed(() => props.fill !== false && props.fill !== 0)
const classes = computed(() =>
  cn(checkboxVariants(), props.goo && goopCheckboxColors, active.value && fillOn.value && goopCheckboxFilledBox, props.class),
)

defineExpose({
  /** The live checkbox handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The box element (role="checkbox"). */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <CheckboxRoot
    ref="root"
    v-slot="slotProps"
    data-slot="checkbox"
    v-bind="forwarded"
    :model-value="checked"
    :class="classes"
    :data-goop-host="goo ? 'checkbox' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
  >
    <CheckboxIndicator
      data-slot="checkbox-indicator"
      :data-goop-mark="goo ? '' : undefined"
      :class="checkboxIndicatorVariants()"
    >
      <slot v-bind="slotProps">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        ><path d="M20 6 9 17l-5-5" /></svg>
      </slot>
    </CheckboxIndicator>
  </CheckboxRoot>
</template>

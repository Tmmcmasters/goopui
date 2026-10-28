<script setup lang="ts">
// GoopRadioGroupItem: shadcn-vue's RadioGroupItem (same classes, `class` merge, `asChild`).
// Inside an active GoopRadioGroup the checked item drops its own fill (the group's goo blob is
// the fill) and its dot is a `data-goop-mark`, hidden while the blob is still landing.
import type { AcceptableValue } from 'reka-ui'
import { cn } from 'cn'
import { RadioGroupIndicator, RadioGroupItem } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { injectGoopRadioGroup } from './context'
import {
  goopRadioGroupItemFilled,
  radioGroupDotVariants,
  radioGroupIndicatorVariants,
  radioGroupItemVariants,
} from './variants'

const props = defineProps({
  value: { type: null as unknown as PropType<AcceptableValue>, default: undefined },
  id: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const group = injectGoopRadioGroup()
const active = computed(() => group?.active.value ?? false)

const forwarded = computed(() => {
  const out: Record<string, unknown> = { disabled: props.disabled, required: props.required, asChild: props.asChild }
  for (const k of ['value', 'id', 'name', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const classes = computed(() => cn(radioGroupItemVariants(), active.value && goopRadioGroupItemFilled, props.class))
</script>

<template>
  <RadioGroupItem
    data-slot="radio-group-item"
    v-bind="forwarded"
    :class="classes"
  >
    <RadioGroupIndicator
      data-slot="radio-group-indicator"
      :data-goop-mark="group ? '' : undefined"
      :class="radioGroupIndicatorVariants()"
    >
      <slot>
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
          :class="radioGroupDotVariants()"
        ><circle cx="12" cy="12" r="10" /></svg>
      </slot>
    </RadioGroupIndicator>
  </RadioGroupItem>
</template>

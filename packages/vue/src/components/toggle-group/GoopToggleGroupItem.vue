<script setup lang="ts">
// GoopToggleGroupItem: shadcn-vue's ToggleGroupItem (toggleVariants from the group or its own
// props, same classes, `class` merge, `asChild`). Inside an active GoopToggleGroup a pressed item
// drops its own background: the group's goo is the fill.
import type { AcceptableValue } from 'reka-ui'
import { cn } from 'cn'
import { ToggleGroupItem } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { goopToggleItemFilled, toggleVariants, type ToggleVariants } from '../toggle/variants'
import { injectGoopToggleGroup } from './context'
import { toggleGroupItemVariants } from './variants'

const props = defineProps({
  value: { type: null as unknown as PropType<AcceptableValue>, required: true },
  disabled: { type: Boolean, default: false },
  variant: { type: String as PropType<ToggleVariants['variant']>, default: undefined },
  size: { type: String as PropType<ToggleVariants['size']>, default: undefined },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const group = injectGoopToggleGroup()
const variant = computed(() => group?.variant.value || props.variant)
const size = computed(() => group?.size.value || props.size)
const active = computed(() => group?.active.value ?? false)

const forwarded = computed(() => {
  const out: Record<string, unknown> = { disabled: props.disabled, asChild: props.asChild }
  if (props.as !== undefined) out.as = props.as
  return out
})

const classes = computed(() =>
  cn(
    toggleVariants({ variant: variant.value, size: size.value }),
    toggleGroupItemVariants(),
    active.value && goopToggleItemFilled,
    props.class,
  ),
)
</script>

<template>
  <ToggleGroupItem
    v-slot="slotProps"
    data-slot="toggle-group-item"
    :data-variant="variant"
    :data-size="size"
    :data-spacing="group?.spacing.value"
    :value="value"
    v-bind="forwarded"
    :class="classes"
  >
    <slot v-bind="slotProps" />
  </ToggleGroupItem>
</template>

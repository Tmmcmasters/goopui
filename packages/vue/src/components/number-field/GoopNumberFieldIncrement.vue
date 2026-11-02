<script setup lang="ts">
// GoopNumberFieldIncrement: shadcn-vue's NumberFieldIncrement (reka, same classes, `class`
// merge, `asChild`). Inside an active GoopNumberField a press squishes a goo dollop under it.
import { cn } from 'cn'
import { NumberFieldIncrement } from 'reka-ui'
import type { HTMLAttributes, PropType } from 'vue'
import { numberFieldIncrementVariants } from './variants'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})
</script>

<template>
  <NumberFieldIncrement
    data-slot="increment"
    :disabled="props.disabled"
    :as-child="props.asChild"
    v-bind="props.as !== undefined ? { as: props.as } : {}"
    :class="cn(numberFieldIncrementVariants(), props.class)"
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
        class="h-4 w-4"
      ><path d="M5 12h14" /><path d="M12 5v14" /></svg>
    </slot>
  </NumberFieldIncrement>
</template>

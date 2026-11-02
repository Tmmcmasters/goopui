<script setup lang="ts">
// GoopNumberFieldInput: shadcn-vue's NumberFieldInput (reka NumberFieldInput, same classes,
// `class` merge). While the goo is attached the goo ring is the focus indicator: shadcn's
// box-shadow ring and any app `:focus-visible` outline step aside (the Input's rule).
import { cn } from 'cn'
import { NumberFieldInput } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { goopFieldActive } from '../input/variants'
import { injectGoopNumberField } from './context'
import { numberFieldInputVariants } from './variants'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const ctx = injectGoopNumberField()
const classes = computed(() => cn(numberFieldInputVariants(), ctx?.active.value && goopFieldActive, props.class))
</script>

<template>
  <NumberFieldInput data-slot="input" :class="classes" />
</template>

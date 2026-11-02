<script setup lang="ts">
// GoopInputOTPSlot: one cell (reka PinInputInput, a real <input>) with shadcn-vue's
// InputOTPSlot classes. `index` is its position in the code, as in shadcn.
import { cn } from 'cn'
import { PinInputInput } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { injectGoopInputOTP } from './context'
import { goopOTPSlotActive, inputOTPSlotVariants } from './variants'

const props = defineProps({
  index: { type: Number, required: true },
  disabled: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})

const ctx = injectGoopInputOTP()
const classes = computed(() => cn(inputOTPSlotVariants(), ctx?.active.value && goopOTPSlotActive, props.class))
</script>

<template>
  <PinInputInput data-slot="input-otp-slot" :index="index" :disabled="disabled" :class="classes" />
</template>

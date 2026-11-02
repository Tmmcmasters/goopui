<script setup lang="ts">
// GoopInputOTPGroup: shadcn-vue's InputOTPGroup (a run of joined cells).
import { cn } from 'cn'
import type { HTMLAttributes, PropType } from 'vue'
import { inputOTPGroupVariants } from './variants'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})
</script>

<template>
  <div data-slot="input-otp-group" :class="cn(inputOTPGroupVariants(), props.class)">
    <slot />
  </div>
</template>

<script setup lang="ts">
// GoopInputOTPSeparator: shadcn-vue's InputOTPSeparator (role="separator", a minus by default).
import { cn } from 'cn'
import type { HTMLAttributes, PropType } from 'vue'
import { inputOTPSeparatorVariants } from './variants'

const props = defineProps({
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})
</script>

<template>
  <div data-slot="input-otp-separator" role="separator" :class="cn(inputOTPSeparatorVariants(), props.class)">
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
      ><path d="M5 12h14" /></svg>
    </slot>
  </div>
</template>

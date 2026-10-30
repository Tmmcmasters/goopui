<script setup lang="ts">
// GoopSelectScrollUpButton: shadcn-vue's SelectScrollUpButton (`class`, default slot).
import { cn } from 'cn'
import type { SelectScrollUpButtonProps } from 'reka-ui'
import { SelectScrollUpButton, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<SelectScrollUpButtonProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwardedProps = useForwardProps(delegated)
</script>

<template>
  <SelectScrollUpButton
    data-slot="select-scroll-up-button"
    v-bind="forwardedProps"
    :class="cn('bg-popover z-10 flex cursor-default items-center justify-center py-1 [&_svg:not([class*=size-])]:size-4', props.class)"
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
      ><path d="m18 15-6-6-6 6" /></svg>
    </slot>
  </SelectScrollUpButton>
</template>

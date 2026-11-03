<script setup lang="ts">
// GoopComboboxTrigger: shadcn-vue's ComboboxTrigger (reka-ui ComboboxTrigger, `class`
// merge, `asChild`). With no slot content it shows GoopSelect's chevron (size-4), and its box
// is at least 32px wide and 24px tall so it is easy to tap; place it with your own classes
// (e.g. `absolute inset-y-0 right-0`, which makes it the input's full 32px height).
import { cn } from 'cn'
import type { ComboboxTriggerProps } from 'reka-ui'
import { ComboboxTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopCue } from '../../sound'

const props = defineProps<ComboboxTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
const cue = useGoopCue('selectTrigger', { claim: true })

const TRIGGER =
  'text-muted-foreground hover:text-foreground inline-flex min-h-6 min-w-8 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
</script>

<template>
  <ComboboxTrigger
    data-slot="combobox-trigger"
    v-bind="{ ...forwarded, ...cue }"
    :class="cn(TRIGGER, props.class)"
  >
    <slot>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      ><path d="m6 9 6 6 6-6" /></svg>
    </slot>
  </ComboboxTrigger>
</template>

<script setup lang="ts">
// GoopAccordionTrigger: shadcn-vue's AccordionTrigger (AccordionHeader + AccordionTrigger, the
// chevron `icon` slot, same classes as shadcn/ui radix-nova: a down chevron, an up one when open). With goo on it is the row that floods
// (`data-goop-accordion-trigger`); once the goo is half in, core marks it `data-goop-flooded`
// and goop.css switches its text and chevron to the goo's foreground. Layout is shadcn's.
import { cn } from 'cn'
import type { AccordionTriggerProps } from 'reka-ui'
import { AccordionHeader, AccordionTrigger, injectAccordionItemContext } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from './context'
import { useGoopCue } from '../../sound'

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const ctx = injectGoopAccordion()
const goo = computed(() => !!ctx?.value)
const item = injectAccordionItemContext(null)
const cue = useGoopCue('accordionTrigger', { open: () => item?.open.value })
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      data-slot="accordion-trigger"
      v-bind="{ ...delegated, ...cue }"
      :data-goop-accordion-trigger="goo ? '' : undefined"
      :class="
        cn(
          'group/accordion-trigger relative flex flex-1 items-start justify-between rounded-lg border border-transparent py-2.5 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:border-ring disabled:pointer-events-none disabled:opacity-50 **:data-[slot=accordion-trigger-icon]:ml-auto **:data-[slot=accordion-trigger-icon]:size-4 **:data-[slot=accordion-trigger-icon]:text-muted-foreground',
          props.class,
        )
      "
    >
      <slot />
      <slot name="icon">
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
          data-slot="accordion-trigger-icon"
          class="pointer-events-none shrink-0 group-aria-expanded/accordion-trigger:hidden"
        ><path d="m6 9 6 6 6-6" /></svg>
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
          data-slot="accordion-trigger-icon"
          class="pointer-events-none hidden shrink-0 group-aria-expanded/accordion-trigger:inline"
        ><path d="m18 15-6-6-6 6" /></svg>
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>

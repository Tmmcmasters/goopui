<script setup lang="ts">
// GoopAccordionTrigger: shadcn-vue's AccordionTrigger (AccordionHeader + AccordionTrigger, the
// chevron `icon` slot, same classes). With goo on it is the row that floods
// (`data-goop-accordion-trigger`); once the goo is half in, core marks it `data-goop-flooded`
// and goop.css switches its text and chevron to the goo's foreground. Layout is shadcn's.
import { cn } from 'cn'
import type { AccordionTriggerProps } from 'reka-ui'
import { AccordionHeader, AccordionTrigger } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from './context'

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const ctx = injectGoopAccordion()
const goo = computed(() => !!ctx?.value)
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      data-slot="accordion-trigger"
      v-bind="delegated"
      :data-goop-accordion-trigger="goo ? '' : undefined"
      :class="
        cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
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
          class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200"
        ><path d="m6 9 6 6 6-6" /></svg>
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>

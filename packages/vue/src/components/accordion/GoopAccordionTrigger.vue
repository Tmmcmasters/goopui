<script setup lang="ts">
// GoopAccordionTrigger: shadcn-vue's AccordionTrigger (AccordionHeader + AccordionTrigger, the
// chevron `icon` slot, same classes). With goo on, the chevron is the goo's source: a goo blob
// sits behind it (`data-goop-accordion-source`; put that attribute on a custom icon to keep
// it), and the trigger gets side padding so the goo card has room around the label.
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
const goo = computed(() => !!ctx?.options.value)
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      data-slot="accordion-trigger"
      v-bind="delegated"
      :class="
        cn(
          'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
          goo && 'px-3',
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
          :data-goop-accordion-source="goo ? '' : undefined"
          class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200"
        ><path d="m6 9 6 6 6-6" /></svg>
      </slot>
    </AccordionTrigger>
  </AccordionHeader>
</template>

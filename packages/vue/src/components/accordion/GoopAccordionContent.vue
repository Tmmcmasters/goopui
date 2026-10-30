<script setup lang="ts">
// GoopAccordionContent: shadcn-vue's AccordionContent (reka-ui AccordionContent, `class` merge on
// the inner div). With goo on, its height animation is goop.css's (timed by core so the reveal
// follows the goo; reka's --reka-accordion-content-height) instead of tw-animate's, and the
// inner div gets side padding to sit inside the goo card.
import { cn } from 'cn'
import type { AccordionContentProps } from 'reka-ui'
import { AccordionContent } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from './context'

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const ctx = injectGoopAccordion()
const goo = computed(() => !!ctx?.options.value)
</script>

<template>
  <AccordionContent
    data-slot="accordion-content"
    v-bind="delegated"
    :data-goop-accordion-content="goo ? '' : undefined"
    :class="
      goo
        ? 'overflow-hidden text-sm'
        : 'data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm'
    "
  >
    <div :class="cn('pt-0 pb-4', goo && 'px-3', props.class)">
      <slot />
    </div>
  </AccordionContent>
</template>

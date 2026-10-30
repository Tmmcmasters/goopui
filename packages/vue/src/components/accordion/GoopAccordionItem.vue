<script setup lang="ts">
// GoopAccordionItem: shadcn-vue's AccordionItem (reka-ui AccordionItem, `class` merge). Inside a
// GoopAccordion with goo on, core's `attachAccordion` puts GoopToggle's goo fill on the item's
// trigger row (one aria-hidden layer inside the trigger) and times the content's jelly spring.
// Closed items look exactly like shadcn. Browser-only: SSR and first paint render plain shadcn
// markup.
import { cn } from 'cn'
import type { AccordionItemProps } from 'reka-ui'
import { AccordionItem, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from './context'
import { useAccordionGoo, useElementRef } from './use-accordion-goo'

const props = defineProps<AccordionItemProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)

const ctx = injectGoopAccordion()
const options = computed(() => ctx?.value ?? null)
const [el, setEl] = useElementRef()
const handle = useAccordionGoo(el, options)

defineExpose({
  /** The live accordion handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <AccordionItem
    v-slot="slotProps"
    :ref="setEl"
    data-slot="accordion-item"
    v-bind="forwarded"
    :data-goop-accordion="options ? '' : undefined"
    :class="cn('border-b last:border-b-0', props.class)"
  >
    <slot v-bind="slotProps" />
  </AccordionItem>
</template>

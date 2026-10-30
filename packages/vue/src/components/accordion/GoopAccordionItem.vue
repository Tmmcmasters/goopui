<script setup lang="ts">
// GoopAccordionItem: shadcn-vue's AccordionItem (reka-ui AccordionItem, `class` merge). Inside a
// GoopAccordion with goo on, core's `attachAccordion` adds one aria-hidden goo layer to the
// item: opening pours the content down out of the trigger (lead drips, then a jelly fill),
// closing sucks it back up into the chevron blob with a slosh. The real trigger and content
// stay unfiltered on top. Browser-only: SSR and first paint render plain shadcn markup.
import { cn } from 'cn'
import type { AccordionItemProps } from 'reka-ui'
import { AccordionItem, useForwardProps } from 'reka-ui'
import { computed, onBeforeUnmount, watch, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from './context'
import { useAccordionGoo, useElementRef } from './use-accordion-goo'

const props = defineProps<AccordionItemProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)

const ctx = injectGoopAccordion()
const goo = computed(() => !!ctx?.options.value)
const [el, setEl] = useElementRef()
watch(el, (node, prev) => {
  if (prev) ctx?.register(props.value, null)
  if (node) ctx?.register(props.value, node)
})
onBeforeUnmount(() => ctx?.register(props.value, null))

const options = computed(() => {
  const base = ctx?.options.value
  if (!ctx || !base) return null
  const open = ctx.isOpen(props.value)
  return { ...base, open, flow: ctx.flowFor(props.value, open) }
})
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
    :data-goop-accordion="goo ? '' : undefined"
    :class="cn('border-b last:border-b-0', props.class)"
  >
    <slot v-bind="slotProps" />
  </AccordionItem>
</template>

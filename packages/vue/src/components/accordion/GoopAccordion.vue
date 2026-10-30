<script setup lang="ts">
// GoopAccordion: shadcn-vue's Accordion (reka-ui AccordionRoot, same props / emits / slot)
// whose open trigger rows are flooded with goo (GoopToggle's flood: from the click point, a
// wobble once full, a few droplets) while the content opens on a jelly spring. Engine props
// (flood, wobble, droplets, jelly, speed, preset, renderer; `:goo="false"` = plain shadcn) are
// set here and every GoopAccordionItem follows them. In a single accordion the old row drains
// while the new one floods.
import type { AccordionRootEmits, AccordionRootProps } from 'reka-ui'
import { AccordionRoot, useForwardPropsEmits } from 'reka-ui'
import { computed } from 'vue'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, toAccordionOptions, type GoopAccordionProps } from '../../goop-props'
import { provideGoopAccordion } from './context'

const props = withDefaults(defineProps<AccordionRootProps & GoopAccordionProps>(), {
  goo: undefined,
  flood: undefined,
  wobble: undefined,
  droplets: undefined,
  jelly: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  collapsible: undefined,
  disabled: undefined,
  unmountOnHide: undefined,
})
const emits = defineEmits<AccordionRootEmits>()

const OWN = new Set<string>(ACCORDION_PROP_KEYS)
const delegated = computed(
  () => Object.fromEntries(Object.entries(props).filter(([k, v]) => !OWN.has(k) && v !== undefined)) as AccordionRootProps,
)
const forwarded = useForwardPropsEmits(delegated, emits)

const config = useGoopConfig()
provideGoopAccordion(computed(() => toAccordionOptions(props, config)))
</script>

<template>
  <AccordionRoot v-slot="slotProps" data-slot="accordion" v-bind="forwarded">
    <slot v-bind="slotProps" />
  </AccordionRoot>
</template>

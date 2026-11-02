<script setup lang="ts">
// GoopCollapsible: shadcn-vue's Collapsible (reka-ui CollapsibleRoot, same props / emits / slot,
// `class` merge). With goo on, core's `attachAccordion` floods the trigger (GoopCollapsibleTrigger)
// with goo from the click point while open (GoopToggle's fill) and opens the content on a jelly
// spring. Engine props as GoopAccordion. `:goo="false"` = plain shadcn.
import type { CollapsibleRootEmits, CollapsibleRootProps } from 'reka-ui'
import { CollapsibleRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, toAccordionOptions, type GoopAccordionProps } from '../../goop-props'
import { provideGoopAccordion } from '../accordion/context'
import { useAccordionGoo, useElementRef } from '../accordion/use-accordion-goo'

const props = withDefaults(defineProps<CollapsibleRootProps & GoopAccordionProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  flood: undefined,
  wobble: undefined,
  droplets: undefined,
  jelly: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  open: undefined,
  defaultOpen: undefined,
  disabled: undefined,
  unmountOnHide: undefined,
})
const emits = defineEmits<CollapsibleRootEmits>()

const OWN = new Set<string>([...ACCORDION_PROP_KEYS, 'class'])
const delegated = computed(
  () => Object.fromEntries(Object.entries(props).filter(([k, v]) => !OWN.has(k) && v !== undefined)) as CollapsibleRootProps,
)
const forwarded = useForwardPropsEmits(delegated, emits)

const config = useGoopConfig()
const options = computed(() => toAccordionOptions(props, config))
provideGoopAccordion(options)
const [el, setEl] = useElementRef()
const handle = useAccordionGoo(el, options)

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <CollapsibleRoot
    v-slot="slotProps"
    :ref="setEl"
    data-slot="collapsible"
    v-bind="forwarded"
    :data-goop-accordion="options ? '' : undefined"
    :class="props.class"
  >
    <slot v-bind="slotProps" />
  </CollapsibleRoot>
</template>

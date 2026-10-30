<script setup lang="ts">
// GoopAccordion: shadcn-vue's Accordion (reka-ui AccordionRoot, same props / emits / slot)
// whose items pour open like liquid (jelly landing + splash) and are sucked back up into the
// chevron. Engine props (pour, jelly, splash, splashAmount, slosh, handoff, speed, preset,
// renderer; `:goo="false"` = plain shadcn) are set here and every GoopAccordionItem follows
// them. It mirrors reka's open value so that when one item closes as another opens, the
// opening one waits a beat for the closing one (`handoff`).
import { accordionFlowBetween, type AccordionFlow } from '@goopui/core'
import type { AccordionRootEmits, AccordionRootProps } from 'reka-ui'
import { AccordionRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, shallowRef, watch } from 'vue'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, toAccordionOptions, type GoopAccordionProps } from '../../goop-props'
import { provideGoopAccordion } from './context'

const props = withDefaults(defineProps<AccordionRootProps & GoopAccordionProps>(), {
  goo: undefined,
  pour: undefined,
  jelly: undefined,
  splash: undefined,
  splashAmount: undefined,
  slosh: undefined,
  handoff: undefined,
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
const options = computed(() => toAccordionOptions(props, config))

// Mirror of reka's open value: what reka emits, and any change of the controlling prop (a
// collapsed single accordion emits undefined, so undefined is a real value here).
type Value = string | string[] | undefined
const current = shallowRef<Value>((props.modelValue ?? props.defaultValue) as Value)
watch(
  () => props.modelValue,
  (v) => {
    current.value = v as Value
  },
)
const onUpdate = (v: unknown): void => {
  current.value = v as Value
}
const openSet = (v: Value | null): string[] => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v])
const isOpen = (value: string): boolean => openSet(current.value).includes(value)

// The latest change, recorded synchronously so the items' option computeds see it.
let change: { opened: string[]; closed: string[] } = { opened: [], closed: [] }
watch(
  current,
  (next, prev) => {
    const a = openSet(prev)
    const b = openSet(next)
    change = { opened: b.filter((x) => !a.includes(x)), closed: a.filter((x) => !b.includes(x)) }
  },
  { flush: 'sync' },
)

const items = new Map<string, HTMLElement>()
const flowFor = (value: string, open: boolean): AccordionFlow => {
  const self = items.get(value)
  const other = (open ? change.closed : change.opened).find((v) => v !== value)
  const el = other === undefined ? undefined : items.get(other)
  if (!self || !el) return 'source'
  return open ? accordionFlowBetween(el, self) : accordionFlowBetween(self, el)
}

provideGoopAccordion({
  options,
  isOpen,
  register(value, el) {
    if (el) items.set(value, el)
    else items.delete(value)
  },
  flowFor,
})
</script>

<template>
  <AccordionRoot v-slot="slotProps" data-slot="accordion" v-bind="forwarded" @update:model-value="onUpdate">
    <slot v-bind="slotProps" />
  </AccordionRoot>
</template>

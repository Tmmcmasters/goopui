<script setup lang="ts">
// GoopCollapsible: shadcn-vue's Collapsible (reka-ui CollapsibleRoot, same props / emits / slot,
// `class` merge). With goo on, core's `attachAccordion` adds one aria-hidden goo layer to the
// root: opening pours the content down out of the trigger (the trigger is the goo's source
// blob; lead drips, then a jelly fill over everything down to the content's end), closing
// sucks it back up into the trigger with a slosh. The real content stays unfiltered on top.
// Engine props as GoopAccordion (`handoff` does nothing here). `:goo="false"` = plain shadcn.
import type { CollapsibleRootEmits, CollapsibleRootProps } from 'reka-ui'
import { CollapsibleRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, shallowRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { ACCORDION_PROP_KEYS, toAccordionOptions, type GoopAccordionProps } from '../../goop-props'
import { provideGoopCollapsible } from '../accordion/context'
import { useAccordionGoo, useElementRef } from '../accordion/use-accordion-goo'

const props = withDefaults(defineProps<CollapsibleRootProps & GoopAccordionProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  fill: undefined,
  drips: undefined,
  jelly: undefined,
  slosh: undefined,
  source: undefined,
  handoff: undefined,
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

// Mirror of reka's open state: what reka emits, and any change of the controlling prop.
const current = shallowRef<boolean>(props.open ?? props.defaultOpen ?? false)
watch(
  () => props.open,
  (v) => {
    if (v !== undefined) current.value = v
  },
)
const onUpdate = (v: boolean): void => {
  current.value = v
}

const config = useGoopConfig()
const base = computed(() => toAccordionOptions(props, config))
provideGoopCollapsible(computed(() => base.value !== null))
const options = computed(() => (base.value ? { ...base.value, open: current.value, flow: 'source' as const } : null))
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
    @update:open="onUpdate"
  >
    <slot v-bind="slotProps" />
  </CollapsibleRoot>
</template>

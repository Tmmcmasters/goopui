<script setup lang="ts">
// GoopCollapsibleTrigger: shadcn-vue's CollapsibleTrigger (reka-ui, unstyled, `asChild`). With
// goo on it floods with goo from the click point while the collapsible is open
// (`data-goop-accordion-trigger`; its text switches to the goo's foreground once flooded).
import type { CollapsibleTriggerProps } from 'reka-ui'
import { CollapsibleTrigger } from 'reka-ui'
import { computed } from 'vue'
import { injectGoopAccordion } from '../accordion/context'

const props = defineProps<CollapsibleTriggerProps>()
const ctx = injectGoopAccordion()
const on = computed(() => !!ctx?.value)
</script>

<template>
  <CollapsibleTrigger data-slot="collapsible-trigger" v-bind="props" :data-goop-accordion-trigger="on ? '' : undefined">
    <slot />
  </CollapsibleTrigger>
</template>

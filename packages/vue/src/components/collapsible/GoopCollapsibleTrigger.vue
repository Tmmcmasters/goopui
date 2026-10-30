<script setup lang="ts">
// GoopCollapsibleTrigger: shadcn-vue's CollapsibleTrigger (reka-ui, unstyled, `asChild`). With
// goo on it is the goo's source: the content pours out of it and is sucked back into it.
import type { CollapsibleTriggerProps } from 'reka-ui'
import { CollapsibleTrigger } from 'reka-ui'
import { computed } from 'vue'
import { injectGoopCollapsible } from '../accordion/context'

const props = defineProps<CollapsibleTriggerProps>()
const goo = injectGoopCollapsible()
const on = computed(() => !!goo?.value)
</script>

<template>
  <CollapsibleTrigger data-slot="collapsible-trigger" v-bind="props" :data-goop-accordion-source="on ? '' : undefined">
    <slot />
  </CollapsibleTrigger>
</template>

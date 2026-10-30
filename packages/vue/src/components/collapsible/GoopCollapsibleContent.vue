<script setup lang="ts">
// GoopCollapsibleContent: shadcn-vue's CollapsibleContent (reka-ui, `class` passthrough). With
// goo on it gets goop.css's spring height animation (timed by core; reka's
// --reka-collapsible-content-height) and clips while it grows.
import { cn } from 'cn'
import type { CollapsibleContentProps } from 'reka-ui'
import { CollapsibleContent } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopAccordion } from '../accordion/context'

const props = defineProps<CollapsibleContentProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const ctx = injectGoopAccordion()
const on = computed(() => !!ctx?.value)
</script>

<template>
  <CollapsibleContent
    data-slot="collapsible-content"
    v-bind="delegated"
    :data-goop-accordion-content="on ? '' : undefined"
    :class="cn(on && 'overflow-hidden', props.class)"
  >
    <slot />
  </CollapsibleContent>
</template>

<script setup lang="ts">
// GoopTabsTrigger: shadcn-vue's TabsTrigger (reka-ui TabsTrigger, `class` merge, `asChild`).
// Inside a GoopTabsList with the goo indicator on, the active bg and shadow are painted by the
// goo blob behind it instead of the trigger itself.
import { cn } from 'cn'
import type { TabsTriggerProps } from 'reka-ui'
import { TabsTrigger, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopTabsList } from './context'
import { tabsTriggerClass, tabsTriggerGooClass } from './variants'

const props = defineProps<TabsTriggerProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
const list = injectGoopTabsList()

const classes = computed(() => cn(...(list?.blob.value ? tabsTriggerGooClass : tabsTriggerClass), props.class))
</script>

<template>
  <TabsTrigger
    data-slot="tabs-trigger"
    :class="classes"
    v-bind="forwarded"
  >
    <slot />
  </TabsTrigger>
</template>

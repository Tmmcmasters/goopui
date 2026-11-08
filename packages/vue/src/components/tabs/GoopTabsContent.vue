<script setup lang="ts">
// GoopTabsContent: shadcn-vue's TabsContent (reka-ui TabsContent, `class` merge).
import { cn } from 'cn'
import type { TabsContentProps } from 'reka-ui'
import { TabsContent } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { TABS_CONTENT } from './variants'

const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <TabsContent
    data-slot="tabs-content"
    :class="cn(TABS_CONTENT, props.class)"
    v-bind="delegated"
  >
    <slot />
  </TabsContent>
</template>

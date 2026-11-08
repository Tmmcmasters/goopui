<script setup lang="ts">
// GoopTabs: shadcn-vue's Tabs root (reka-ui TabsRoot, same props/emits/slot, `class` merge).
import { cn } from 'cn'
import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import type { GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { TABS_ROOT } from './variants'

const props = withDefaults(defineProps<TabsRootProps & GoopSoundProps & { class?: HTMLAttributes['class'] }>(), { sound: undefined })
const emits = defineEmits<TabsRootEmits>()

const delegated = computed(() => {
  const { class: _class, sound: _sound, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
useGoopSound(() => props.sound)
</script>

<template>
  <TabsRoot
    v-slot="slotProps"
    data-slot="tabs"
    :data-orientation="forwarded.orientation || 'horizontal'"
    v-bind="forwarded"
    :class="cn(TABS_ROOT, props.class)"
  >
    <slot v-bind="slotProps" />
  </TabsRoot>
</template>

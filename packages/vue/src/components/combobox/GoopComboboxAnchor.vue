<script setup lang="ts">
// GoopComboboxAnchor: shadcn-vue's ComboboxAnchor (reka-ui ComboboxAnchor, `class` merge,
// `asChild`). The list positions against it, and its bloom keeps the splash off it.
import { cn } from 'cn'
import type { ComboboxAnchorProps } from 'reka-ui'
import { ComboboxAnchor, useForwardProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopComboboxRoot } from './context'

const props = defineProps<ComboboxAnchorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardProps(delegated)
const root = injectGoopComboboxRoot()
const setEl = (v: unknown) => {
  if (!root) return
  const node = (v as { $el?: unknown } | null)?.$el ?? v
  root.anchor.value = node instanceof HTMLElement ? node : null
}
</script>

<template>
  <ComboboxAnchor
    :ref="setEl"
    data-slot="combobox-anchor"
    v-bind="forwarded"
    :class="cn('w-[200px]', props.class)"
  >
    <slot />
  </ComboboxAnchor>
</template>

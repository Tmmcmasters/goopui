<script setup lang="ts">
// GoopComboboxItemIndicator: shadcn-vue's ComboboxItemIndicator (reka-ui
// ComboboxItemIndicator, shown on the selected item, `class` merge, `ml-auto`). Inside a goo
// list, when its item is chosen the check mark plops in (core `plopIn`: falls in small,
// squashes as it lands, jiggles back to round).
import { plopIn } from '@goopui/core'
import { cn } from 'cn'
import type { ComboboxItemIndicatorProps } from 'reka-ui'
import { ComboboxItemIndicator } from 'reka-ui'
import { computed, onMounted, useTemplateRef, type HTMLAttributes } from 'vue'
import { injectGoopComboboxItem, injectGoopComboboxList } from './context'

const props = defineProps<ComboboxItemIndicatorProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})

const list = injectGoopComboboxList()
const item = injectGoopComboboxItem()
const mark = useTemplateRef<HTMLElement>('mark')
// Mounted only while its item is selected: plop when that's because it was just chosen.
onMounted(() => {
  const opts = list?.plop.value
  if (item?.takeChosen() && opts && mark.value) plopIn(mark.value, opts)
})
</script>

<template>
  <ComboboxItemIndicator
    data-slot="combobox-item-indicator"
    v-bind="delegated"
    :class="cn('pointer-events-none absolute right-2 flex size-4 items-center justify-center', props.class)"
  >
    <span
      ref="mark"
      data-slot="combobox-item-indicator-mark"
      class="flex items-center justify-center"
      style="transform-origin: 50% 85%"
    >
      <slot>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-4"
          aria-hidden="true"
        ><path d="M20 6 9 17l-5-5" /></svg>
      </slot>
    </span>
  </ComboboxItemIndicator>
</template>

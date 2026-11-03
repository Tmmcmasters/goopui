<script setup lang="ts">
// GoopComboboxItem: shadcn-vue's ComboboxItem (reka-ui ComboboxItem, `value`, `disabled`,
// `textValue`, `class`, `asChild`). Inside a goo list the highlight is the list's goo blob
// (the flat bg is dropped); choosing squishes the blob, sets the value right away and closes
// the list once the pop has played (`event.preventDefault()` in your @select still cancels
// the choice). A GoopComboboxItemIndicator inside plops its check mark in when chosen.
import { cn } from 'cn'
import type { AcceptableValue, ComboboxItemEmits, ComboboxItemProps } from 'reka-ui'
import { ComboboxItem, injectComboboxRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopComboboxList, provideGoopComboboxItem } from './context'
import { useGoopCue } from '../../sound'

/** shadcn's flat highlight, used when the goo blob is off. */
const FLAT_BG = 'data-highlighted:bg-accent'

const props = defineProps<ComboboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ComboboxItemEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const root = injectComboboxRootContext()
const list = injectGoopComboboxList()

let chosen = false
provideGoopComboboxItem({
  takeChosen() {
    const was = chosen
    chosen = false
    return was
  },
})

const classes = computed(() =>
  cn(
    list?.blob.value ? '' : FLAT_BG,
    "data-highlighted:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    props.class,
  ),
)

const isSelected = (): boolean => {
  const v = root.modelValue.value as AcceptableValue | AcceptableValue[] | undefined
  return Array.isArray(v) ? v.includes(props.value) : v === props.value
}

// Runs after the consumer's @select (forwarded first), so their preventDefault is seen.
const onSelect = (event: Event) => {
  if (event.defaultPrevented || props.disabled || !list) return
  const multiple = root.multiple.value
  chosen = !isSelected()
  if (multiple) {
    // The pop holds reka's default, so toggle the value here (the list stays open).
    list.select(event, {
      commit: () => {
        const cur = root.modelValue.value
        const arr = Array.isArray(cur) ? [...cur] : []
        const i = arr.indexOf(props.value)
        if (i >= 0) arr.splice(i, 1)
        else arr.push(props.value)
        root.modelValue.value = arr
      },
      close: false,
    })
    return
  }
  list.select(event, {
    commit: () => {
      root.modelValue.value = props.value
    },
    close: true,
  })
}
const cue = useGoopCue('comboboxItem')
</script>

<template>
  <ComboboxItem
    data-slot="combobox-item"
    v-bind="{ ...forwarded, ...cue }"
    :class="classes"
    @select="onSelect"
  >
    <slot />
  </ComboboxItem>
</template>

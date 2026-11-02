<script setup lang="ts">
// GoopSelectItem: shadcn-vue's SelectItem (`value`, `disabled`, `textValue`, `class`, check
// indicator, `#indicator-icon` slot). Inside a goo select the highlight is the list's goo
// blob (the flat focus bg is dropped); choosing squishes the blob, sets the value right away
// and closes the list once the pop has played (`event.preventDefault()` in your @select still
// cancels the choice). The chosen item's check mark plops in (core `plopIn`).
import { plopIn } from '@goopui/core'
import { cn } from 'cn'
import type { SelectItemEmits, SelectItemProps } from 'reka-ui'
import { SelectItem, SelectItemIndicator, SelectItemText, injectSelectRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { injectGoopSelectContent } from './context'

/** shadcn's flat highlight, used when the goo blob is off. */
const FLAT_BG = 'focus:bg-accent'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<SelectItemEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const root = injectSelectRootContext()
const content = injectGoopSelectContent()

const classes = computed(() =>
  cn(
    content?.blob.value ? '' : FLAT_BG,
    'focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm [&_svg:not([class*=size-])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 relative flex w-full cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
    props.class,
  ),
)

// The check mark plops in only when this item is chosen while the list is open (not every
// time the list opens on an already-selected item).
const mark = useTemplateRef<HTMLElement>('mark')
let chosen = false
watch(
  mark,
  (el) => {
    const opts = content?.plop.value
    if (el && chosen && opts) plopIn(el, opts)
    chosen = false
  },
  { flush: 'post' },
)

// Runs after the consumer's @select (forwarded first), so their preventDefault is seen.
const onSelect = (event: Event) => {
  if (event.defaultPrevented || props.disabled) return
  // Already showing its mark: re-choosing (or a multi-select un-choosing) plops nothing.
  chosen = !mark.value
  content?.select(event, {
    commit: () => root.onValueChange(props.value),
    close: !root.multiple.value,
  })
}
</script>

<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwarded"
    :class="classes"
    @select="onSelect"
  >
    <span
      class="pointer-events-none absolute right-2 flex size-4 items-center justify-center"
      data-slot="select-item-indicator"
    >
      <SelectItemIndicator>
        <span
          ref="mark"
          data-slot="select-item-indicator-mark"
          class="flex items-center justify-center"
          style="transform-origin: 50% 85%"
        >
          <slot name="indicator-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="pointer-events-none"
              aria-hidden="true"
            ><path d="M20 6 9 17l-5-5" /></svg>
          </slot>
        </span>
      </SelectItemIndicator>
    </span>
    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>

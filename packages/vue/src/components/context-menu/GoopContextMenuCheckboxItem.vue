<script setup lang="ts">
// GoopContextMenuCheckboxItem: shadcn-vue's ContextMenuCheckboxItem (v-model, `class`,
// `#indicator-icon` slot). In a goo menu, toggling pops the highlight blob before the menu
// closes.
import { cn } from 'cn'
import type { ContextMenuCheckboxItemEmits, ContextMenuCheckboxItemProps } from 'reka-ui'
import { ContextMenuCheckboxItem, ContextMenuItemIndicator, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopMenuContent } from '../dropdown-menu/context'
import { useGoopCue } from '../../sound'
import { quietFocus } from '../dropdown-menu/quiet-focus'

const props = defineProps<ContextMenuCheckboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ContextMenuCheckboxItemEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const menu = injectGoopMenuContent()

const classes = computed(() =>
  cn(
    menu?.blob.value ? '' : 'focus:bg-accent',
    'relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none focus:text-accent-foreground data-inset:pl-7 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
    props.class,
  ),
)
const onSelect = (event: Event) => menu?.select(event)
const cue = useGoopCue('menuCheckboxItem')
</script>

<template>
  <ContextMenuCheckboxItem
    data-slot="context-menu-checkbox-item"
    v-bind="{ ...forwarded, ...cue }"
    :class="classes"
    @pointermove="quietFocus"
    @select="onSelect"
  >
    <span
      class="pointer-events-none absolute right-2"
      data-slot="context-menu-checkbox-item-indicator"
    >
      <ContextMenuItemIndicator>
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
            aria-hidden="true"
          ><path d="M20 6 9 17l-5-5" /></svg>
        </slot>
      </ContextMenuItemIndicator>
    </span>
    <slot />
  </ContextMenuCheckboxItem>
</template>

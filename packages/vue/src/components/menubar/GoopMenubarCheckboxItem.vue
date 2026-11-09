<script setup lang="ts">
// GoopMenubarCheckboxItem: shadcn-vue's MenubarCheckboxItem (v-model, `class`,
// `#indicator-icon` slot). In a goo menu, toggling pops the highlight blob before the menu
// closes.
import { cn } from 'cn'
import type { MenubarCheckboxItemEmits, MenubarCheckboxItemProps } from 'reka-ui'
import { MenubarCheckboxItem, MenubarItemIndicator, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopMenuContent } from '../dropdown-menu/context'
import { useGoopCue } from '../../sound'
import { quietFocus } from '../dropdown-menu/quiet-focus'

const props = defineProps<MenubarCheckboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<MenubarCheckboxItemEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const menu = injectGoopMenuContent()

const classes = computed(() =>
  cn(
    menu?.blob.value ? '' : 'focus:bg-accent',
    'focus:text-accent-foreground focus:**:text-accent-foreground gap-1.5 rounded-md py-1 pr-1.5 pl-7 text-sm data-inset:pl-7 relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    props.class,
  ),
)
const onSelect = (event: Event) => menu?.select(event)
const cue = useGoopCue('menuCheckboxItem')
</script>

<template>
  <MenubarCheckboxItem
    data-slot="menubar-checkbox-item"
    v-bind="{ ...forwarded, ...cue }"
    :class="classes"
    @pointermove="quietFocus"
    @select="onSelect"
  >
    <span
      class="left-1.5 size-4 [&_svg:not([class*=size-])]:size-4 pointer-events-none absolute flex items-center justify-center"
      data-slot="menubar-checkbox-item-indicator"
    >
      <MenubarItemIndicator>
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
      </MenubarItemIndicator>
    </span>
    <slot />
  </MenubarCheckboxItem>
</template>

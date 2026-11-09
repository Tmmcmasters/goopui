<script setup lang="ts">
// GoopMenubarItem: shadcn-vue's MenubarItem (`inset`, `variant="destructive"`,
// `class`, `asChild`). Inside a goo menu the highlight is the menu's goo blob, so the flat
// focus background is dropped, and selecting plays the blob's pop before the menu closes
// (`event.preventDefault()` in your @select still keeps the menu open).
import { cn } from 'cn'
import type { MenubarItemEmits, MenubarItemProps } from 'reka-ui'
import { MenubarItem, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopMenuContent } from '../dropdown-menu/context'
import { useGoopCue } from '../../sound'
import { quietFocus } from '../dropdown-menu/quiet-focus'

/** shadcn's flat highlight, used when the goo blob is off. */
const FLAT_BG =
  'focus:bg-accent data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20'

const props = withDefaults(
  defineProps<
    MenubarItemProps & {
      class?: HTMLAttributes['class']
      inset?: boolean
      variant?: 'default' | 'destructive'
    }
  >(),
  {
    variant: 'default',
  },
)
const emits = defineEmits<MenubarItemEmits>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, variant: _variant, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const menu = injectGoopMenuContent()

const classes = computed(() =>
  cn(
    menu?.blob.value ? '' : FLAT_BG,
    'focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive! not-data-[variant=destructive]:focus:**:text-accent-foreground gap-1.5 rounded-md px-1.5 py-1 text-sm data-disabled:opacity-50 data-inset:pl-7 [&_svg:not([class*=size-])]:size-4 group/menubar-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0',
    props.class,
  ),
)
// Runs after the consumer's @select (forwarded first), so their preventDefault is seen.
const onSelect = (event: Event) => menu?.select(event)
const cue = useGoopCue('menuItem')
</script>

<template>
  <MenubarItem
    data-slot="menubar-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="{ ...forwarded, ...cue }"
    :class="classes"
    @pointermove="quietFocus"
    @select="onSelect"
  >
    <slot />
  </MenubarItem>
</template>

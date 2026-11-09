<script setup lang="ts">
// GoopContextMenuItem: shadcn-vue's ContextMenuItem (`inset`, `variant="destructive"`,
// `class`, `asChild`). Inside a goo menu the highlight is the menu's goo blob, so the flat
// focus background is dropped, and selecting plays the blob's pop before the menu closes
// (`event.preventDefault()` in your @select still keeps the menu open).
import { cn } from 'cn'
import type { ContextMenuItemEmits, ContextMenuItemProps } from 'reka-ui'
import { ContextMenuItem, useForwardPropsEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopMenuContent } from '../dropdown-menu/context'
import { useGoopCue } from '../../sound'
import { quietFocus } from '../dropdown-menu/quiet-focus'

/** shadcn's flat highlight, used when the goo blob is off. */
const FLAT_BG =
  'focus:bg-accent data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20'

const props = withDefaults(
  defineProps<
    ContextMenuItemProps & {
      class?: HTMLAttributes['class']
      inset?: boolean
      variant?: 'default' | 'destructive'
    }
  >(),
  {
    variant: 'default',
  },
)
const emits = defineEmits<ContextMenuItemEmits>()

const delegated = computed(() => {
  const { class: _class, inset: _inset, variant: _variant, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
const menu = injectGoopMenuContent()

const classes = computed(() =>
  cn(
    menu?.blob.value ? '' : FLAT_BG,
    'group/context-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none focus:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:text-destructive data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4 focus:*:[svg]:text-accent-foreground data-[variant=destructive]:*:[svg]:text-destructive',
    props.class,
  ),
)
// Runs after the consumer's @select (forwarded first), so their preventDefault is seen.
const onSelect = (event: Event) => menu?.select(event)
const cue = useGoopCue('menuItem')
</script>

<template>
  <ContextMenuItem
    data-slot="context-menu-item"
    :data-inset="inset ? '' : undefined"
    :data-variant="variant"
    v-bind="{ ...forwarded, ...cue }"
    :class="classes"
    @pointermove="quietFocus"
    @select="onSelect"
  >
    <slot />
  </ContextMenuItem>
</template>

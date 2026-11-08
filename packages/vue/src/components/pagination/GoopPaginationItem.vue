<script setup lang="ts">
// GoopPaginationItem: shadcn-vue's PaginationItem (reka-ui PaginationListItem, `value`,
// `isActive`, `size`, `class` merge, `asChild`). Inside a GoopPaginationContent with the goo
// blob on, the current page's outline look is painted by the blob behind it; the item keeps
// only its text. The blob follows `isActive` when you pass it, else reka's current page.
import { cn } from 'cn'
import type { PaginationListItemProps } from 'reka-ui'
import { PaginationListItem, injectPaginationRootContext } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import type { ButtonSize } from '../button/variants'
import { useGoopCue } from '../../sound'
import { injectGoopPaginationContent } from './context'
import { paginationItemClass } from './variants'

const props = withDefaults(
  defineProps<PaginationListItemProps & { size?: ButtonSize; class?: HTMLAttributes['class']; isActive?: boolean }>(),
  { size: 'icon', isActive: undefined, asChild: undefined },
)

const delegated = computed(() => {
  const { class: _class, size: _size, isActive: _active, ...rest } = props
  return rest
})
const root = injectPaginationRootContext(null)
const content = injectGoopPaginationContent()
const blob = computed(() => content?.blob.value ?? false)
const current = computed(() => props.isActive ?? root?.page.value === props.value)
// shadcn styles from `isActive` only; the goo falls back to reka's page so the blob still shows.
const classes = computed(() =>
  cn(paginationItemClass(blob.value ? current.value : props.isActive === true, props.size, blob.value), props.class),
)
const cue = useGoopCue('paginationItem')
</script>

<template>
  <PaginationListItem
    data-slot="pagination-item"
    :data-active="isActive === undefined ? undefined : isActive ? '' : 'false'"
    v-bind="{ ...delegated, ...cue }"
    :class="classes"
  >
    <slot />
  </PaginationListItem>
</template>

<script setup lang="ts">
// GoopPaginationEllipsis: shadcn-vue's PaginationEllipsis (reka-ui, `class` merge, `asChild`).
// No goo.
import type { PaginationEllipsisProps } from 'reka-ui'
import { PaginationEllipsis } from 'reka-ui'
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<PaginationEllipsisProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <PaginationEllipsis
    data-slot="pagination-ellipsis"
    v-bind="delegated"
    :class="cn('size-8 [&_svg:not([class*=size-])]:size-4 flex items-center justify-center', props.class)"
  >
    <slot>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
      </svg>
      <span class="sr-only">More pages</span>
    </slot>
  </PaginationEllipsis>
</template>

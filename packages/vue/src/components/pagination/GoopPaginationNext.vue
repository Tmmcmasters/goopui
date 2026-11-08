<script setup lang="ts">
// GoopPaginationNext: shadcn-vue's PaginationNext (reka-ui PaginationNext, `size`, `class` merge,
// `asChild`) rendered as a ghost GoopButton, so it press-squishes and gets the ghost hover
// goo. Engine props (goo, press, speed, preset, renderer) inherit GoopPagination's.
// `asChild` renders your own child with shadcn's classes and no GoopButton.
import type { PaginationNextProps } from 'reka-ui'
import { PaginationNext } from 'reka-ui'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { GoopPaginationButtonProps } from '../../goop-props'
import GoopButton from '../button/GoopButton.vue'
import { buttonVariants, type ButtonSize } from '../button/variants'
import { CHEVRON_PATHS, usePaginationButton } from './button'

const props = withDefaults(
  defineProps<PaginationNextProps & GoopPaginationButtonProps & { size?: ButtonSize; class?: HTMLAttributes['class'] }>(),
  { size: 'default', goo: undefined, press: undefined, speed: undefined, preset: undefined, renderer: undefined, asChild: undefined },
)
const button = usePaginationButton(props)
</script>

<template>
  <PaginationNext
    v-if="asChild"
    data-slot="pagination-next"
    as-child
    :class="cn(buttonVariants({ variant: 'ghost', size }), 'pr-1.5!', props.class)"
  >
    <slot />
  </PaginationNext>
  <PaginationNext v-else data-slot="pagination-next" as-child>
    <GoopButton variant="ghost" :size="size" :as="as" :class="cn('pr-1.5!', props.class)" v-bind="button">
      <slot>
        <span class="hidden sm:block">Next</span>
        <svg data-icon="inline-end" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="cn-rtl-flip"><path v-for="d in CHEVRON_PATHS.next" :key="d" :d="d" /></svg>
      </slot>
    </GoopButton>
  </PaginationNext>
</template>

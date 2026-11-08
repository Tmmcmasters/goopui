<script setup lang="ts">
// GoopPaginationPrevious: shadcn-vue's PaginationPrevious (reka-ui PaginationPrev, `size`, `class` merge,
// `asChild`) rendered as a ghost GoopButton, so it press-squishes and gets the ghost hover
// goo. Engine props (goo, press, speed, preset, renderer) inherit GoopPagination's.
// `asChild` renders your own child with shadcn's classes and no GoopButton.
import type { PaginationPrevProps } from 'reka-ui'
import { PaginationPrev } from 'reka-ui'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { GoopPaginationButtonProps } from '../../goop-props'
import GoopButton from '../button/GoopButton.vue'
import { buttonVariants, type ButtonSize } from '../button/variants'
import { CHEVRON_PATHS, usePaginationButton } from './button'

const props = withDefaults(
  defineProps<PaginationPrevProps & GoopPaginationButtonProps & { size?: ButtonSize; class?: HTMLAttributes['class'] }>(),
  { size: 'default', goo: undefined, press: undefined, speed: undefined, preset: undefined, renderer: undefined, asChild: undefined },
)
const button = usePaginationButton(props)
</script>

<template>
  <PaginationPrev
    v-if="asChild"
    data-slot="pagination-previous"
    as-child
    :class="cn(buttonVariants({ variant: 'ghost', size }), 'pl-1.5!', props.class)"
  >
    <slot />
  </PaginationPrev>
  <PaginationPrev v-else data-slot="pagination-previous" as-child>
    <GoopButton variant="ghost" :size="size" :as="as" :class="cn('pl-1.5!', props.class)" v-bind="button">
      <slot>
        <svg data-icon="inline-start" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="cn-rtl-flip"><path v-for="d in CHEVRON_PATHS.previous" :key="d" :d="d" /></svg>
        <span class="hidden sm:block">Previous</span>
      </slot>
    </GoopButton>
  </PaginationPrev>
</template>

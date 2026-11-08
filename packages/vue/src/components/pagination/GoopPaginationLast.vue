<script setup lang="ts">
// GoopPaginationLast: shadcn-vue's PaginationLast (reka-ui PaginationLast, `size`, `class` merge,
// `asChild`) rendered as a ghost GoopButton, so it press-squishes and gets the ghost hover
// goo. Engine props (goo, press, speed, preset, renderer) inherit GoopPagination's.
// `asChild` renders your own child with shadcn's classes and no GoopButton.
import type { PaginationLastProps } from 'reka-ui'
import { PaginationLast } from 'reka-ui'
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import type { GoopPaginationButtonProps } from '../../goop-props'
import GoopButton from '../button/GoopButton.vue'
import { buttonVariants, type ButtonSize } from '../button/variants'
import { CHEVRON_PATHS, usePaginationButton } from './button'

const props = withDefaults(
  defineProps<PaginationLastProps & GoopPaginationButtonProps & { size?: ButtonSize; class?: HTMLAttributes['class'] }>(),
  { size: 'default', goo: undefined, press: undefined, speed: undefined, preset: undefined, renderer: undefined, asChild: undefined },
)
const button = usePaginationButton(props)
</script>

<template>
  <PaginationLast
    v-if="asChild"
    data-slot="pagination-last"
    as-child
    :class="cn(buttonVariants({ variant: 'ghost', size }), '', props.class)"
  >
    <slot />
  </PaginationLast>
  <PaginationLast v-else data-slot="pagination-last" as-child>
    <GoopButton variant="ghost" :size="size" :as="as" :class="cn('', props.class)" v-bind="button">
      <slot>
        <span class="hidden sm:block">Last</span>
        <svg data-icon="inline-end" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path v-for="d in CHEVRON_PATHS.last" :key="d" :d="d" /></svg>
      </slot>
    </GoopButton>
  </PaginationLast>
</template>

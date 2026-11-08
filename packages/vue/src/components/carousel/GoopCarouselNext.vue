<script setup lang="ts">
// GoopCarouselNext: shadcn-vue's CarouselNext (an outline `icon-sm` round button, `variant` /
// `size`, `class` merge, `asChild`), rendered as a GoopButton so it squishes on press. The
// carousel's `squish` (or `goo`) off makes it a plain shadcn button. Other GoopButton props
// pass through as attrs. Under reduced motion the slides jump instead of gliding.
import { cn } from 'cn'
import { GoopButton, type ButtonSize, type ButtonVariant } from '../button'
import type { WithAsChildProps, WithClassAsProps } from './interface'
import { useCarousel } from './useCarousel'

const props = withDefaults(defineProps<{ variant?: ButtonVariant; size?: ButtonSize } & WithClassAsProps & WithAsChildProps>(), {
  variant: 'outline',
  size: 'icon-sm',
  as: 'button',
  asChild: false,
})
const { orientation, canScrollNext, scrollNext, goo } = useCarousel()
</script>

<template>
  <GoopButton
    data-slot="carousel-next"
    :disabled="!canScrollNext"
    v-bind="goo.button"
    :as="as"
    :as-child="asChild"
    :class="cn('rounded-full absolute touch-manipulation', orientation === 'horizontal' ? 'inset-y-0 -right-12 my-auto' : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90', props.class)"
    :variant="variant"
    :size="size"
    @click="scrollNext"
  >
    <slot>
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="cn-rtl-flip"><path d="m9 18 6-6-6-6" /></svg>
      <span class="sr-only">Next slide</span>
    </slot>
  </GoopButton>
</template>

<script setup lang="ts">
// GoopCarouselItem: shadcn-vue's CarouselItem (a `role="group"` slide; `class` merge, reka's
// `as` / `asChild`). The goo stretches and redraws the slide's surface: mark it
// `data-goop-surface`, or core uses the first descendant that paints a background (e.g. a Card).
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import type { WithAsChildProps, WithClassAsProps } from './interface'
import { useCarousel } from './useCarousel'

const props = withDefaults(defineProps<WithClassAsProps & WithAsChildProps>(), { as: 'div', asChild: false })
const { orientation } = useCarousel()
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    data-slot="carousel-item"
    role="group"
    aria-roledescription="slide"
    :class="cn('min-w-0 shrink-0 grow-0 basis-full', orientation === 'horizontal' ? 'pl-4' : 'pt-4', props.class)"
  >
    <slot />
  </Primitive>
</template>

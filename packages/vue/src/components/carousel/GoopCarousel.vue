<script setup lang="ts">
// GoopCarousel: shadcn-vue's Carousel (embla-carousel-vue; `opts`, `plugins`, `orientation`,
// `@init-api` / `setApi`, arrow keys, `class` merge, plus reka's `as` / `asChild`) whose slides
// feel like jelly, driven by embla's real motion (core `attachCarousel`):
//  - `stretch`: slides stretch a little along the motion with momentum and wobble on the snap;
//  - `slosh`: their leading / trailing edges slosh in low, wide mounds in the slide's colour;
//  - `rubberBand`: dragging past the first / last slide, its outer edge reaches back as one
//    low, wide mound (never past the carousel's edge).
// Previous / Next squish like GoopButton (`squish`); GoopCarouselDots' active blob flows
// between dots (`dots`). `:goo="false"` is plain shadcn. Slide groups get "N of M" labels.
// Reduced motion: plain embla (no stretch, slosh or band), and prev / next / dots jump.
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import type { CarouselEmits, CarouselProps, WithAsChildProps, WithClassAsProps } from './interface'
import { useProvideCarousel } from './useCarousel'

const props = withDefaults(defineProps<CarouselProps & WithClassAsProps & WithAsChildProps>(), {
  orientation: 'horizontal',
  goo: undefined,
  stretch: undefined,
  slosh: undefined,
  rubberBand: undefined,
  squish: undefined,
  dots: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  as: 'div',
  asChild: false,
})
const emits = defineEmits<CarouselEmits>()

const { canScrollNext, canScrollPrev, carouselApi, carouselRef, orientation, scrollNext, scrollPrev, scrollTo, selectedIndex } =
  useProvideCarousel(props, emits)

defineExpose({ canScrollNext, canScrollPrev, carouselApi, carouselRef, orientation, scrollNext, scrollPrev, scrollTo, selectedIndex })

function onKeyDown(event: KeyboardEvent) {
  const prevKey = props.orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const nextKey = props.orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
  if (event.key === prevKey) {
    event.preventDefault()
    scrollPrev()
    return
  }
  if (event.key === nextKey) {
    event.preventDefault()
    scrollNext()
  }
}
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    data-slot="carousel"
    :data-orientation="orientation"
    :class="cn('relative', props.class)"
    role="region"
    aria-roledescription="carousel"
    tabindex="0"
    @keydown="onKeyDown"
  >
    <slot
      :can-scroll-next="canScrollNext"
      :can-scroll-prev="canScrollPrev"
      :carousel-api="carouselApi"
      :carousel-ref="carouselRef"
      :orientation="orientation"
      :scroll-next="scrollNext"
      :scroll-prev="scrollPrev"
    />
  </Primitive>
</template>

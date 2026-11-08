<script setup lang="ts">
// GoopCarouselContent: shadcn-vue's CarouselContent. The outer element is embla's viewport
// (it clips, so the slosh never reaches the page's scroll size); attrs and `class` go on the
// inner flex track.
import { cn } from 'cn'
import type { WithClassAsProps } from './interface'
import { useCarousel } from './useCarousel'

defineOptions({ inheritAttrs: false })
const props = defineProps<WithClassAsProps>()
const { carouselRef, orientation } = useCarousel()
</script>

<template>
  <div ref="carouselRef" data-slot="carousel-content" class="overflow-hidden">
    <div :class="cn('flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', props.class)" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>

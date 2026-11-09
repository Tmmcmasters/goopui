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
// A function ref (not ref="carouselRef"): vue-tsc counts it as a use, so apps with
// noUnusedLocals (the shadcn-vue registry install) type-check.
const setViewport = (el: unknown) => {
  carouselRef.value = (el as HTMLElement | null) ?? undefined
}
</script>

<template>
  <div :ref="setViewport" data-slot="carousel-content" class="overflow-hidden">
    <div :class="cn('flex', orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col', props.class)" v-bind="$attrs">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// Live carousel demos for the Carousel docs page: real <GoopCarousel>. `set` picks the group.
// Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'sizes' | 'vertical' | 'plain' }>(), { set: 'basic' })
// Customize choices from the page's playground (empty outside it).
const pg = usePlayground()
const variants = [{ preset: 'wild' }, { stretch: false, slosh: false }, { goo: false }] as const
// On /react/docs: the same sets, as real @goopui/react carousels (react-demos/carousel.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="carousel" :set="set" :pg="{ main: pg.props }" />
  <div v-else-if="set === 'basic'" class="flex w-full justify-center px-12">
    <GoopCarousel class="w-full max-w-56 sm:max-w-xs" v-bind="pg.props">
      <GoopCarouselContent>
        <GoopCarouselItem v-for="i in 5" :key="i">
          <div class="p-1">
            <GoopCard class="aspect-square items-center justify-center">
              <span class="text-4xl font-semibold">{{ i }}</span>
            </GoopCard>
          </div>
        </GoopCarouselItem>
      </GoopCarouselContent>
      <GoopCarouselPrevious />
      <GoopCarouselNext />
      <GoopCarouselDots class="mt-4" />
    </GoopCarousel>
  </div>

  <div v-else-if="set === 'sizes'" class="flex w-full justify-center px-12">
    <GoopCarousel class="w-full max-w-56 sm:max-w-sm" :opts="{ align: 'start' }">
      <GoopCarouselContent>
        <GoopCarouselItem v-for="i in 8" :key="i" class="basis-1/2 lg:basis-1/3">
          <div class="p-1">
            <GoopCard class="aspect-square items-center justify-center">
              <span class="text-2xl font-semibold">{{ i }}</span>
            </GoopCard>
          </div>
        </GoopCarouselItem>
      </GoopCarouselContent>
      <GoopCarouselPrevious />
      <GoopCarouselNext />
    </GoopCarousel>
  </div>

  <div v-else-if="set === 'vertical'" class="flex w-full justify-center py-12">
    <GoopCarousel orientation="vertical" class="w-full max-w-40" :opts="{ align: 'start' }">
      <GoopCarouselContent class="-mt-1 h-[200px]">
        <GoopCarouselItem v-for="i in 5" :key="i" class="basis-1/2 pt-1">
          <div class="p-1">
            <GoopCard class="h-20 items-center justify-center py-0">
              <span class="text-2xl font-semibold">{{ i }}</span>
            </GoopCard>
          </div>
        </GoopCarouselItem>
      </GoopCarouselContent>
      <GoopCarouselPrevious />
      <GoopCarouselNext />
    </GoopCarousel>
  </div>

  <div v-else class="grid w-full justify-items-center gap-8 px-12">
    <GoopCarousel v-for="(v, n) in variants" :key="n" class="w-full max-w-48" v-bind="v">
      <GoopCarouselContent>
        <GoopCarouselItem v-for="i in 4" :key="i">
          <div class="p-1">
            <GoopCard class="aspect-[4/3] items-center justify-center">
              <span class="text-2xl font-semibold">{{ i }}</span>
            </GoopCard>
          </div>
        </GoopCarouselItem>
      </GoopCarouselContent>
      <GoopCarouselPrevious />
      <GoopCarouselNext />
    </GoopCarousel>
  </div>
</template>

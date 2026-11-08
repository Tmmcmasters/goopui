<script setup lang="ts">
import type { GoopPreset, GoopRendererName } from '@goopui/core'

/** GoopCarousel props from the panel, applied to every goop carousel on the page. */
const goo = ref(true)
const stretch = ref(true)
const slosh = ref(true)
const rubberBand = ref(true)
const squish = ref(true)
const dots = ref(true)
const speed = ref(1)
const preset = ref<GoopPreset | ''>('')
const renderer = ref<GoopRendererName | ''>('')
const engine = computed(() => ({
  goo: goo.value,
  stretch: stretch.value,
  slosh: slosh.value,
  rubberBand: rubberBand.value,
  squish: squish.value,
  dots: dots.value,
  speed: speed.value,
  preset: preset.value || undefined,
  renderer: renderer.value || undefined,
}))
const toggles = { goo, stretch, slosh, rubberBand, squish, dots }

const slides = 5
const card = 'flex aspect-square items-center justify-center rounded-xl border bg-card p-6 text-card-foreground shadow-sm'
const selectClass = 'h-7 rounded-md border bg-background px-1.5 text-xs'
</script>

<template>
  <ComparePage path="/carousel">
    <template #controls>
      <section class="mb-6 flex flex-wrap items-end gap-4 rounded-xl border p-4 text-sm" aria-label="Carousel props">
        <label v-for="(r, name) in toggles" :key="name" class="flex items-center gap-2 pb-1">
          <input v-model="r.value" type="checkbox">
          <span class="text-xs text-muted-foreground">{{ name }}</span>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">speed: {{ speed.toFixed(2) }}x</span>
          <input v-model.number="speed" type="range" min="0.1" max="2" step="0.05" class="w-28">
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">preset</span>
          <select v-model="preset" :class="selectClass">
            <option value="">auto (playful)</option>
            <option value="subtle">subtle</option>
            <option value="playful">playful</option>
            <option value="wild">wild</option>
          </select>
        </label>
        <label class="grid gap-1">
          <span class="text-xs text-muted-foreground">renderer (dots)</span>
          <select v-model="renderer" :class="selectClass">
            <option value="">auto (svg)</option>
            <option value="svg">svg</option>
            <option value="canvas">canvas</option>
          </select>
        </label>
      </section>
    </template>

    <CompareRow label="default" note="drag, fling, drag past either end, or Previous / Next">
      <template #shadcn>
        <div class="mx-auto w-full max-w-48 sm:max-w-xs">
          <Carousel class="mx-12">
            <CarouselContent>
              <CarouselItem v-for="i in slides" :key="i">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-4xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </template>
      <template #goop>
        <div class="mx-auto w-full max-w-48 sm:max-w-xs">
          <GoopCarousel class="mx-12" v-bind="engine" data-testid="goop-default">
            <GoopCarouselContent>
              <GoopCarouselItem v-for="i in slides" :key="i">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-4xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </GoopCarouselItem>
            </GoopCarouselContent>
            <GoopCarouselPrevious />
            <GoopCarouselNext />
          </GoopCarousel>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="dots" note="goopUI addition: the active dot is one goo blob">
      <template #shadcn>
        <span class="text-sm text-muted-foreground">None (shadcn has no dots)</span>
      </template>
      <template #goop>
        <div class="mx-auto w-full max-w-48 sm:max-w-xs">
          <GoopCarousel v-bind="engine" data-testid="goop-dots">
            <GoopCarouselContent>
              <GoopCarouselItem v-for="i in slides" :key="i">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-4xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </GoopCarouselItem>
            </GoopCarouselContent>
            <GoopCarouselDots class="mt-4" />
          </GoopCarousel>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="sizes" note="basis-1/2 md:basis-1/3, align start">
      <template #shadcn>
        <div class="mx-auto w-full max-w-48 sm:max-w-sm">
          <Carousel class="mx-12" :opts="{ align: 'start' }">
            <CarouselContent>
              <CarouselItem v-for="i in 8" :key="i" class="basis-1/2 md:basis-1/3">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-2xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </template>
      <template #goop>
        <div class="mx-auto w-full max-w-48 sm:max-w-sm">
          <GoopCarousel class="mx-12" :opts="{ align: 'start' }" v-bind="engine">
            <GoopCarouselContent>
              <GoopCarouselItem v-for="i in 8" :key="i" class="basis-1/2 md:basis-1/3">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-2xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </GoopCarouselItem>
            </GoopCarouselContent>
            <GoopCarouselPrevious />
            <GoopCarouselNext />
          </GoopCarousel>
        </div>
      </template>
    </CompareRow>

    <CompareRow label="vertical" note="orientation vertical, align start">
      <template #shadcn>
        <Carousel orientation="vertical" class="mx-auto my-12 w-full max-w-40" :opts="{ align: 'start' }">
          <CarouselContent class="-mt-1 h-[200px]">
            <CarouselItem v-for="i in slides" :key="i" class="basis-1/2 pt-1">
              <div class="p-1">
                <div :class="card" class="aspect-auto h-20 p-2">
                  <span class="text-2xl font-semibold">{{ i }}</span>
                </div>
              </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </template>
      <template #goop>
        <GoopCarousel orientation="vertical" class="mx-auto my-12 w-full max-w-40" :opts="{ align: 'start' }" v-bind="engine">
          <GoopCarouselContent class="-mt-1 h-[200px]">
            <GoopCarouselItem v-for="i in slides" :key="i" class="basis-1/2 pt-1">
              <div class="p-1">
                <div :class="card" class="aspect-auto h-20 p-2">
                  <span class="text-2xl font-semibold">{{ i }}</span>
                </div>
              </div>
            </GoopCarouselItem>
          </GoopCarouselContent>
          <GoopCarouselPrevious />
          <GoopCarouselNext />
        </GoopCarousel>
      </template>
    </CompareRow>

    <CompareRow label="loop" note="opts.loop: no ends, so no rubber band">
      <template #shadcn>
        <div class="mx-auto w-full max-w-48 sm:max-w-xs">
          <Carousel class="mx-12" :opts="{ loop: true }">
            <CarouselContent>
              <CarouselItem v-for="i in slides" :key="i" class="basis-4/5">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-4xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </template>
      <template #goop>
        <div class="mx-auto w-full max-w-48 sm:max-w-xs">
          <GoopCarousel class="mx-12" :opts="{ loop: true }" v-bind="engine">
            <GoopCarouselContent>
              <GoopCarouselItem v-for="i in slides" :key="i" class="basis-4/5">
                <div class="p-1">
                  <div :class="card">
                    <span class="text-4xl font-semibold">{{ i }}</span>
                  </div>
                </div>
              </GoopCarouselItem>
            </GoopCarouselContent>
            <GoopCarouselPrevious />
            <GoopCarouselNext />
          </GoopCarousel>
        </div>
      </template>
    </CompareRow>
  </ComparePage>
</template>

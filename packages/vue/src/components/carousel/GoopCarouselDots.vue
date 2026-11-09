<script setup lang="ts">
// GoopCarouselDots (a goopUI addition; shadcn has no dots): one button per snap, the active
// one `aria-current` and `data-state="active"`. With the carousel's `dots` on, the active
// fill is ONE goo blob (core `attachCarouselDots`, the Tabs indicator engine) that flows from
// dot to dot with momentum and lands with a jelly overshoot; off, flat dots. Place it inside
// GoopCarousel. `class` merges onto the list. Reduced motion: the blob snaps and the slides jump.
// Browser-only: SSR renders flat dots, and goop.css keeps the active dot filled until the blob
// attaches.
import { attachCarouselDots, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import { onBeforeUnmount, shallowRef, watch } from 'vue'
import type { WithClassAsProps } from './interface'
import { useCarousel } from './useCarousel'

const props = defineProps<WithClassAsProps>()
const { snapCount, selectedIndex, scrollTo, goo, orientation } = useCarousel()

const list = shallowRef<HTMLElement | null>(null)
const handle = shallowRef<MenuHighlightHandle | null>(null)
const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const sync = () => {
  const el = list.value
  const opts = goo.value.dots
  if (!el || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachCarouselDots(el, opts)
}
watch(
  list,
  () => {
    detach()
    sync()
  },
  { flush: 'post' },
)
watch(() => goo.value.dots, sync, { flush: 'post' })
watch([snapCount, selectedIndex], () => handle.value?.refresh(), { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live dots blob handle (null before mount / when the blob is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <div
    ref="list"
    data-slot="carousel-dots"
    :data-goop-carousel-dots="goo.dots ? '' : undefined"
    :data-orientation="orientation"
    :class="cn('flex items-center justify-center gap-4', orientation === 'vertical' && 'flex-col', props.class)"
  >
    <button
      v-for="i in snapCount"
      :key="i"
      type="button"
      data-goop-carousel-dot
      :data-state="selectedIndex === i - 1 ? 'active' : 'inactive'"
      :aria-current="selectedIndex === i - 1 ? 'true' : undefined"
      :aria-label="`Go to slide ${i}`"
      class="relative size-2.5 rounded-full bg-primary/20 outline-none transition-colors after:absolute after:-inset-2 after:content-[''] hover:bg-primary/35 focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=active]:bg-primary"
      @click="scrollTo(i - 1)"
    />
  </div>
</template>

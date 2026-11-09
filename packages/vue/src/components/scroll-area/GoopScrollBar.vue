<script setup lang="ts">
// GoopScrollBar: shadcn-vue's ScrollBar (reka ScrollAreaScrollbar + Thumb, `orientation`
// vertical | horizontal, `class` merge, same classes). Inside a GoopScrollArea with the goo on,
// its thumb's colour sits on a goo body (one span) that the root's engine stretches and
// squashes; otherwise it is a plain shadcn thumb.
import { SCROLL_THUMB_ATTR } from '@goopui/core'
import { cn } from 'cn'
import { ScrollAreaScrollbar, ScrollAreaThumb, type ScrollAreaScrollbarProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { injectGoopScrollArea } from './context'
import { SCROLL_AREA_SCROLLBAR, SCROLL_AREA_THUMB, SCROLL_AREA_THUMB_BODY, SCROLL_AREA_THUMB_GOO } from './styles'

const props = withDefaults(defineProps<ScrollAreaScrollbarProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'vertical',
})
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const goo = injectGoopScrollArea()
const bodyAttrs = { [SCROLL_THUMB_ATTR]: '' }
</script>

<template>
  <ScrollAreaScrollbar
    data-slot="scroll-area-scrollbar"
    :data-orientation="orientation"
    v-bind="delegated"
    :class="cn(SCROLL_AREA_SCROLLBAR, props.class)"
  >
    <ScrollAreaThumb data-slot="scroll-area-thumb" :class="goo ? SCROLL_AREA_THUMB_GOO : SCROLL_AREA_THUMB">
      <span v-if="goo" data-slot="scroll-area-thumb-body" aria-hidden="true" v-bind="bodyAttrs" :class="SCROLL_AREA_THUMB_BODY" />
    </ScrollAreaThumb>
  </ScrollAreaScrollbar>
</template>

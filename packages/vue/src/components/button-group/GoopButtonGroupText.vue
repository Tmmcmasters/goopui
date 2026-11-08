<script setup lang="ts">
// GoopButtonGroupText: shadcn-vue's ButtonGroupText (reka Primitive, `as` default 'div',
// `asChild`, `orientation`, `class` merge). Plain; it flexes with the group's tug.
import { cn } from 'cn'
import { Primitive, type PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { BUTTON_GROUP_TEXT, type ButtonGroupVariants } from './variants'

const props = withDefaults(
  defineProps<PrimitiveProps & { class?: HTMLAttributes['class']; orientation?: ButtonGroupVariants['orientation'] }>(),
  { as: 'div' },
)
</script>

<template>
  <Primitive role="group" :data-orientation="props.orientation" :as="as" :as-child="asChild" :class="cn(BUTTON_GROUP_TEXT, props.class)">
    <slot />
  </Primitive>
</template>

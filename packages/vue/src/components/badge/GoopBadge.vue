<script setup lang="ts">
// GoopBadge: shadcn's Badge (same cva variants, `class` merge, `as` / `asChild` via
// reka's Primitive). An interactive badge (a link or button) swells ~1px on hover with a
// soft gooey overshoot; a plain badge stays static. CSS only. `:swell="false"` turns it off.
import { badgeStyle, badgeSwellOn } from '@goopui/core'
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopBadgeProps, toBadgeOptions } from '../../goop-props'
import { badgeVariants, goopBadgeFill, goopBadgeSwell, type BadgeVariants } from './variants'

const props = defineProps({
  ...goopBadgeProps,
  variant: { type: String as PropType<BadgeVariants['variant']>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Element or component to render (reka-ui Primitive). */
  as: { type: [String, Object] as PropType<string | object>, default: 'span' },
  /** Render the single child instead, merging classes and attrs onto it (reka-ui Primitive). */
  asChild: { type: Boolean, default: false },
})

const config = useGoopConfig()
const options = computed(() => toBadgeOptions(props, config))
const on = computed(() => badgeSwellOn(options.value))
const style = computed(() => badgeStyle(options.value))
const classes = computed(() =>
  cn(
    badgeVariants({ variant: props.variant }),
    on.value && goopBadgeFill[props.variant ?? 'default'],
    on.value && goopBadgeSwell,
    props.class,
  ),
)
</script>

<template>
  <Primitive
    data-slot="badge"
    :data-variant="variant ?? 'default'"
    :as="as"
    :as-child="asChild"
    :data-goop-swell="on ? '' : undefined"
    :data-goop-still="on && options.reducedMotion === true ? '' : undefined"
    :style="style"
    :class="classes"
  >
    <slot />
  </Primitive>
</template>

<script setup lang="ts">
// GoopAvatar: shadcn's Avatar (reka AvatarRoot, `size`, `class` merge, `as` / `asChild`). When
// the image loads (or the fallback appears) it plops in with a small gooey settle: a scale-in
// with a soft overshoot. CSS only (goop.css), once per appearance. Reduced motion: static.
// `:settle="false"` is shadcn's Avatar.
import { avatarSettleOn, avatarStyle } from '@goopui/core'
import { cn } from 'cn'
import { AvatarRoot } from 'reka-ui'
import { computed, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopAvatarProps, toAvatarOptions } from '../../goop-props'
import { AVATAR, goopAvatarSettle, type AvatarSize } from './styles'

const props = defineProps({
  ...goopAvatarProps,
  /** shadcn's size: `default` (32px), `sm` (24px) or `lg` (40px). */
  size: { type: String as PropType<AvatarSize>, default: 'default' },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
})

const config = useGoopConfig()
const options = computed(() => toAvatarOptions(props, config))
const on = computed(() => avatarSettleOn(options.value))
const style = computed(() => avatarStyle(options.value))
const forwarded = computed(() => (props.as === undefined ? { asChild: props.asChild } : { as: props.as, asChild: props.asChild }))
</script>

<template>
  <AvatarRoot
    data-slot="avatar"
    :data-size="size"
    v-bind="forwarded"
    :data-goop-settle="on ? '' : undefined"
    :data-goop-still="on && options.reducedMotion === true ? '' : undefined"
    :style="style"
    :class="cn(AVATAR, on && goopAvatarSettle, props.class)"
  >
    <slot />
  </AvatarRoot>
</template>

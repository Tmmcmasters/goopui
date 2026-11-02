<script setup lang="ts">
// GoopAvatarFallback: shadcn-vue's AvatarFallback (reka AvatarFallback: shown until the image
// loads, after `delayMs`; the parent GoopAvatar's settle plays when it appears).
import { cn } from 'cn'
import type { AvatarFallbackProps } from 'reka-ui'
import { AvatarFallback } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { AVATAR_FALLBACK } from './styles'

const props = defineProps<AvatarFallbackProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <AvatarFallback
    data-slot="avatar-fallback"
    v-bind="delegated"
    :class="cn(AVATAR_FALLBACK, props.class)"
  >
    <slot />
  </AvatarFallback>
</template>

<script setup lang="ts">
// GoopAvatarImage: shadcn-vue's AvatarImage (reka AvatarImage; it renders once the image has
// loaded, and that is when the parent GoopAvatar's settle plays).
import { cn } from 'cn'
import type { AvatarImageProps } from 'reka-ui'
import { AvatarImage, useForwardPropsEmits, type AvatarImageEmits } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { AVATAR_IMAGE, goopAvatarImageRound } from './styles'

const props = defineProps<AvatarImageProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<AvatarImageEmits>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)
</script>

<template>
  <AvatarImage
    data-slot="avatar-image"
    v-bind="forwarded"
    :class="cn(AVATAR_IMAGE, goopAvatarImageRound, props.class)"
  >
    <slot />
  </AvatarImage>
</template>

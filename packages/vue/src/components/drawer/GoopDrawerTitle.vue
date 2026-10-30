<script setup lang="ts">
// GoopDrawerTitle: shadcn-vue's DrawerTitle.
import type { DrawerTitleProps } from 'vaul-vue'
import { cn } from 'cn'
import { DrawerTitle } from 'vaul-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DrawerTitleProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DrawerTitle
    data-slot="drawer-title"
    v-bind="delegated"
    :class="cn('text-foreground font-semibold', props.class)"
  >
    <slot />
  </DrawerTitle>
</template>

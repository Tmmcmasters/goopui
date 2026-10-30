<script setup lang="ts">
// GoopDrawerDescription: shadcn-vue's DrawerDescription.
import type { DrawerDescriptionProps } from 'vaul-vue'
import { cn } from 'cn'
import { DrawerDescription } from 'vaul-vue'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<DrawerDescriptionProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DrawerDescription
    data-slot="drawer-description"
    v-bind="delegated"
    :class="cn('text-muted-foreground text-sm', props.class)"
  >
    <slot />
  </DrawerDescription>
</template>

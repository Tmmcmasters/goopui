<script setup lang="ts">
// GoopSheetTitle: shadcn-vue's SheetTitle (reka-ui DialogTitle).
import type { DialogTitleProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { DialogTitle } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<DialogTitleProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DialogTitle
    data-slot="sheet-title"
    :class="cn('text-foreground font-semibold', props.class)"
    v-bind="delegated"
  >
    <slot />
  </DialogTitle>
</template>

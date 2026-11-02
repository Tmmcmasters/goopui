<script setup lang="ts">
// GoopSheetDescription: shadcn-vue's SheetDescription (reka-ui DialogDescription).
import type { DialogDescriptionProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { cn } from 'cn'
import { DialogDescription } from 'reka-ui'
import { computed } from 'vue'

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <DialogDescription
    data-slot="sheet-description"
    :class="cn('text-muted-foreground text-sm', props.class)"
    v-bind="delegated"
  >
    <slot />
  </DialogDescription>
</template>

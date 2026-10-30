<script setup lang="ts">
// GoopDialogFooter: shadcn-vue's DialogFooter. `showCloseButton` adds an outline "Close"
// button (a GoopButton) that closes the dialog.
import { cn } from 'cn'
import { DialogClose } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import GoopButton from '../button/GoopButton.vue'
import { DIALOG_FOOTER } from './styles'

const props = withDefaults(
  defineProps<{
    class?: HTMLAttributes['class']
    /** Append an outline "Close" button. */
    showCloseButton?: boolean
  }>(),
  { showCloseButton: false },
)
</script>

<template>
  <div
    data-slot="dialog-footer"
    :class="cn(DIALOG_FOOTER, props.class)"
  >
    <slot />
    <DialogClose
      v-if="showCloseButton"
      as-child
    >
      <GoopButton variant="outline">
        Close
      </GoopButton>
    </DialogClose>
  </div>
</template>

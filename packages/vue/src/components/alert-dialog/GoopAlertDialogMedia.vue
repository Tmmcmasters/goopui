<script setup lang="ts">
// GoopAlertDialogMedia: shadcn's AlertDialogMedia, an icon tile beside (or above) the title.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ALERT_DIALOG_MEDIA } from '../dialog/styles'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <div
    data-slot="alert-dialog-media"
    :class="cn(ALERT_DIALOG_MEDIA, props.class)"
  >
    <slot />
  </div>
</template>

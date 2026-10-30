<script setup lang="ts">
// GoopAlertDialogCancel: shadcn-vue's AlertDialogCancel (closes the dialog and gets the initial
// focus), rendered as an outline GoopButton. `variant` / `size` / `goo` pass through.
import { cn } from 'cn'
import type { AlertDialogCancelProps } from 'reka-ui'
import { AlertDialogCancel } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import GoopButton from '../button/GoopButton.vue'
import type { ButtonSize, ButtonVariant } from '../button/variants'

const props = withDefaults(
  defineProps<
    AlertDialogCancelProps & {
      class?: HTMLAttributes['class']
      variant?: ButtonVariant
      size?: ButtonSize
      /** The button's goo (GoopButton `goo`). */
      goo?: boolean
    }
  >(),
  { variant: 'outline', size: undefined, goo: undefined },
)
const delegated = computed(() => {
  const { class: _c, variant: _v, size: _s, goo: _g, asChild: _a, as: _as, ...rest } = props
  return rest
})
</script>

<template>
  <AlertDialogCancel
    data-slot="alert-dialog-cancel"
    v-bind="delegated"
    as-child
  >
    <GoopButton
      :variant="variant"
      :size="size"
      :goo="goo"
      :class="cn('mt-2 sm:mt-0', props.class)"
    >
      <slot />
    </GoopButton>
  </AlertDialogCancel>
</template>

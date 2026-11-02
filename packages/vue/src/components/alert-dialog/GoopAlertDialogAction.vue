<script setup lang="ts">
// GoopAlertDialogAction: shadcn-vue's AlertDialogAction (closes the dialog), rendered as a
// GoopButton (default variant). `variant` / `size` / `goo` pass through to the button.
import type { AlertDialogActionProps } from 'reka-ui'
import { AlertDialogAction } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import GoopButton from '../button/GoopButton.vue'
import type { ButtonSize, ButtonVariant } from '../button/variants'

const props = withDefaults(
  defineProps<
    AlertDialogActionProps & {
      class?: HTMLAttributes['class']
      variant?: ButtonVariant
      size?: ButtonSize
      /** The button's goo (GoopButton `goo`). */
      goo?: boolean
    }
  >(),
  { variant: undefined, size: undefined, goo: undefined },
)
const delegated = computed(() => {
  const { class: _c, variant: _v, size: _s, goo: _g, asChild: _a, as: _as, ...rest } = props
  return rest
})
</script>

<template>
  <AlertDialogAction
    data-slot="alert-dialog-action"
    v-bind="delegated"
    as-child
  >
    <GoopButton
      :variant="variant"
      :size="size"
      :goo="goo"
      :class="props.class"
    >
      <slot />
    </GoopButton>
  </AlertDialogAction>
</template>

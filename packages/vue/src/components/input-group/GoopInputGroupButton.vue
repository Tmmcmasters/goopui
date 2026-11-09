<script setup lang="ts">
// GoopInputGroupButton: shadcn-vue's InputGroupButton, a GoopButton (variant ghost, size xs |
// sm | icon-xs | icon-sm, `type="button"`), so it has its own goo exactly like a GoopButton:
// a ghost body that fades in on hover and squishes on press. Every GoopButton prop passes
// through (`goo`, `variant`, the engine props...).
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import GoopButton from '../button/GoopButton.vue'
import type { ButtonVariant } from '../button/variants'
import { inputGroupButtonVariants, type InputGroupButtonSize } from './styles'

const props = withDefaults(
  defineProps<{ variant?: ButtonVariant; size?: InputGroupButtonSize; class?: HTMLAttributes['class'] }>(),
  { variant: 'ghost', size: 'xs' },
)
</script>

<template>
  <GoopButton type="button" :data-size="props.size" :variant="props.variant" :class="cn(inputGroupButtonVariants({ size: props.size }), props.class)">
    <slot />
  </GoopButton>
</template>

<script setup lang="ts">
// GoopInputGroupAddon: shadcn-vue's InputGroupAddon (a `role="group"` <div>, `align`
// inline-start | inline-end | block-start | block-end, `class` merge). Clicking it (not a button
// in it) focuses the group's input or textarea, so the goo ring flows from the click point.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { inputGroupAddonVariants, type InputGroupAddonAlign } from './styles'

const props = withDefaults(defineProps<{ align?: InputGroupAddonAlign; class?: HTMLAttributes['class'] }>(), {
  align: 'inline-start',
})

function onClick(e: MouseEvent) {
  const currentTarget = e.currentTarget as HTMLElement | null
  const target = e.target as HTMLElement | null
  if (target && target.closest('button')) return
  currentTarget?.parentElement?.querySelector<HTMLElement>('input, textarea')?.focus()
}
</script>

<template>
  <div
    role="group"
    data-slot="input-group-addon"
    :data-align="props.align"
    :class="cn(inputGroupAddonVariants({ align: props.align }), props.class)"
    @click="onClick"
  >
    <slot />
  </div>
</template>

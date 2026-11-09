<script setup lang="ts">
// GoopField: shadcn-vue's Field (a `role="group"` div, `orientation` vertical | horizontal |
// responsive, `class` merge, same classes). No goo of its own: the controls inside keep theirs
// (a GoopInput's focus ring, a GoopCheckbox's fill, ...). Engine props set here (goo, drip,
// reveal, speed, preset, renderer) are inherited by GoopFieldError, which drips in.
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { resolveFieldProps, type GoopFieldProps } from '../../goop-props'
import { provideGoopField } from './context'
import { fieldVariants, type FieldVariants } from './variants'

const props = withDefaults(defineProps<GoopFieldProps & { class?: HTMLAttributes['class']; orientation?: FieldVariants['orientation'] }>(), {
  orientation: 'vertical',
  goo: undefined,
  drip: undefined,
  reveal: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
provideGoopField(computed(() => resolveFieldProps(props)))
</script>

<template>
  <div role="group" data-slot="field" :data-orientation="orientation" :class="cn(fieldVariants({ orientation }), props.class)">
    <slot />
  </div>
</template>

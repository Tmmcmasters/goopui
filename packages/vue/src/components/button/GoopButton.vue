<script setup lang="ts">
// GoopButton: shadcn-vue's Button (same cva, `class` merge, `asChild` via reka's Primitive)
// with the goo engine attached on mount. Every engine option is a prop (see goop-props.ts).
//
// Layering: core puts an aria-hidden goo layer at z-index -1 inside the host. Once it is
// attached the host's own background goes transparent (inline style) and the goo body paints
// the variant's color via --goop-color. Before mount, during SSR, or with `:goo="false"`
// the button is a plain shadcn Button, so first paint and hydration match exactly.
import type { GoopHandle, GoopOptions } from '@goopui/core'
import { cn } from 'cn'
import { Primitive } from 'reka-ui'
import { computed, useId, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopProps, toGoopOptions, toGoopStyle } from '../../goop-props'
import { seedFrom, useGoop } from '../../use-goop'
import {
  buttonVariants,
  goopButtonGooVariants,
  goopButtonStyles,
  type ButtonSize,
  type ButtonVariant,
} from './variants'

const props = defineProps({
  ...goopProps,
  variant: { type: String as PropType<ButtonVariant>, default: undefined },
  size: { type: String as PropType<ButtonSize>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Element or component to render (reka-ui Primitive). */
  as: { type: [String, Object] as PropType<string | object>, default: 'button' },
  /** Render the single child instead, merging classes and attrs onto it (reka-ui Primitive). */
  asChild: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  /** Master switch. `false` renders a plain shadcn Button. Default: on, except `link`. */
  goo: { type: Boolean as PropType<boolean | undefined>, default: undefined },
})

// The Primitive component instance; its $el is the rendered host (the <button>, or the
// asChild child such as NuxtLink's <a>).
const primitive = useTemplateRef<{ $el: unknown }>('primitive')
const config = useGoopConfig()
const id = useId()

const variantKey = computed<ButtonVariant>(() => props.variant ?? 'default')
const gooStyle = computed(() => goopButtonStyles[variantKey.value])
const enabled = computed(() => props.goo ?? gooStyle.value !== 'none')

const options = computed<GoopOptions>(() =>
  toGoopOptions(props, {
    ...config,
    // Stable per instance (useId is SSR-safe), so resting drips differ between buttons
    // that share markup but never change across renders.
    seed: seedFrom(id),
    // The outline stroke's inner fill follows the body pose (--goop-x/y/skew/sx/sy).
    cssVars: gooStyle.value === 'stroke',
    disabled: props.disabled,
  }),
)

const { handle, active } = useGoop(
  () => primitive.value?.$el as Element | null | undefined,
  () => options.value,
  () => enabled.value,
)

// Variant/size changes swap --goop-* vars and the corner radius: have core re-read them.
watch([variantKey, () => props.size], () => handle.value?.update(), { flush: 'post' })

const classes = computed(() =>
  cn(
    buttonVariants({ variant: props.variant, size: props.size }),
    enabled.value && goopButtonGooVariants({ variant: props.variant }),
    props.class,
  ),
)

const style = computed(() => {
  const s: Record<string, string> = enabled.value ? toGoopStyle(props) : {}
  if (active.value) {
    s['background-color'] = 'transparent'
    if (gooStyle.value === 'stroke') s['border-color'] = 'transparent'
  }
  return s
})

defineExpose({
  /** The live engine handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The host element. */
  get el() {
    return (primitive.value?.$el as HTMLElement | undefined) ?? null
  },
  /** Re-read `--goop-*` CSS vars (e.g. after changing them on an ancestor). */
  refresh: () => handle.value?.update(),
  press: () => handle.value?.press(),
  release: () => handle.value?.release(),
  hover: (on: boolean, x?: number) => handle.value?.hover(on, x),
  drip: (x?: number) => handle.value?.drip(x),
  addGoop: (amount?: number, x?: number) => handle.value?.addGoop(amount, x),
  shockwave: (...args: Parameters<GoopHandle['shockwave']>) => handle.value?.shockwave(...args),
  splashThrough: (x: number, y: number, vx: number, vy: number) => handle.value?.splashThrough(x, y, vx, vy),
  feedPointer: (p: { clientX: number; clientY: number }) => handle.value?.feedPointer(p),
  inspect: () => handle.value?.inspect() ?? null,
})
</script>

<template>
  <Primitive
    ref="primitive"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :as="as"
    :as-child="asChild"
    :disabled="disabled || undefined"
    :class="classes"
    :style="style"
    :data-goop-host="enabled ? gooStyle : undefined"
    :data-goop-active="active ? '' : undefined"
  >
    <slot v-if="asChild" />
    <span
      v-else
      data-goop-label
      class="inline-flex items-center justify-center gap-[inherit]"
    ><slot /></span>
  </Primitive>
</template>

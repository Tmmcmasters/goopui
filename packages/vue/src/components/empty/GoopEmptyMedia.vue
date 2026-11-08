<script setup lang="ts">
// GoopEmptyMedia: shadcn-vue's EmptyMedia (data-slot="empty-icon", `variant` default | icon,
// `class` merge). The media sits in a low, wide goo puddle of the muted tone whose middle
// rises to meet it, breathing very slowly (~1px) (core `attachEmptyPuddle`: one aria-hidden
// svg, a CSS animation, no frame loop). Ink overflow only: no layout shift, no scroll growth.
// Engine props inherit GoopEmpty's; set here they win. Before mount, during SSR, or with
// `:goo="false"` it is a plain shadcn EmptyMedia. Reduced motion: a static puddle.
import { attachEmptyPuddle, type EmptyPuddleHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { resolveEmptyProps, toEmptyOptions, type GoopEmptyProps } from '../../goop-props'
import { injectGoopEmpty } from './context'
import { emptyMediaVariants, type EmptyMediaVariants } from './variants'

const props = withDefaults(defineProps<GoopEmptyProps & { class?: HTMLAttributes['class']; variant?: EmptyMediaVariants['variant'] }>(), {
  variant: 'default',
  goo: undefined,
  puddle: undefined,
  breathe: undefined,
  speed: undefined,
  preset: undefined,
})

const root = injectGoopEmpty()
const config = useGoopConfig()
const options = computed(() => toEmptyOptions(resolveEmptyProps(props, root?.value), config))
const el = useTemplateRef<HTMLElement>('el')
const handle = shallowRef<EmptyPuddleHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !el.value) return
  handle.value = attachEmptyPuddle(el.value, opts)
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
onMounted(() => {
  mounted = true
  attach()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(options, (next) => {
  if (!next) detach()
  else if (handle.value) handle.value.update(next)
  else attach()
})
// The puddle's tone follows the variant's background.
watch(() => props.variant, () => handle.value?.refresh(), { flush: 'post' })

defineExpose({
  /** The live puddle handle (null before mount / when off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <div ref="el" data-slot="empty-icon" :data-variant="variant" :class="cn(emptyMediaVariants({ variant }), props.class)">
    <slot />
  </div>
</template>

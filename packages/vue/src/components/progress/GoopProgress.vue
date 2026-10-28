<script setup lang="ts">
// GoopProgress: shadcn-vue's Progress (reka ProgressRoot / ProgressIndicator, v-model,
// `max`, `class` merge, same classes) that fills like liquid. On mount core's
// `attachProgress` adds one aria-hidden goo layer to the root: a liquid fill with a rounded,
// wobbling goo front, a sloshing surface and the odd drip. `modelValue: null` is
// indeterminate: a goo slug runs along the bar with GoopSpinner's surge. The real indicator
// stays (see-through) and reka keeps role="progressbar" and the aria values. Before mount,
// during SSR, or with `:goo="false"` it is a plain shadcn Progress.
import { attachProgress, type ProgressHandle } from '@goopui/core'
import { cn } from 'cn'
import { ProgressIndicator, ProgressRoot } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopProgressProps, toProgressOptions } from '../../goop-props'
import { progressIndicatorClass, progressRootClass } from './variants'

type ValueText = (value: number | null | undefined, max: number) => string | undefined

const props = defineProps({
  ...goopProgressProps,
  /** The value (v-model). `null` = indeterminate. Default 0, like shadcn. */
  modelValue: { type: Number as PropType<number | null>, default: 0 },
  max: { type: Number, default: undefined },
  getValueLabel: { type: Function as PropType<ValueText>, default: undefined },
  getValueText: { type: Function as PropType<ValueText>, default: undefined },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Progress. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null | undefined]
  'update:max': [value: number]
}>()

const forwarded = computed(() => {
  const out: Record<string, unknown> = { modelValue: props.modelValue, asChild: props.asChild }
  for (const k of ['max', 'getValueLabel', 'getValueText', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({ ...toProgressOptions(props, config), value: props.modelValue, max: props.max ?? 100 }))
const handle = shallowRef<ProgressHandle | null>(null)
const active = computed(() => handle.value !== null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachProgress(el as HTMLElement, options.value)
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
watch(() => props.goo, (on) => (on ? attach() : detach()), { flush: 'post' })
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

const indicatorStyle = computed(() => ({
  transform: `translateX(-${100 - (props.modelValue ?? 0)}%)`,
  ...(active.value ? { backgroundColor: 'transparent' } : {}),
}))

const onUpdate = (v: unknown): void => emit('update:modelValue', v as number | null | undefined)
const onMax = (v: number): void => emit('update:max', v)

defineExpose({
  /** The live progress handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The root element (role="progressbar"). */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <ProgressRoot
    ref="root"
    data-slot="progress"
    v-bind="forwarded"
    :class="cn(progressRootClass, props.class)"
    :data-goop-host="goo ? 'progress' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
    @update:max="onMax"
  >
    <ProgressIndicator data-slot="progress-indicator" :class="progressIndicatorClass" :style="indicatorStyle" />
  </ProgressRoot>
</template>

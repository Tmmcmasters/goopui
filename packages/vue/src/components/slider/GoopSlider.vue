<script setup lang="ts">
// GoopSlider: shadcn-vue's Slider (reka SliderRoot / Track / Range / Thumb, v-model of a
// number[], orientation, range sliders with several thumbs, `class` merge, same classes)
// whose thumbs are goo blobs and whose range is liquid. On mount core's `attachSlider` adds
// one aria-hidden goo layer to the root; it measures the real (now see-through) range and
// thumbs, so reka keeps all behaviour: drag, keyboard, aria, inverted, rtl. Before mount,
// during SSR, or with `:goo="false"` it is a plain shadcn Slider, so hydration matches.
import { attachSlider, type SliderHandle } from '@goopui/core'
import { cn } from 'cn'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSliderProps, toSliderOptions } from '../../goop-props'
import {
  goopSliderRangeStyle,
  goopSliderThumbStyle,
  sliderRangeClass,
  sliderRootClass,
  sliderThumbClass,
  sliderTrackClass,
} from './variants'

const props = defineProps({
  ...goopSliderProps,
  /** The controlled value (v-model): one number per thumb. */
  modelValue: { type: Array as PropType<number[] | null>, default: undefined },
  /** The initial value when uncontrolled. */
  defaultValue: { type: Array as PropType<number[]>, default: undefined },
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: undefined },
  orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: undefined },
  dir: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
  inverted: { type: Boolean, default: false },
  minStepsBetweenThumbs: { type: Number, default: undefined },
  thumbAlignment: { type: String as PropType<'contain' | 'overflow'>, default: undefined },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn Slider. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{
  'update:modelValue': [payload: number[] | undefined]
  valueCommit: [payload: number[]]
}>()

const FORWARD = ['modelValue', 'defaultValue', 'min', 'max', 'step', 'orientation', 'dir', 'minStepsBetweenThumbs', 'thumbAlignment', 'name', 'as'] as const
const forwarded = computed(() => {
  const out: Record<string, unknown> = { inverted: props.inverted, disabled: props.disabled, required: props.required, asChild: props.asChild }
  for (const k of FORWARD) if (props[k] !== undefined && props[k] !== null) out[k] = props[k]
  return out
})

const vertical = computed(() => props.orientation === 'vertical')
const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({
  ...toSliderOptions(props, config),
  orientation: vertical.value ? ('vertical' as const) : ('horizontal' as const),
}))
const handle = shallowRef<SliderHandle | null>(null)
const active = computed(() => handle.value !== null)
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachSlider(el as HTMLElement, options.value)
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
// Core also watches the parts' inline styles; this covers v-model changes it might miss.
watch(() => props.modelValue, () => handle.value?.measure(), { flush: 'post', deep: true })

const onUpdate = (v: number[] | undefined): void => emit('update:modelValue', v)
const onCommit = (v: number[]): void => emit('valueCommit', v)

defineExpose({
  /** The live slider handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The root element. */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <SliderRoot
    ref="root"
    v-slot="{ modelValue: values }"
    data-slot="slider"
    :data-vertical="vertical ? '' : undefined"
    v-bind="forwarded"
    :class="cn(sliderRootClass, props.class)"
    :data-goop-host="goo ? 'slider' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
    @value-commit="onCommit"
  >
    <SliderTrack
      data-slot="slider-track"
      :data-horizontal="!vertical ? '' : undefined"
      :data-vertical="vertical ? '' : undefined"
      :class="sliderTrackClass"
    >
      <SliderRange
        data-slot="slider-range"
        :data-horizontal="!vertical ? '' : undefined"
        :data-vertical="vertical ? '' : undefined"
        :class="sliderRangeClass"
        :style="active ? goopSliderRangeStyle : undefined"
      />
    </SliderTrack>

    <SliderThumb
      v-for="(_, key) in values"
      :key="key"
      data-slot="slider-thumb"
      :data-vertical="vertical ? '' : undefined"
      :class="sliderThumbClass"
      :style="active ? goopSliderThumbStyle : undefined"
    />
  </SliderRoot>
</template>

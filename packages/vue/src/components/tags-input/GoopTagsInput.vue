<script setup lang="ts">
// GoopTagsInput: shadcn-vue's TagsInput (reka TagsInputRoot: v-model, addOnPaste, addOnTab,
// addOnBlur, duplicate, delimiter, max, disabled, ... all forwarded as attributes, `class`
// merge, same classes). On mount core's `attachTagsInput` adds the goo:
//   - the Input's goo focus ring around the whole box (flow, close, ripple, wobble, drain,
//     invalid drip), on an aria-hidden layer in a wrapper (`data-slot="tags-input-goo"`);
//   - merge: a new tag plops in like a droplet joining the others;
//   - melt: a removed tag drains away where it was.
// The real box and tags stay on top, unfiltered. With `:goo="false"` it is a plain shadcn
// TagsInput (no wrapper).
import { attachTagsInput, type TagsInputHandle } from '@goopui/core'
import { cn } from 'cn'
import { TagsInputRoot, type AcceptableInputValue } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopSoundProp, goopTagsInputProps, toTagsInputOptions } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { goopTagsInputActive, goopTagsInputContainer, TAGS_INPUT } from './variants'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopTagsInputProps,
  ...goopSoundProp,
  /** The controlled tags (v-model). */
  modelValue: { type: Array as PropType<AcceptableInputValue[]>, default: undefined },
  /** The initial tags when uncontrolled. */
  defaultValue: { type: Array as PropType<AcceptableInputValue[]>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Classes for the wrapper that holds the ring layer (default `relative w-full min-w-0`). */
  containerClass: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn TagsInput (no wrapper). */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [value: AcceptableInputValue[]] }>()

const inner = ref<AcceptableInputValue[]>(props.defaultValue ? [...props.defaultValue] : [])
const value = computed(() => props.modelValue ?? inner.value)
const onUpdate = (v: AcceptableInputValue[]): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const config = useGoopConfig()
useGoopSound(() => props.sound)
const options = computed(() => toTagsInputOptions(props, config))

const host = useTemplateRef<HTMLElement>('host')
const root = useTemplateRef<{ $el: HTMLElement } | null>('root')
const handle = shallowRef<TagsInputHandle | null>(null)
let mounted = false

const attach = (): void => {
  const box = root.value?.$el
  if (handle.value || !mounted || !props.goo || !host.value || !(box instanceof HTMLElement)) return
  handle.value = attachTagsInput(host.value, box, options.value)
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
watch(
  () => props.goo,
  (on) => {
    detach()
    if (on) attach()
  },
  { flush: 'post' },
)
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

// A press on the box itself (not a tag or the field) focuses the field.
const onBoxMouseDown = (e: MouseEvent): void => {
  const box = e.currentTarget as HTMLElement | null
  if (e.defaultPrevented || !box || e.target !== box || box.hasAttribute('data-disabled')) return
  e.preventDefault()
  box.querySelector<HTMLInputElement>('input:not([type="hidden"])')?.focus()
}

const classes = computed(() => cn(TAGS_INPUT, handle.value && goopTagsInputActive, props.class))

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The bordered box (reka's TagsInputRoot element). */
  get el() {
    return root.value?.$el ?? null
  },
})
</script>

<template>
  <div
    v-if="goo"
    ref="host"
    data-slot="tags-input-goo"
    data-goop-host="tags-input"
    :data-goop-active="handle ? '' : undefined"
    :class="cn(goopTagsInputContainer, props.containerClass)"
  >
    <TagsInputRoot
      ref="root"
      v-slot="slotProps"
      data-slot="tags-input"
      v-bind="$attrs"
      :model-value="value"
      :class="classes"
      @update:model-value="onUpdate"
      @mousedown="onBoxMouseDown"
    >
      <slot v-bind="slotProps" />
    </TagsInputRoot>
  </div>
  <TagsInputRoot
    v-else
    ref="root"
    v-slot="slotProps"
    data-slot="tags-input"
    v-bind="$attrs"
    :model-value="value"
    :class="classes"
    @update:model-value="onUpdate"
    @mousedown="onBoxMouseDown"
  >
    <slot v-bind="slotProps" />
  </TagsInputRoot>
</template>

<script setup lang="ts">
// GoopToggleGroup: shadcn-vue's ToggleGroup (reka ToggleGroupRoot, `type` single | multiple,
// v-model, variant / size / spacing shared with the items, `class` merge) whose pressed fills are
// one goo layer on the root. On mount core's `attachToggleGroup` attaches it: pressing an item
// floods it from the press point, un-pressing drains it; in single mode the goo flows from the
// old item to the new one; neighbouring pressed items merge into one body and tear apart.
// Before mount, during SSR, or with `:goo="false"` it is a plain shadcn ToggleGroup.
import { attachToggleGroup, type ToggleHandle } from '@goopui/core'
import { cn } from 'cn'
import { ToggleGroupRoot, type AcceptableValue } from 'reka-ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopToggleGroupProps, toToggleGroupOptions } from '../../goop-props'
import { goopToggleColors, type ToggleVariants } from '../toggle/variants'
import { provideGoopToggleGroup } from './context'
import { toggleGroupVariants } from './variants'

type Value = AcceptableValue | AcceptableValue[]

const props = defineProps({
  ...goopToggleGroupProps,
  /** 'single': at most one pressed item (the value is that item's); 'multiple': an array. */
  type: { type: String as PropType<'single' | 'multiple'>, default: undefined },
  /** The controlled value (v-model). */
  modelValue: { type: null as unknown as PropType<Value | null>, default: undefined },
  /** The initial value when uncontrolled. */
  defaultValue: { type: null as unknown as PropType<Value>, default: undefined },
  disabled: { type: Boolean, default: false },
  rovingFocus: { type: Boolean, default: true },
  loop: { type: Boolean, default: true },
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: undefined },
  dir: { type: String as PropType<'ltr' | 'rtl'>, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  variant: { type: String as PropType<ToggleVariants['variant']>, default: undefined },
  size: { type: String as PropType<ToggleVariants['size']>, default: undefined },
  /** Gap between items in Tailwind spacing units (0 = joined, shadcn's default). */
  spacing: { type: Number, default: 0 },
  as: { type: [String, Object] as PropType<string | object>, default: undefined },
  asChild: { type: Boolean, default: false },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn ToggleGroup. */
  goo: { type: Boolean, default: true },
})

const emit = defineEmits<{ 'update:modelValue': [payload: Value] }>()

const inner = ref<Value | undefined>(props.defaultValue)
const selected = computed(() => (props.modelValue === undefined ? inner.value : props.modelValue))
const onUpdate = (v: Value): void => {
  inner.value = v
  emit('update:modelValue', v)
}

const forwarded = computed(() => {
  const out: Record<string, unknown> = {
    disabled: props.disabled,
    required: props.required,
    asChild: props.asChild,
    loop: props.loop,
    rovingFocus: props.rovingFocus,
  }
  for (const k of ['type', 'orientation', 'dir', 'name', 'as'] as const) if (props[k] !== undefined) out[k] = props[k]
  return out
})

const root = useTemplateRef<{ $el: unknown }>('root')
const config = useGoopConfig()
const options = computed(() => ({ ...toToggleGroupOptions(props, config), value: selected.value }))
const handle = shallowRef<ToggleHandle | null>(null)
const active = computed(() => handle.value !== null)
provideGoopToggleGroup({
  variant: computed(() => props.variant),
  size: computed(() => props.size),
  spacing: computed(() => props.spacing),
  active,
})
let mounted = false

const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = root.value?.$el as Element | null | undefined
  if (el && el.nodeType === 1) handle.value = attachToggleGroup(el as HTMLElement, options.value)
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
// flush: 'post' so the items' data-state is patched before core reads it.
watch(options, (next) => handle.value?.update(next), { flush: 'post', deep: true })

const classes = computed(() => cn(toggleGroupVariants(), props.goo && goopToggleColors, props.class))

defineExpose({
  /** The live toggle group handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The root element (role="group"). */
  get el() {
    return (root.value?.$el as HTMLElement | undefined) ?? null
  },
})
</script>

<template>
  <ToggleGroupRoot
    ref="root"
    v-slot="slotProps"
    data-slot="toggle-group"
    :data-size="size"
    :data-variant="variant"
    :data-spacing="spacing"
    :style="{ '--gap': spacing }"
    :class="classes"
    v-bind="forwarded"
    :model-value="selected as never"
    :data-goop-host="goo ? 'toggle-group' : undefined"
    :data-goop-active="active ? '' : undefined"
    @update:model-value="onUpdate"
  >
    <slot v-bind="slotProps" />
  </ToggleGroupRoot>
</template>

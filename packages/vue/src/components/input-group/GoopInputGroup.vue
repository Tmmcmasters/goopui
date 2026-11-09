<script setup lang="ts">
// GoopInputGroup: shadcn-vue's InputGroup (a `role="group"` box holding addons, buttons and a
// text control; `class` merge) with GoopInput's goo focus ring around the whole group (core
// `attachInputGroup`). Focus in the input (or textarea) flows goo around the group's border
// from the click point; typing ripples it near the caret; leaving the controls drains it;
// aria-invalid on any part turns it destructive with a small drip. GoopInputGroupButton is a
// GoopButton (its own goo), the controls are plain (the group's ring is theirs). Core draws on
// an aria-hidden layer in a wrapper (`data-slot="input-group-goo"`, in the server markup too,
// so hydration matches); the group gets every attribute. With `:goo="false"` it is a plain
// shadcn InputGroup (no wrapper). Reduced motion: a static ring.
import { attachInputGroup, type InputHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopInputGroupProps, toInputGroupOptions } from '../../goop-props'
import { provideGoopInputGroup } from './context'
import { INPUT_GROUP, goopInputGroupActive, goopInputGroupContainer } from './styles'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  ...goopInputGroupProps,
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Classes for the wrapper that holds the goo layer (default `relative w-full min-w-0`). */
  containerClass: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
  /** Master switch. `false` renders a plain shadcn InputGroup (no wrapper). */
  goo: { type: Boolean, default: true },
})

const host = useTemplateRef<HTMLElement>('host')
const group = useTemplateRef<HTMLElement>('group')
const config = useGoopConfig()
const options = computed(() => toInputGroupOptions(props, config))
const handle = shallowRef<InputHandle | null>(null)
let mounted = false
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}
const sync = (): void => {
  const opts = options.value
  if (!mounted || !opts || !host.value || !group.value) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachInputGroup(host.value, group.value, opts)
}
onMounted(() => {
  mounted = true
  sync()
})
onBeforeUnmount(() => {
  mounted = false
  detach()
})
watch(options, sync, { flush: 'post' })

const active = computed(() => handle.value !== null)
provideGoopInputGroup(active)
const classes = computed(() => cn(INPUT_GROUP, active.value && goopInputGroupActive, props.class))

defineExpose({
  /** The live goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  /** The group element. */
  get el() {
    return group.value
  },
})
</script>

<template>
  <div
    v-if="goo"
    ref="host"
    data-slot="input-group-goo"
    data-goop-host="input-group"
    :data-goop-active="active ? '' : undefined"
    :class="cn(goopInputGroupContainer, props.containerClass)"
  >
    <div ref="group" data-slot="input-group" role="group" v-bind="$attrs" :class="classes">
      <slot />
    </div>
  </div>
  <div v-else ref="group" data-slot="input-group" role="group" v-bind="$attrs" :class="classes">
    <slot />
  </div>
</template>

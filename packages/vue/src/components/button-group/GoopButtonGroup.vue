<script setup lang="ts">
// GoopButtonGroup: shadcn-vue's ButtonGroup (a div role="group", `orientation`, `class`
// merge) as one goo body (core `attachButtonGroup`). One aria-hidden goo layer behind the
// buttons: the hover / focus `highlight` blob slides between them (trailing a low mound,
// swelling under the pointer; on touch only while pressed), and a press swells the goo past
// the pressed button (`bulge`) and sends it into the neighbours (`ripple`). The buttons flex
// too: the pressed one squishes (`press`), its neighbours are tugged toward it (`tug`), then a
// jelly settle. Joined edges only ever overlap, so no gap or seam opens, and nothing shifts
// layout. GoopButtons inside leave their own goo off unless they set `goo`. Before mount,
// during SSR or with `:goo="false"` it is a plain shadcn ButtonGroup; reduced motion: a static
// highlight, no press motion.
import { attachButtonGroup, type ButtonGroupHandle } from '@goopui/core'
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch, type HTMLAttributes, type PropType } from 'vue'
import { useGoopConfig } from '../../config'
import { goopButtonGroupProps, toButtonGroupOptions } from '../../goop-props'
import { provideGoopButtonGroup } from './context'
import { buttonGroupVariants, type ButtonGroupVariants } from './variants'

const props = defineProps({
  ...goopButtonGroupProps,
  orientation: { type: String as PropType<ButtonGroupVariants['orientation']>, default: undefined },
  class: { type: [String, Array, Object] as PropType<HTMLAttributes['class']>, default: undefined },
})
provideGoopButtonGroup()

const root = useTemplateRef<HTMLElement>('root')
const config = useGoopConfig()
const options = computed(() => toButtonGroupOptions(props, config, props.orientation ?? 'horizontal'))
const handle = shallowRef<ButtonGroupHandle | null>(null)
let mounted = false

const attach = (): void => {
  const opts = options.value
  if (handle.value || !mounted || !opts || !root.value) return
  handle.value = attachButtonGroup(root.value, opts)
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

defineExpose({
  /** The live group handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
  get el() {
    return root.value ?? null
  },
})
</script>

<template>
  <div
    ref="root"
    role="group"
    data-slot="button-group"
    :data-orientation="orientation"
    :data-goop-host="goo ? 'button-group' : undefined"
    :class="cn(buttonGroupVariants({ orientation }), props.class)"
  >
    <slot />
  </div>
</template>

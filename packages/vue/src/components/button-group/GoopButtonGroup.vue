<script setup lang="ts">
// GoopButtonGroup: shadcn-vue's ButtonGroup (a div role="group", `orientation`, `class`
// merge). Every GoopButton inside keeps its own goo body, exactly as when it stands alone; the
// group (core `attachButtonGroup`) marks each member's joined sides (`seams`) so core cuts
// that goo clean at the seams: no bulge, drip or splash crosses onto a neighbour, the seam
// never opens, and the outer edges bulge, drip and splash as usual. `press` / `tug` (the old
// whole-button squish and neighbour tug) are opt-in. Before mount, during SSR or with
// `:goo="false"` (the buttons too) it is a plain shadcn ButtonGroup.
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
provideGoopButtonGroup(() => props.goo !== false)

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

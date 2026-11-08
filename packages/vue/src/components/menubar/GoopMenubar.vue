<script setup lang="ts">
// GoopMenubar: shadcn-vue's Menubar (reka-ui MenubarRoot, same props/emits/slot, `class`
// merge) whose trigger highlight is ONE goo body (core `attachMenubarHighlight`, the menu
// highlight engine fed the tabs feel). It sits on the trigger you hover or arrow to, flows to
// the next one with momentum (stretching, with fat neck lumps, landing with a jelly
// overshoot), stays on the open trigger while its menu is open, and follows the open menu as
// you move across the bar. It is aria-hidden, behind the real triggers. Toggles: `highlight`,
// `wobble`, `momentum`; `:goo="false"` is plain shadcn. Menus inherit `goo`, `wobble`,
// `momentum`, `speed`, `preset` and `renderer` unless they set their own. Reduced motion: the
// body snaps. Browser-only: SSR renders shadcn markup, and goop.css paints the hovered / open
// trigger until the body attaches.
import { attachMenubarHighlight, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import type { MenubarRootEmits, MenubarRootProps } from 'reka-ui'
import { MenubarRoot, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { MENUBAR_PROP_KEYS, toMenubarOptions, type GoopMenubarProps, type GoopSoundProps } from '../../goop-props'
import { useGoopSound } from '../../sound'
import { provideGoopMenubar } from './context'

const props = withDefaults(defineProps<MenubarRootProps & GoopMenubarProps & GoopSoundProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  highlight: undefined,
  wobble: undefined,
  momentum: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
  sound: undefined,
})
const emits = defineEmits<MenubarRootEmits>()

const OWN = new Set<string>(['class', 'sound', ...MENUBAR_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as MenubarRootProps)
const forwarded = useForwardPropsEmits(delegated, emits)
useGoopSound(() => props.sound)

const config = useGoopConfig()
const bar = computed<GoopMenubarProps>(() => ({
  goo: props.goo,
  highlight: props.highlight,
  wobble: props.wobble,
  momentum: props.momentum,
  speed: props.speed,
  preset: props.preset,
  renderer: props.renderer,
}))
const options = computed(() => toMenubarOptions(bar.value, config))
const blob = computed(() => options.value !== null)
provideGoopMenubar({ bar, blob })

const el = shallowRef<HTMLElement | null>(null)
const setEl = (c: Element | ComponentPublicInstance | null) => {
  const node = c && '$el' in c ? (c.$el as unknown) : c
  el.value = node instanceof HTMLElement ? node : null
}
const handle = shallowRef<MenuHighlightHandle | null>(null)

const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const sync = () => {
  const node = el.value
  const opts = options.value
  if (!node || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachMenubarHighlight(node, opts)
}
watch(el, () => {
  detach()
  sync()
}, { flush: 'post' })
watch(options, sync, { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live trigger highlight handle (null before mount / when it is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <MenubarRoot
    :ref="setEl"
    v-slot="slotProps"
    data-slot="menubar"
    :data-goop-menubar="blob ? '' : undefined"
    v-bind="forwarded"
    :class="cn('h-8 gap-0.5 rounded-lg border p-0.75 flex items-center', props.class)"
  >
    <slot v-bind="slotProps" />
  </MenubarRoot>
</template>

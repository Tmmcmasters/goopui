<script setup lang="ts">
// GoopToaster: shadcn-vue's Sonner (vue-sonner's <Toaster> with shadcn tokens, the same props
// passthrough, `class` merge, default `rounded-2xl` toasts and lucide icons). Keep calling
// `toast()` from vue-sonner. On mount core's `attachToaster` paints the toasts' backgrounds
// on one shared aria-hidden goo layer behind the real, unfiltered toasts:
//   dropIn  new toasts drop in from the toaster edge as a blob, overshoot and slosh;
//   merge   stacked toasts merge with fat goo necks that stretch and snap as the stack expands;
//   drips   leaving toasts drip off; swipe-out flings the goo the swipe's way.
// With `:goo="false"`, during SSR and before mount it is exactly shadcn's Sonner. Reduced
// motion: static goo bodies, none of the effects. Needs `vue-sonner/style.css` (as shadcn's).
import { attachToaster, type ToasterHandle } from '@goopui/core'
import { cn } from 'cn'
import type { ToasterProps } from 'vue-sonner'
import { Toaster as Sonner } from 'vue-sonner'
import { computed, onBeforeUnmount, onMounted, shallowRef, useTemplateRef, watch } from 'vue'
import { useGoopConfig } from '../../config'
import { toToasterOptions, type GoopToasterProps } from '../../goop-props'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from './icons'

const props = withDefaults(defineProps<ToasterProps & GoopToasterProps>(), {
  goo: true,
  dropIn: true,
  merge: true,
  drips: true,
  speed: undefined,
  preset: undefined,
})

const delegated = computed(() => {
  const {
    class: _class,
    toastOptions: _toastOptions,
    goo: _goo,
    dropIn: _dropIn,
    merge: _merge,
    drips: _drips,
    speed: _speed,
    preset: _preset,
    ...rest
  } = props
  return rest
})

const config = useGoopConfig()
const options = computed(() => toToasterOptions(props, config))
const sonner = useTemplateRef<{ $el: unknown }>('sonner')
const handle = shallowRef<ToasterHandle | null>(null)
let mounted = false

/** vue-sonner's <section>. Its template starts with a comment, so `$el` can be the fragment's
 *  anchor node rather than the section: take the first element from there. */
const rootEl = (): HTMLElement | null => {
  let n = (sonner.value?.$el as Node | null | undefined) ?? null
  while (n && n.nodeType !== 1) n = n.nextSibling
  return n as HTMLElement | null
}
const attach = (): void => {
  if (handle.value || !mounted || !props.goo) return
  const el = rootEl()
  if (el) handle.value = attachToaster(el, options.value)
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

defineExpose({
  /** The live toaster goo handle (null before mount / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <Sonner
    ref="sonner"
    :class="cn('toaster group', props.class)"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
      '--gray2': 'hsl(var(--popover) / 0.9)',
      '--gray3': 'var(--border)',
      '--gray4': 'var(--border)',
      '--gray5': 'var(--border)',
      '--gray12': 'var(--popover-foreground)',
    }"
    :toast-options="props.toastOptions ?? {
      classes: {
        toast: 'rounded-2xl',
      },
    }"
    v-bind="delegated"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<script setup lang="ts">
// GoopDrawerContent: shadcn-vue's DrawerContent (vaul-vue's DrawerContent in a portal with the
// overlay, same props/emits, `class` merge, the drag handle on bottom drawers) whose panel is a
// live goo surface. vaul keeps full control of the drag, snap points and open/close motion;
// core's `attachDrawer` only measures where vaul put the panel each frame and drives the goo
// from that motion:
//   lag      the leading edge trails behind fast motion (a flick down stretches it up behind);
//   slosh    when the motion stops (release, snap point) the edge overshoots and wobbles;
//   rise     opening lands with an extra jelly overshoot;
//   stretch  dragging past the edge pulls a globby bump toward the finger;
//   handle   the drag handle is a goo blob: swells, stretches along the drag, trails a droplet;
//   drips    on dismiss, drops pinch off the edge and plop down off-screen.
// The panel's background and border move onto the goo (`--goop-color`, default the theme
// background, with a soft drop-shadow ring). With `:goo="false"` it is exactly shadcn's
// DrawerContent. Reduced motion: vaul works as usual, the goo is a static panel.
import { attachDrawer, type DrawerGooHandle } from '@goopui/core'
import { cn } from 'cn'
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { useForwardPropsEmits } from 'reka-ui'
import { DrawerContent, DrawerPortal } from 'vaul-vue'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toDrawerOptions, type GoopDrawerProps } from '../../goop-props'
import GoopDrawerOverlay from './GoopDrawerOverlay.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DialogContentProps & GoopDrawerProps & { class?: HTMLAttributes['class'] }>(), {
  goo: true,
  lag: true,
  slosh: true,
  rise: true,
  stretch: true,
  handle: true,
  drips: true,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<DialogContentEmits>()

const delegated = computed(() => {
  const {
    class: _class,
    goo: _goo,
    lag: _lag,
    slosh: _slosh,
    rise: _rise,
    stretch: _stretch,
    handle: _handle,
    drips: _drips,
    speed: _speed,
    preset: _preset,
    renderer: _renderer,
    ...rest
  } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

const DIRECTIONS =
  'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg ' +
  'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg ' +
  'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:sm:max-w-sm ' +
  'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:sm:max-w-sm'
const BORDERS =
  'data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=left]:border-r'
const SHADCN = `group/drawer-content bg-background fixed z-50 flex h-auto flex-col ${DIRECTIONS} ${BORDERS}`
// The goo paints the background and the edge (a drop-shadow ring instead of the border).
const GOO = `group/drawer-content [--goop-color:var(--background)] fixed z-50 flex h-auto flex-col ${DIRECTIONS}`
const classes = computed(() => cn(props.goo ? GOO : SHADCN, props.class))

const HANDLE = 'mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block'
const handleClasses = computed(() =>
  props.goo && props.handle !== false ? `${HANDLE} [--goop-color:var(--muted)]` : `${HANDLE} bg-muted`,
)

const config = useGoopConfig()
const options = computed(() => toDrawerOptions(props, config))
const surface = useTemplateRef<HTMLElement>('surface')
const handle = shallowRef<DrawerGooHandle | null>(null)

const attach = (): void => {
  const el = surface.value
  const host = el?.parentElement
  if (!el || !host) return
  if (handle.value) detach()
  handle.value = attachDrawer(host, { ...options.value, surface: el })
}
const detach = (): void => {
  handle.value?.destroy()
  handle.value = null
}

// vaul mounts the content on every open (reka's Presence); the surface only exists while
// `goo` is on: attach whenever it appears.
watch(surface, (el) => (el ? attach() : detach()), { flush: 'post' })
onBeforeUnmount(detach)
watch(options, (next) => handle.value?.update(next), { flush: 'post' })

defineExpose({
  /** The live drawer goo handle (null while closed / when goo is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <DrawerPortal>
    <GoopDrawerOverlay />
    <DrawerContent
      data-slot="drawer-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <span
        v-if="goo"
        ref="surface"
        data-goop="surface"
        aria-hidden="true"
        style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
      />
      <div
        data-goop-drawer-handle
        :class="handleClasses"
      />
      <slot />
    </DrawerContent>
  </DrawerPortal>
</template>

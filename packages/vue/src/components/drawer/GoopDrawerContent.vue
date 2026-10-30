<script setup lang="ts">
// GoopDrawerContent: shadcn-vue's DrawerContent (a portal with the overlay, the panel with
// shadcn's classes and `data-vaul-drawer-direction`, the drag handle on bottom drawers) on
// reka-ui's DialogContent. Core's `createDrawer` drives the panel: drag with rubber band,
// vaul-like snap / dismiss thresholds, springs, the overlay fade and the background scale.
// The panel's background IS the goo (an aria-hidden surface behind the unfiltered content),
// moved by the same engine in the same frame, so the two never come apart:
//   lag      the leading edge trails fast moves;
//   slosh    it overshoots and wobbles when motion stops (release, snap, landing);
//   rise     opening lands with a jelly overshoot;
//   stretch  pulling past full open draws a globby bump toward the finger;
//   handle   the handle is a goo blob: swells, stretches, trails a droplet;
//   splash   a fling-dismiss throws a splash of drops off the edge that fall and fade.
// `:goo="false"` is exactly shadcn's DrawerContent look (still driven by the engine).
// Reduced motion: dragging works, no goo sim, snaps without slosh.
import { createDrawer, type DrawerOptions } from '@goopui/core'
import { cn } from 'cn'
import type { DialogContentEmits, DialogContentProps } from 'reka-ui'
import { DialogContent, DialogPortal, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toDrawerOptions, type GoopDrawerProps } from '../../goop-props'
import { injectDrawerRootContext } from './context'
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
  splash: true,
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
    splash: _splash,
    speed: _speed,
    preset: _preset,
    renderer: _renderer,
    forceMount: _forceMount,
    ...rest
  } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

const ctx = injectDrawerRootContext()
const root = ctx.props

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

// ---- engine ----
const config = useGoopConfig()
const options = computed<DrawerOptions>(() => ({
  ...toDrawerOptions(props, config),
  direction: ctx.direction.value,
  snapPoints: root.snapPoints,
  activeSnapPoint: ctx.activeSnapPoint.value,
  fadeFromIndex: root.fadeFromIndex,
  dismissible: root.dismissible !== false,
  closeThreshold: root.closeThreshold,
  handleOnly: root.handleOnly === true,
  scaleBackground: root.shouldScaleBackground === true,
  setBackgroundColorOnScale: root.setBackgroundColorOnScale !== false && root.noBodyStyles !== true,
  overlay: ctx.overlay.value,
}))

const content = useTemplateRef<{ $el?: Element } | null>('content')
const panel = computed<HTMLElement | null>(() => {
  const el = content.value?.$el
  return el instanceof HTMLElement ? el : null
})
const surface = useTemplateRef<HTMLElement>('surface')

const attach = (el: HTMLElement): void => {
  detach()
  const c = createDrawer(
    el,
    { ...options.value, surface: surface.value ?? undefined },
    {
      onDrag: (pct) => ctx.onDrag(pct),
      onRelease: (stays) => ctx.onRelease(stays),
      onDismiss: () => ctx.setOpen(false),
      onSnap: (i) => {
        const p = root.snapPoints?.[i]
        if (p !== undefined) ctx.setActiveSnapPoint(p)
      },
      onSettle: (open) => ctx.onSettle(open),
    },
  )
  ctx.controller.value = c
  if (ctx.open.value) {
    c.open({ instant: ctx.instantOpen.value })
    ctx.instantOpen.value = false
  }
}
const detach = (): void => {
  const c = ctx.controller.value
  if (!c) return
  ctx.controller.value = null
  c.destroy()
}

// The panel mounts on every open (and stays mounted through the engine's close).
watch(panel, (el) => (el ? attach(el) : detach()), { flush: 'post' })
onBeforeUnmount(detach)
watch(
  options,
  (next) => ctx.controller.value?.update({ ...next, surface: surface.value ?? undefined }),
  { flush: 'post' },
)

// vaul: with `dismissible: false` Escape and outside clicks don't close it; non-modal
// drawers never close on outside interaction.
const onEscape = (e: KeyboardEvent): void => {
  if (root.dismissible === false) e.preventDefault()
}
const onOutside = (e: Event): void => {
  if (root.dismissible === false || root.modal === false) e.preventDefault()
}

defineExpose({
  /** The live drawer controller (null while closed). */
  get handle() {
    return ctx.controller.value
  },
})
</script>

<template>
  <DialogPortal>
    <GoopDrawerOverlay />
    <DialogContent
      v-if="ctx.present.value"
      ref="content"
      data-slot="drawer-content"
      data-vaul-drawer=""
      :data-vaul-drawer-direction="ctx.direction.value"
      :data-vaul-snap-points="root.snapPoints?.length ? 'true' : 'false'"
      v-bind="{ ...$attrs, ...forwarded }"
      :force-mount="true"
      :class="classes"
      @escape-key-down="onEscape"
      @pointer-down-outside="onOutside"
      @interact-outside="onOutside"
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
        data-vaul-handle=""
        aria-hidden="true"
        :class="handleClasses"
      />
      <slot />
    </DialogContent>
  </DialogPortal>
</template>

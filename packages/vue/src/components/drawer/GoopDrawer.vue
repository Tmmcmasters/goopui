<script setup lang="ts">
// GoopDrawer: shadcn-vue's Drawer root with vaul-vue's API (same props, emits, v-models and
// `shouldScaleBackground` on by default), built on reka-ui's DialogRoot (focus trap, scroll
// lock, a11y, Escape / outside dismissal). No vaul: core's `createDrawer` (wired up in
// GoopDrawerContent) owns the drag, snap points, springs and the goo, all in one frame.
import type { DrawerController, DrawerSnapPoint } from '@goopui/core'
import { DialogRoot } from 'reka-ui'
import { computed, ref, shallowRef, watch } from 'vue'
import {
  injectParentDrawerContext,
  provideDrawerRootContext,
  type GoopDrawerRootEmits,
  type GoopDrawerRootProps,
} from './context'

const props = withDefaults(defineProps<GoopDrawerRootProps>(), {
  open: undefined,
  defaultOpen: undefined,
  direction: 'bottom',
  snapPoints: undefined,
  activeSnapPoint: undefined,
  fadeFromIndex: undefined,
  closeThreshold: 0.25,
  shouldScaleBackground: true,
  setBackgroundColorOnScale: true,
  dismissible: true,
  modal: true,
  nested: false,
  handleOnly: false,
  noBodyStyles: false,
  scrollLockTimeout: 500,
  fixed: undefined,
  preventScrollRestoration: undefined,
})
const emit = defineEmits<GoopDrawerRootEmits>()

// ---- open (v-model:open, defaultOpen) ----
const local = ref(props.open ?? props.defaultOpen ?? false)
watch(
  () => props.open,
  (v) => {
    if (v !== undefined) local.value = v
  },
)
const open = computed(() => props.open ?? local.value)
const present = ref(open.value)
const instantOpen = ref(open.value && props.defaultOpen === true && props.open === undefined)
const controller = shallowRef<DrawerController | null>(null)

const setOpen = (v: boolean): void => {
  if (v === open.value) return
  local.value = v
  emit('update:open', v)
}

// ---- snap points (v-model:activeSnapPoint) ----
const localSnap = ref<DrawerSnapPoint | null>(props.activeSnapPoint ?? props.snapPoints?.[0] ?? null)
watch(
  () => props.activeSnapPoint,
  (v) => {
    if (v !== undefined) localSnap.value = v
  },
)
watch(
  () => props.snapPoints,
  (pts) => {
    if (props.activeSnapPoint === undefined && pts?.length && (localSnap.value === null || !pts.includes(localSnap.value))) localSnap.value = pts[0]!
  },
)
const activeSnapPoint = computed<DrawerSnapPoint | null>(() => (props.activeSnapPoint !== undefined && props.activeSnapPoint !== null ? props.activeSnapPoint : localSnap.value))
const setActiveSnapPoint = (v: DrawerSnapPoint): void => {
  if (v === activeSnapPoint.value) return
  localSnap.value = v
  emit('update:activeSnapPoint', v)
}

// ---- nested: tell the parent drawer how far this one is open ----
const parent = props.nested ? injectParentDrawerContext() : null

watch(open, (v, was) => {
  if (v) {
    present.value = true
    parent?.setNested(1)
    controller.value?.open()
    return
  }
  if (was) emit('close')
  parent?.setNested(0)
  if (controller.value && controller.value.state !== 'closed') controller.value.close()
  else present.value = false
})

provideDrawerRootContext({
  props,
  open,
  present,
  instantOpen,
  direction: computed(() => props.direction ?? 'bottom'),
  activeSnapPoint,
  overlay: shallowRef(null),
  controller,
  setOpen,
  setActiveSnapPoint,
  onDrag(pct) {
    emit('drag', pct)
    parent?.setNested(Math.max(0, 1 - pct), true)
  },
  onRelease(stays) {
    emit('release', stays)
    if (stays) parent?.setNested(1)
  },
  onSettle(isOpen) {
    emit('animationEnd', isOpen)
    if (isOpen) return
    present.value = false
    // vaul: a closed drawer reopens at its first snap point.
    const first = props.snapPoints?.[0]
    if (first !== undefined) setActiveSnapPoint(first)
  },
  setNested(t, instant) {
    controller.value?.setNested(t, instant)
  },
})

defineExpose({ open })
</script>

<template>
  <DialogRoot
    data-slot="drawer"
    :open="open"
    :modal="modal"
    @update:open="setOpen"
  >
    <slot
      :open="open"
      :close="() => setOpen(false)"
    />
  </DialogRoot>
</template>

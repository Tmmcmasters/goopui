<script setup lang="ts">
// GoopSidebarProvider: shadcn-vue's SidebarProvider. Holds the open state (v-model:open, or
// uncontrolled from `defaultOpen`, which defaults to the `sidebar_state` cookie), persists it
// to that cookie, toggles on Ctrl/Cmd+B, switches to the mobile sheet below 768px, and
// provides `useSidebar()`. Wraps everything in a TooltipProvider (delay 0) for the icon-mode
// tooltips.
import { cn } from 'cn'
import { computed, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from 'vue'
import GoopTooltipProvider from '../tooltip/GoopTooltipProvider.vue'
import {
  SIDEBAR_COOKIE_MAX_AGE,
  SIDEBAR_COOKIE_NAME,
  SIDEBAR_KEYBOARD_SHORTCUT,
  SIDEBAR_MOBILE_BREAKPOINT,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_ICON,
  provideSidebarContext,
} from './utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Initial open state when uncontrolled. Default: the `sidebar_state` cookie, then open. */
    defaultOpen?: boolean
    open?: boolean
    class?: HTMLAttributes['class']
  }>(),
  {
    defaultOpen: () => (typeof document === 'undefined' ? true : !document.cookie.includes(`${SIDEBAR_COOKIE_NAME}=false`)),
    open: undefined,
  },
)
const emits = defineEmits<{ 'update:open': [open: boolean] }>()

const inner = ref(props.defaultOpen ?? true)
const open = computed({
  get: () => props.open ?? inner.value,
  set: (v: boolean) => {
    inner.value = v
    emits('update:open', v)
  },
})
watch(
  () => props.open,
  (v) => {
    if (v !== undefined) inner.value = v
  },
)

function setOpen(value: boolean) {
  open.value = value
  if (typeof document !== 'undefined') {
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  }
}

const isMobile = ref(false)
const openMobile = ref(false)
function setOpenMobile(value: boolean) {
  openMobile.value = value
}
function toggleSidebar() {
  return isMobile.value ? setOpenMobile(!openMobile.value) : setOpen(!open.value)
}

let mql: MediaQueryList | null = null
const syncMobile = () => {
  isMobile.value = !!mql?.matches
}
const onKey = (event: KeyboardEvent) => {
  if (event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    toggleSidebar()
  }
}
onMounted(() => {
  mql = window.matchMedia?.(`(max-width: ${SIDEBAR_MOBILE_BREAKPOINT - 1}px)`) ?? null
  syncMobile()
  mql?.addEventListener?.('change', syncMobile)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  mql?.removeEventListener?.('change', syncMobile)
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onKey)
})

const state = computed(() => (open.value ? 'expanded' : 'collapsed'))

provideSidebarContext({ state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar })
</script>

<template>
  <GoopTooltipProvider :delay-duration="0">
    <div
      data-slot="sidebar-wrapper"
      :style="{
        '--sidebar-width': SIDEBAR_WIDTH,
        '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
      }"
      :class="cn('group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full', props.class)"
      v-bind="$attrs"
    >
      <slot :state="state" :open="open" :is-mobile="isMobile" :toggle-sidebar="toggleSidebar" />
    </div>
  </GoopTooltipProvider>
</template>

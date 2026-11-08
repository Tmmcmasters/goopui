<script setup lang="ts">
// GoopSidebar: shadcn-vue's Sidebar (`side` left | right, `variant` sidebar | floating | inset,
// `collapsible` offcanvas | icon | none, `class` on the fixed container). Below the mobile
// breakpoint it is a sheet. Goo (each a toggle, see GoopSidebarProps in goop-props.ts):
//   - `highlight`: the hover / focus highlight is the dropdown's goo blob, gliding between the
//     menu buttons with momentum, its soft swell under the cursor;
//   - `pill`: the active item is a soft filled pill;
//   - `travel`: collapse / expand moves with the Drawer's momentum (core `sidebarMotionCurve`
//     as a CSS transition): expand launches fast and lands with a small overshoot, collapse
//     accelerates away and stops at speed;
//   - `slosh`: collapsing / expanding sloshes the inner edge in low, wide mounds driven by
//     the edge's real motion (core `attachSidebarEdge`), so it sloshes where `travel` brakes;
//   - `submenus`: GoopCollapsible sub-menus inside spring open (the open row stays unfilled,
//     as in shadcn: only the active item is a pill);
//   - `pour`: an opening sub-menu's guide line pours down behind a goo bead (goop.css);
//   - `tooltips`: icon-mode tooltips (GoopSidebarMenuButton `tooltip`) are GoopTooltips;
//   - `drawer`: the mobile sidebar is a GoopDrawer from its side: panel and goo one body, fast
//     launch, small landing overshoot, a close that accelerates away, swipe to close;
//   - `bloom`: with `drawer` off, the mobile sheet blooms from its screen edge (GoopSheetContent).
// The goo is aria-hidden behind the real content. Reduced motion: no slosh, the highlight snaps.
import { cn } from 'cn'
import { computed, shallowRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { toSidebarOptions, type GoopSidebarProps } from '../../goop-props'
import { provideGoopCollapsibleDefaults } from '../accordion/context'
import GoopDrawer from '../drawer/GoopDrawer.vue'
import GoopDrawerContent from '../drawer/GoopDrawerContent.vue'
import GoopDrawerDescription from '../drawer/GoopDrawerDescription.vue'
import GoopDrawerHeader from '../drawer/GoopDrawerHeader.vue'
import GoopDrawerTitle from '../drawer/GoopDrawerTitle.vue'
import GoopSheet from '../sheet/GoopSheet.vue'
import GoopSheetContent from '../sheet/GoopSheetContent.vue'
import GoopSheetDescription from '../sheet/GoopSheetDescription.vue'
import GoopSheetHeader from '../sheet/GoopSheetHeader.vue'
import GoopSheetTitle from '../sheet/GoopSheetTitle.vue'
import { useSidebarGoo, useSidebarTravel } from './use-sidebar-goo'
import { SIDEBAR_WIDTH_MOBILE, provideSidebarGoo, useSidebar } from './utils'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<
    GoopSidebarProps & {
      side?: 'left' | 'right'
      variant?: 'sidebar' | 'floating' | 'inset'
      collapsible?: 'offcanvas' | 'icon' | 'none'
      class?: HTMLAttributes['class']
    }
  >(),
  {
    side: 'left',
    variant: 'sidebar',
    collapsible: 'offcanvas',
    goo: undefined,
    highlight: undefined,
    pill: undefined,
    slosh: undefined,
    travel: undefined,
    submenus: undefined,
    pour: undefined,
    tooltips: undefined,
    drawer: undefined,
    bloom: undefined,
    followPointer: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)

const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
const config = useGoopConfig()
const goo = computed(() => toSidebarOptions(props, config))
provideSidebarGoo(goo)
// Sub-menus spring open but never fill their row: only the active item is a pill.
provideGoopCollapsibleDefaults(computed(() => ({ goo: goo.value.submenus, rowFill: false })))

const desktopPanel = shallowRef<HTMLElement | null>(null)
const mobilePanel = shallowRef<HTMLElement | null>(null)
const setDesktop = (el: unknown) => {
  desktopPanel.value = (el as HTMLElement | null) ?? null
}
const setMobile = (el: unknown) => {
  mobilePanel.value = (el as HTMLElement | null) ?? null
}

const highlight = computed(() => goo.value.highlight)
const sideOf = () => props.side
useSidebarGoo({
  panel: desktopPanel,
  highlight,
  edge: computed(() => (props.collapsible === 'none' ? null : goo.value.edge)),
  side: sideOf,
  motion: () => state.value,
})
useSidebarGoo({ panel: mobilePanel, highlight, edge: computed(() => null), side: sideOf, motion: () => 0 })

const floating = computed(() => props.variant === 'floating' || props.variant === 'inset')

const wrapper = shallowRef<HTMLElement | null>(null)
const setWrapper = (el: unknown) => {
  wrapper.value = (el as HTMLElement | null) ?? null
}
const travel = useSidebarTravel({
  wrapper,
  on: () => goo.value.travel,
  state: () => state.value,
  collapsible: () => props.collapsible,
  floating: () => floating.value,
  preset: () => goo.value.preset,
  speed: () => goo.value.speed,
  reducedMotion: () => goo.value.reducedMotion,
})
// An offcanvas sidebar lands past its screen edge for a moment: the panel's own color covers
// the gap there (off-screen at rest).
const cover = computed(() =>
  travel.value && props.variant === 'sidebar' ? { boxShadow: `${props.side === 'left' ? -32 : 32}px 0 0 0 var(--sidebar)` } : undefined,
)
</script>

<template>
  <div
    v-if="collapsible === 'none'"
    :ref="setDesktop"
    data-slot="sidebar"
    data-sidebar="sidebar"
    :data-goop-sidebar="goo.highlight || goo.pill ? '' : undefined"
    :class="cn('bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col', props.class)"
    v-bind="$attrs"
  >
    <slot />
  </div>

  <GoopDrawer
    v-else-if="isMobile && goo.drawer"
    :open="openMobile"
    :direction="side"
    v-bind="$attrs"
    @update:open="setOpenMobile"
  >
    <GoopDrawerContent
      data-sidebar="sidebar"
      data-slot="sidebar"
      data-mobile="true"
      :speed="goo.speed"
      :preset="goo.preset"
      :class="
        cn(
          'text-sidebar-foreground gap-0 p-0 [--goop-color:var(--sidebar)]',
          'data-[vaul-drawer-direction=left]:w-(--sidebar-width) data-[vaul-drawer-direction=right]:w-(--sidebar-width)',
        )
      "
      :style="{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }"
    >
      <GoopDrawerHeader class="sr-only">
        <GoopDrawerTitle>Sidebar</GoopDrawerTitle>
        <GoopDrawerDescription>Displays the mobile sidebar.</GoopDrawerDescription>
      </GoopDrawerHeader>
      <div
        :ref="setMobile"
        data-sidebar="sidebar"
        :data-goop-sidebar="goo.highlight || goo.pill ? '' : undefined"
        class="flex h-full w-full flex-col"
      >
        <slot />
      </div>
    </GoopDrawerContent>
  </GoopDrawer>

  <GoopSheet v-else-if="isMobile" :open="openMobile" v-bind="$attrs" @update:open="setOpenMobile">
    <GoopSheetContent
      data-sidebar="sidebar"
      data-slot="sidebar"
      data-mobile="true"
      :side="side"
      :goo="goo.bloom"
      :show-close-button="false"
      :speed="goo.speed"
      :preset="goo.preset"
      :class="cn('text-sidebar-foreground w-(--sidebar-width) gap-0 p-0', goo.bloom ? '[--goop-color:var(--sidebar)]' : 'bg-sidebar')"
      :style="{ '--sidebar-width': SIDEBAR_WIDTH_MOBILE }"
    >
      <GoopSheetHeader class="sr-only">
        <GoopSheetTitle>Sidebar</GoopSheetTitle>
        <GoopSheetDescription>Displays the mobile sidebar.</GoopSheetDescription>
      </GoopSheetHeader>
      <div
        :ref="setMobile"
        data-sidebar="sidebar"
        :data-goop-sidebar="goo.highlight || goo.pill ? '' : undefined"
        class="flex h-full w-full flex-col"
      >
        <slot />
      </div>
    </GoopSheetContent>
  </GoopSheet>

  <div
    v-else
    class="group peer text-sidebar-foreground hidden md:block"
    :ref="setWrapper"
    data-slot="sidebar"
    :data-state="state"
    :data-collapsible="state === 'collapsed' ? collapsible : ''"
    :data-variant="variant"
    :data-side="side"
  >
    <!-- This is what handles the sidebar gap on desktop -->
    <div
      :class="
        cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          floating
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )
      "
      :style="travel ?? undefined"
    />
    <div
      :class="
        cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          floating
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          props.class,
        )
      "
      :style="travel ?? undefined"
      v-bind="$attrs"
    >
      <div
        :ref="setDesktop"
        data-sidebar="sidebar"
        :data-goop-sidebar="goo.highlight || goo.pill ? '' : undefined"
        :style="cover"
        class="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

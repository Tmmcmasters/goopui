<script setup lang="ts">
// GoopDropdownMenuContent: shadcn-vue's DropdownMenuContent (reka-ui DropdownMenuContent in
// a portal, same props/emits, `class` merge, align start / sideOffset 4) whose panel oozes out
// of the trigger with core's emerge engine (exactly like GoopPopoverContent), and whose item
// highlight is a goo blob (core `attachMenuHighlight`) that slides between items, follows
// keyboard focus, and squishes when an item is selected.
//
// Goo layout: the panel (reka content) holds the aria-hidden emerge surface and a scroller
// (shadcn's max-height and overflow move onto it) around the item list (shadcn's padding; it
// holds the highlight and clips its goo), so the goo bridge can leave the panel, the
// background never scrolls away, and the blob never adds scroll overflow. With `:goo="false"` it is exactly
// shadcn's DropdownMenuContent. Reduced motion: plain open/close, the blob snaps, no pop.
import { cn } from 'cn'
import type { DropdownMenuContentEmits, DropdownMenuContentProps } from 'reka-ui'
import { DropdownMenuContent, DropdownMenuPortal, injectDropdownMenuRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { MENU_PROP_KEYS, resolveMenuProps, toMenuOptions, type GoopMenuProps } from '../../goop-props'
import { provideGoopMenuContent } from './context'
import { useMenuGoo } from './use-menu-goo'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<DropdownMenuContentProps & GoopMenuProps & { class?: HTMLAttributes['class'] }>(), {
  align: 'start',
  sideOffset: 4,
  goo: undefined,
  bridge: undefined,
  wobble: undefined,
  momentum: undefined,
  fade: undefined,
  openSlosh: undefined,
  openDrips: undefined,
  openDripAmount: undefined,
  openDripSize: undefined,
  openDripFling: undefined,
  openDripVariety: undefined,
  closeSlosh: undefined,
  highlight: undefined,
  pop: undefined,
  submenus: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<DropdownMenuContentEmits>()

const OWN = new Set<string>(['class', ...MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as DropdownMenuContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectDropdownMenuRootContext()
const config = useGoopConfig()
const menu = computed(() => resolveMenuProps(props))
const options = computed(() => toMenuOptions(menu.value, config))

const SHADCN =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 cn-menu-translucent z-50 max-h-(--reka-dropdown-menu-content-available-height) w-(--reka-dropdown-menu-trigger-width) origin-(--reka-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto data-[state=closed]:overflow-hidden'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit.
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] min-w-32 rounded-lg z-50 max-h-(--reka-dropdown-menu-content-available-height) w-(--reka-dropdown-menu-trigger-width) flex flex-col outline-hidden'
const SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-x-hidden overflow-y-auto'
// The highlight blob's goo layer overshoots the items; `overflow: clip` (not a scroll
// container) keeps that overshoot out of SCROLL's scrollable overflow, so a short menu never
// grows a scrollbar or scrolls while the blob moves or pops.
const LIST = 'relative overflow-clip p-1'

const classes = computed(() => cn(menu.value.goo ? GOO : SHADCN, props.class))

const surface = useTemplateRef<HTMLElement>('surface')
const list = useTemplateRef<HTMLElement>('list')
const goo = useMenuGoo({
  surface,
  list,
  open: () => root.open.value,
  anchor: () => root.triggerElement.value,
  emerge: computed(() => options.value.emerge),
  highlight: computed(() => options.value.highlight),
  close: () => root.onOpenChange(false),
})

provideGoopMenuContent({
  menu,
  blob: computed(() => options.value.highlight !== null),
  select: goo.select,
  colors: () => goo.emerge.value?.colors ?? null,
})

defineExpose({
  /** The live emerge handle (null before mount / when goo is off). */
  get handle() {
    return goo.emerge.value
  },
  /** The live highlight handle (null when goo or highlight is off). */
  get highlight() {
    return goo.highlight.value
  },
})
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      data-slot="dropdown-menu-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <template v-if="menu.goo">
        <span
          ref="surface"
          data-goop="surface"
          aria-hidden="true"
          style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
        />
        <div
          data-slot="dropdown-menu-scroll"
          :class="SCROLL"
        >
          <div
            ref="list"
            data-slot="dropdown-menu-list"
            :class="LIST"
          >
            <slot />
          </div>
        </div>
      </template>
      <slot v-else />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>

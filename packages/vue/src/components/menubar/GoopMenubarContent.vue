<script setup lang="ts">
// GoopMenubarContent: shadcn-vue's MenubarContent (reka-ui MenubarContent in a portal, same
// props, `class` merge, align start / alignOffset -4 / sideOffset 8) with
// GoopDropdownMenuContent's goo: the menu blooms open with core's emerge engine (pools from
// its center, spreads with a lobed edge, overshoots and splashes, drops kept off the bar), and
// its item highlight is a goo blob (core `attachMenuHighlight`) that glides between items,
// follows keyboard focus and squishes when an item is selected. Engine props left unset
// inherit the GoopMenubar's `goo`, `wobble`, `momentum`, `speed`, `preset` and `renderer`.
// Surface defaults to 'popover'.
//
// Goo layout as in GoopDropdownMenuContent (surface + scroller + item list). With
// `:goo="false"` it is exactly shadcn's MenubarContent. Reduced motion: plain open/close, the
// blob snaps, no pop.
import { cn } from 'cn'
import type { MenubarContentProps } from 'reka-ui'
import { MenubarContent, MenubarPortal, injectMenubarMenuContext, injectMenubarRootContext, useForwardProps } from 'reka-ui'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { MENUBAR_MENU_PROP_KEYS, resolveMenubarMenuProps, toMenubarMenuOptions, type GoopMenubarMenuProps } from '../../goop-props'
import { provideGoopMenuContent } from '../dropdown-menu/context'
import { useMenuGoo } from '../dropdown-menu/use-menu-goo'
import { injectGoopMenubar } from './context'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<MenubarContentProps & GoopMenubarMenuProps & { class?: HTMLAttributes['class'] }>(), {
  align: 'start',
  alignOffset: -4,
  sideOffset: 8,
  goo: undefined,
  flow: undefined,
  flowStyle: undefined,
  bloomStart: undefined,
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
  sloshVariety: undefined,
  closeSlosh: undefined,
  highlight: undefined,
  pop: undefined,
  followPointer: undefined,
  submenus: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})

const OWN = new Set<string>(['class', ...MENUBAR_MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as MenubarContentProps)
const forwarded = useForwardProps(delegated)

const root = injectMenubarRootContext()
const menuCtx = injectMenubarMenuContext()
const bar = injectGoopMenubar()
const config = useGoopConfig()
const menu = computed(() => resolveMenubarMenuProps(props, null, bar?.bar.value))
const options = computed(() => toMenubarMenuOptions(menu.value, config))
const open = computed(() => root.modelValue.value === menuCtx.value)

const SHADCN =
  'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg p-1 shadow-md ring-1 duration-100 cn-menu-target cn-menu-translucent z-50 origin-(--reka-menubar-content-transform-origin) overflow-hidden'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit.
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] min-w-36 rounded-lg z-50 max-h-(--reka-menubar-content-available-height) flex flex-col outline-hidden'
const SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-x-hidden overflow-y-auto'
// `overflow: clip` keeps the highlight blob's goo overshoot out of SCROLL's scroll overflow.
const LIST = 'relative overflow-clip p-1'

const classes = computed(() => cn(menu.value.goo ? GOO : SHADCN, props.class))

const surface = useTemplateRef<HTMLElement>('surface')
const list = useTemplateRef<HTMLElement>('list')
const goo = useMenuGoo({
  surface,
  list,
  open: () => open.value,
  anchor: () => menuCtx.triggerElement.value,
  emerge: computed(() => options.value.emerge),
  highlight: computed(() => options.value.highlight),
  close: () => root.onMenuClose(),
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
  <MenubarPortal>
    <MenubarContent
      data-slot="menubar-content"
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
          data-slot="menubar-scroll"
          :class="SCROLL"
        >
          <div
            ref="list"
            data-slot="menubar-list"
            :class="LIST"
          >
            <slot />
          </div>
        </div>
      </template>
      <slot v-else />
    </MenubarContent>
  </MenubarPortal>
</template>

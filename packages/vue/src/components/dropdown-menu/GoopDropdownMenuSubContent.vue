<script setup lang="ts">
// GoopDropdownMenuSubContent: shadcn-vue's DropdownMenuSubContent (same props/emits, `class`
// merge). The submenu emerges from its GoopDropdownMenuSubTrigger row with the same emerge
// bridge as the root panel, and has its own goo highlight. Engine props left unset inherit
// from the parent menu; the parent's `:submenus="false"` (or `:goo="false"`) makes this a
// plain shadcn submenu.
import { cn } from 'cn'
import type { DropdownMenuSubContentEmits, DropdownMenuSubContentProps } from 'reka-ui'
import { DropdownMenuSubContent, injectDropdownMenuRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, ref, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { MENU_PROP_KEYS, resolveMenuProps, toMenuOptions, type GoopMenuProps } from '../../goop-props'
import { injectGoopMenuContent, injectGoopMenuSub, provideGoopMenuContent } from './context'
import { useMenuGoo } from './use-menu-goo'

const props = withDefaults(defineProps<DropdownMenuSubContentProps & GoopMenuProps & { class?: HTMLAttributes['class'] }>(), {
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
  closeSlosh: undefined,
  highlight: undefined,
  pop: undefined,
  submenus: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<DropdownMenuSubContentEmits>()

const OWN = new Set<string>(['class', ...MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as DropdownMenuSubContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectDropdownMenuRootContext()
const parent = injectGoopMenuContent()
const sub = injectGoopMenuSub()
const config = useGoopConfig()
const menu = computed(() => {
  const inherited = parent?.menu.value
  const m = resolveMenuProps(props, inherited)
  if (props.goo === undefined && inherited && !inherited.submenus) m.goo = false
  return m
})
const options = computed(() => toMenuOptions(menu.value, config))

const SHADCN =
  'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-lg p-1 shadow-lg ring-1 duration-100 cn-menu-translucent z-50 max-w-(--reka-dropdown-menu-content-available-width) origin-(--reka-dropdown-menu-content-transform-origin) overflow-hidden'
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] min-w-[96px] rounded-lg z-50 max-w-(--reka-dropdown-menu-content-available-width) flex flex-col outline-hidden'
const SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-hidden'
// The highlight blob's goo layer overshoots the items; `overflow: clip` (not a scroll
// container) keeps that overshoot out of SCROLL's scrollable overflow, so a short menu never
// grows a scrollbar or scrolls while the blob moves or pops.
const LIST = 'relative overflow-clip p-1'

const classes = computed(() => cn(menu.value.goo ? GOO : SHADCN, props.class))

const surface = useTemplateRef<HTMLElement>('surface')
const list = useTemplateRef<HTMLElement>('list')
const fallbackOpen = ref(true)
const goo = useMenuGoo({
  surface,
  list,
  open: () => (sub ?? { open: fallbackOpen }).open.value,
  anchor: () => sub?.trigger.value,
  // A submenu without its own `surface` reuses the parent panel's resolved colors.
  emerge: computed(() =>
    props.surface === undefined && parent ? { ...options.value.emerge, surfaceColor: () => parent.colors() } : options.value.emerge,
  ),
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
  get handle() {
    return goo.emerge.value
  },
  get highlight() {
    return goo.highlight.value
  },
})
</script>

<template>
  <DropdownMenuSubContent
    data-slot="dropdown-menu-sub-content"
    v-bind="forwarded"
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
  </DropdownMenuSubContent>
</template>

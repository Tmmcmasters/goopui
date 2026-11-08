<script setup lang="ts">
// GoopMenubarSubContent: shadcn-vue's MenubarSubContent (in a MenubarPortal, same
// props/emits, `class` merge). The submenu emerges from its GoopMenubarSubTrigger row with the
// same goo as the menu, and has its own goo highlight. Engine props left unset inherit from
// the parent menu; the parent's `:submenus="false"` (or `:goo="false"`) makes this a plain
// shadcn submenu.
import { cn } from 'cn'
import type { MenubarSubContentEmits, MenubarSubContentProps } from 'reka-ui'
import { MenubarPortal, MenubarSubContent, injectMenubarRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, ref, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { MENUBAR_MENU_PROP_KEYS, resolveMenubarMenuProps, toMenubarMenuOptions, type GoopMenubarMenuProps } from '../../goop-props'
import { injectGoopMenuContent, injectGoopMenuSub, provideGoopMenuContent } from '../dropdown-menu/context'
import { useMenuGoo } from '../dropdown-menu/use-menu-goo'
import { injectGoopMenubar } from './context'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<MenubarSubContentProps & GoopMenubarMenuProps & { class?: HTMLAttributes['class'] }>(), {
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
const emits = defineEmits<MenubarSubContentEmits>()

const OWN = new Set<string>(['class', ...MENUBAR_MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as MenubarSubContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectMenubarRootContext()
const parent = injectGoopMenuContent()
const sub = injectGoopMenuSub()
const bar = injectGoopMenubar()
const config = useGoopConfig()
const menu = computed(() => {
  const inherited = parent?.menu.value
  const m = resolveMenubarMenuProps(props, inherited, bar?.bar.value)
  if (props.goo === undefined && inherited && !inherited.submenus) m.goo = false
  return m
})
const options = computed(() => toMenubarMenuOptions(menu.value, config))

const SHADCN =
  'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-32 rounded-lg p-1 shadow-lg ring-1 duration-100 cn-menu-target cn-menu-translucent z-50 origin-(--reka-menubar-content-transform-origin) overflow-hidden'
const GOO = 'text-popover-foreground [--goop-color:var(--popover)] min-w-32 rounded-lg z-50 flex flex-col outline-hidden'
const SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-hidden'
// `overflow: clip` keeps the highlight blob's goo overshoot out of SCROLL's scroll overflow.
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
  close: () => root.onMenuClose(),
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
  <MenubarPortal>
    <MenubarSubContent
      data-slot="menubar-sub-content"
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
    </MenubarSubContent>
  </MenubarPortal>
</template>

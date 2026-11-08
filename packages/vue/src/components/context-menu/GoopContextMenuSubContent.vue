<script setup lang="ts">
// GoopContextMenuSubContent: shadcn-vue's ContextMenuSubContent (same props/emits, `class`
// merge). The submenu blooms out of its GoopContextMenuSubTrigger row (core clamps the row's
// center onto the submenu's near edge) and shrinks back into it, with its own goo highlight.
// Engine props left unset inherit from the parent menu; the parent's `:submenus="false"` (or
// `:goo="false"`) makes this a plain shadcn submenu. `bloomFrom="center"`: from its center.
import { cn } from 'cn'
import type { ContextMenuSubContentEmits, ContextMenuSubContentProps } from 'reka-ui'
import { ContextMenuSubContent, injectContextMenuRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, ref, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import {
  CONTEXT_MENU_PROP_KEYS,
  resolveContextMenuProps,
  toContextMenuOptions,
  type GoopContextMenuProps,
  type ResolvedContextMenuProps,
} from '../../goop-props'
import { injectGoopMenuContent, injectGoopMenuSub, provideGoopMenuContent } from '../dropdown-menu/context'
import { useMenuGoo } from '../dropdown-menu/use-menu-goo'

const props = withDefaults(defineProps<ContextMenuSubContentProps & GoopContextMenuProps & { class?: HTMLAttributes['class'] }>(), {
  goo: undefined,
  bloomStart: undefined,
  bloomFrom: undefined,
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
const emits = defineEmits<ContextMenuSubContentEmits>()

const OWN = new Set<string>(['class', ...CONTEXT_MENU_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as ContextMenuSubContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectContextMenuRootContext()
const parent = injectGoopMenuContent()
const sub = injectGoopMenuSub()
const config = useGoopConfig()
const menu = computed(() => {
  const inherited = parent?.menu.value as ResolvedContextMenuProps | undefined
  const m = resolveContextMenuProps(props, inherited)
  if (props.goo === undefined && inherited && !inherited.submenus) m.goo = false
  return m
})
const options = computed(() => toContextMenuOptions(menu.value, config))

const SHADCN =
  'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 border bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-lg duration-100 cn-menu-target cn-menu-translucent z-50 origin-(--reka-context-menu-content-transform-origin) overflow-hidden'
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
  close: () => root.onOpenChange(false),
  origin: () => (menu.value.bloomFrom === 'center' ? null : sub?.trigger.value),
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
  <ContextMenuSubContent
    data-slot="context-menu-sub-content"
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
        data-slot="context-menu-scroll"
        :class="SCROLL"
      >
        <div
          ref="list"
          data-slot="context-menu-list"
          :class="LIST"
        >
          <slot />
        </div>
      </div>
    </template>
    <slot v-else />
  </ContextMenuSubContent>
</template>

<script setup lang="ts">
// GoopComboboxList: shadcn-vue's ComboboxList (reka-ui ComboboxContent in a portal, same
// props/emits, `class` merge, popper below the anchor, align start, sideOffset 4) whose list
// blooms open like GoopSelectContent's popper (core `attachEmerge`, the bloom from its own
// center) and whose item highlight is the menu's goo blob (core `attachMenuHighlight`, found
// with `findCommandHighlight` so items filtered out by the search are skipped). Choosing an
// item squishes the blob, sets the value right away (its check mark plops in) and closes once
// the pop has played.
//
// Goo layout (as GoopDropdownMenuContent): the panel holds the aria-hidden emerge surface and a
// scroller around the item list (it holds the highlight and clips its goo). With
// `:goo="false"` it is exactly shadcn's ComboboxList. Reduced motion: plain open/close, the
// blob snaps, no pop, no plop.
import { findCommandHighlight } from '@goopui/core'
import { cn } from 'cn'
import type { ComboboxContentEmits, ComboboxContentProps } from 'reka-ui'
import { ComboboxContent, ComboboxPortal, injectComboboxRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { COMBOBOX_PROP_KEYS, resolveComboboxProps, toComboboxOptions, type GoopComboboxProps } from '../../goop-props'
import { useMenuGoo } from '../dropdown-menu/use-menu-goo'
import { injectGoopComboboxRoot, provideGoopComboboxList } from './context'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<ComboboxContentProps & GoopComboboxProps & { class?: HTMLAttributes['class'] }>(), {
  position: 'popper',
  align: 'start',
  sideOffset: 4,
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
  plop: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<ComboboxContentEmits>()

const OWN = new Set<string>(['class', ...COMBOBOX_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as ComboboxContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectComboboxRootContext()
const goopRoot = injectGoopComboboxRoot()
const config = useGoopConfig()
const combobox = computed(() => resolveComboboxProps(props))
const options = computed(() => toComboboxOptions(combobox.value, config))

const SHADCN =
  'z-50 w-[200px] rounded-md border bg-popover text-popover-foreground origin-(--reka-combobox-content-transform-origin) overflow-hidden shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit, and no
// overflow on the panel (the goo pokes past it while it blooms).
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] z-50 w-[200px] rounded-md flex flex-col outline-none max-h-(--reka-combobox-content-available-height)'
const SCROLL = 'min-h-0 flex-1 rounded-[inherit] overflow-x-hidden overflow-y-auto max-h-72'
const LIST = 'relative overflow-clip'

const classes = computed(() => cn(combobox.value.goo ? GOO : SHADCN, props.class))

const surface = useTemplateRef<HTMLElement>('surface')
const list = useTemplateRef<HTMLElement>('list')
const goo = useMenuGoo({
  surface,
  list,
  open: () => root.open.value,
  anchor: () => goopRoot?.anchor.value ?? root.parentElement?.value ?? null,
  emerge: computed(() => options.value.emerge),
  highlight: computed(() =>
    options.value.highlight ? { ...options.value.highlight, find: findCommandHighlight as (c: HTMLElement) => Element | null } : null,
  ),
  close: () => root.onOpenChange(false),
})

provideGoopComboboxList({
  blob: computed(() => options.value.highlight !== null),
  plop: computed(() => options.value.plop),
  select: (event, opts) => goo.select(event, opts),
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
  <ComboboxPortal>
    <ComboboxContent
      data-slot="combobox-list"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <template v-if="combobox.goo">
        <span
          ref="surface"
          data-goop="surface"
          aria-hidden="true"
          style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
        />
        <div
          data-slot="combobox-scroll"
          :class="SCROLL"
        >
          <div
            ref="list"
            data-slot="combobox-items"
            :class="LIST"
          >
            <slot />
          </div>
        </div>
      </template>
      <slot v-else />
    </ComboboxContent>
  </ComboboxPortal>
</template>

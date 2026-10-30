<script setup lang="ts">
// GoopSelectContent: shadcn-vue's SelectContent (reka-ui SelectContent in a portal, same
// props/emits, `class` merge, `position` default 'item-aligned', scroll buttons, viewport) whose
// listbox blooms open with core's emerge engine and whose item highlight is the menu's goo blob
// (exactly like GoopDropdownMenuContent). With `position="item-aligned"` the list is laid over
// the trigger and blooms out of the selected item (`bloomFrom`); a popper list blooms from its
// own center like a menu. Choosing an item squishes the
// blob, sets the value at once (so its check mark plops in), and closes once the pop played.
//
// Goo layout: the panel (reka content) holds the aria-hidden emerge surface, the scroll
// buttons and reka's viewport (the scroller) around the item list (it holds the highlight and
// clips its goo with `overflow: clip`, so the blob never adds scroll overflow; shadcn's padding
// is on the groups). With `:goo="false"` it is exactly shadcn's SelectContent. Reduced motion: plain
// open/close, the blob snaps, no pop, no plop.
import { EMERGE_CLOSE_VAR, findSelectOrigin, selectBloomsFromItem } from '@goopui/core'
import { cn } from 'cn'
import type { SelectContentEmits, SelectContentProps } from 'reka-ui'
import { SelectContent, SelectPortal, SelectViewport, injectSelectRootContext, useForwardPropsEmits } from 'reka-ui'
import { computed, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { SELECT_PROP_KEYS, resolveSelectProps, toSelectOptions, type GoopSelectProps } from '../../goop-props'
import { useMenuGoo } from '../dropdown-menu/use-menu-goo'
import { provideGoopSelectContent } from './context'
import GoopSelectScrollDownButton from './GoopSelectScrollDownButton.vue'
import GoopSelectScrollUpButton from './GoopSelectScrollUpButton.vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<SelectContentProps & GoopSelectProps & { class?: HTMLAttributes['class'] }>(), {
  position: 'item-aligned',
  align: 'center',
  goo: undefined,
  flow: undefined,
  flowStyle: undefined,
  bloomStart: undefined,
  bloomFrom: undefined,
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
  plop: undefined,
  surface: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<SelectContentEmits>()

const OWN = new Set<string>(['class', ...SELECT_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as SelectContentProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const root = injectSelectRootContext()
const config = useGoopConfig()
const select = computed(() => resolveSelectProps(props))
const options = computed(() => toSelectOptions(select.value, config))
const popper = computed(() => props.position === 'popper')

const POPPER = 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1'
const SHADCN =
  'bg-popover text-popover-foreground data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 min-w-36 rounded-lg shadow-md ring-1 duration-100 data-[side=inline-start]:slide-in-from-right-2 data-[side=inline-end]:slide-in-from-left-2 cn-menu-target cn-menu-translucent relative z-50 max-h-(--reka-select-content-available-height) origin-(--reka-select-content-transform-origin) overflow-x-hidden overflow-y-auto data-[align-trigger=true]:animate-none'
// The goo paints the background (popover color), ring and shadow; no CSS enter/exit, and no
// overflow on the panel (the goo pokes past it while it blooms).
const GOO =
  'text-popover-foreground [--goop-color:var(--popover)] min-w-36 rounded-lg relative z-50 max-h-(--reka-select-content-available-height) outline-hidden'
const VIEWPORT =
  'data-[position=popper]:h-(--reka-select-trigger-height) data-[position=popper]:w-full data-[position=popper]:min-w-(--reka-select-trigger-width)'
// The highlight blob's goo layer overshoots the items; `overflow: clip` (not a scroll
// container) keeps that overshoot out of the viewport's scrollable overflow.
const LIST = 'relative overflow-clip'

const classes = computed(() => cn(select.value.goo ? GOO : SHADCN, popper.value && POPPER, props.class))
// The panel no longer clips: the scroll buttons' popover bg keeps to its rounded corners.
const scrollUp = computed(() => (select.value.goo ? 'rounded-t-[inherit]' : undefined))
const scrollDown = computed(() => (select.value.goo ? 'rounded-b-[inherit]' : undefined))

/** Placed: reka parks a popper at translate(0, -200%) until floating-ui has placed it, and
 *  sizes an item-aligned list's fixed wrapper once it has measured the trigger. */
const placed = (host: HTMLElement) => {
  const wrap = host.parentElement
  if (!wrap) return true
  if (wrap.hasAttribute('data-reka-popper-content-wrapper')) return !wrap.style.transform.includes('-200%')
  return wrap.style.height !== ''
}

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
  ready: placed,
  origin: () =>
    list.value && selectBloomsFromItem(props.position, select.value.bloomFrom) ? findSelectOrigin(list.value) : null,
})

// An item-aligned list sits in reka's plain fixed wrapper, which is the node reka's Presence
// watches (a popper's wrapper hands Presence the panel itself). Mirror the close duration onto
// it so goop.css's hold keeps the list mounted until the goo has shrunk back. Registered after
// useMenuGoo's watcher, so the emerge close has set the duration; before render, so the hold
// is in place when data-state flips and Presence reads the animation.
watch(
  () => root.open.value,
  (open) => {
    const host = surface.value?.parentElement
    const wrap = host?.parentElement
    if (open || !host || !wrap || popper.value) return
    const ms = host.style.getPropertyValue(EMERGE_CLOSE_VAR)
    if (ms) wrap.style.setProperty(EMERGE_CLOSE_VAR, ms)
  },
)

provideGoopSelectContent({
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
  <SelectPortal>
    <SelectContent
      data-slot="select-content"
      :data-align-trigger="position === 'item-aligned'"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="classes"
    >
      <span
        v-if="select.goo"
        ref="surface"
        data-goop="surface"
        aria-hidden="true"
        style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
      />
      <GoopSelectScrollUpButton :class="scrollUp" />
      <SelectViewport
        :data-position="position"
        :class="VIEWPORT"
      >
        <div
          v-if="select.goo"
          ref="list"
          data-slot="select-list"
          :class="LIST"
        >
          <slot />
        </div>
        <slot v-else />
      </SelectViewport>
      <GoopSelectScrollDownButton :class="scrollDown" />
    </SelectContent>
  </SelectPortal>
</template>

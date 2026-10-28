<script setup lang="ts">
// GoopTabsList: shadcn-vue's TabsList (reka-ui TabsList, `variant`, `class` merge, `asChild`)
// whose active-tab background is a goo blob (core `attachTabsIndicator`, the menu highlight
// engine fed TABS_FEEL). It slides between triggers with momentum, stretches with fat neck
// lumps while travelling and lands with a jelly overshoot; it follows clicks and keyboard
// (it tracks the trigger with `data-state="active"`). The blob is aria-hidden, behind the
// real triggers. Toggles: `indicator`, `wobble`, `momentum`; `:goo="false"` is plain shadcn.
// The `line` variant keeps shadcn's underline (no blob). Reduced motion: the blob snaps.
// Browser-only: SSR renders shadcn markup, and goop.css styles the active trigger until the
// blob attaches.
import { attachTabsIndicator, type MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import type { TabsListProps } from 'reka-ui'
import { TabsList } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type ComponentPublicInstance, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { TABS_PROP_KEYS, toTabsOptions, type GoopTabsProps } from '../../goop-props'
import { provideGoopTabsList } from './context'
import { tabsListVariants, type TabsListVariants } from './variants'

const props = withDefaults(
  defineProps<
    TabsListProps &
      GoopTabsProps & {
        class?: HTMLAttributes['class']
        variant?: TabsListVariants['variant']
      }
  >(),
  {
    variant: 'default',
    goo: undefined,
    indicator: undefined,
    wobble: undefined,
    momentum: undefined,
    speed: undefined,
    preset: undefined,
    renderer: undefined,
  },
)

const OWN = new Set<string>(['class', 'variant', ...TABS_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as TabsListProps)

const config = useGoopConfig()
const options = computed(() => (props.variant === 'line' ? null : toTabsOptions(props, config)))
const blob = computed(() => options.value !== null)
provideGoopTabsList({ blob })

const el = shallowRef<HTMLElement | null>(null)
const setEl = (c: Element | ComponentPublicInstance | null) => {
  const node = c && '$el' in c ? (c.$el as unknown) : c
  el.value = node instanceof HTMLElement ? node : null
}
const handle = shallowRef<MenuHighlightHandle | null>(null)

const detach = () => {
  handle.value?.destroy()
  handle.value = null
}
const sync = () => {
  const list = el.value
  const opts = options.value
  if (!list || !opts) return detach()
  if (handle.value) handle.value.update(opts)
  else handle.value = attachTabsIndicator(list, opts)
}
watch(el, () => {
  detach()
  sync()
}, { flush: 'post' })
watch(options, sync, { flush: 'post' })
onBeforeUnmount(detach)

defineExpose({
  /** The live indicator handle (null before mount / when the goo indicator is off). */
  get handle() {
    return handle.value
  },
})
</script>

<template>
  <TabsList
    :ref="setEl"
    data-slot="tabs-list"
    :data-variant="variant"
    :data-goop-tabs="blob ? '' : undefined"
    v-bind="delegated"
    :class="cn(tabsListVariants({ variant }), props.class)"
  >
    <slot />
  </TabsList>
</template>

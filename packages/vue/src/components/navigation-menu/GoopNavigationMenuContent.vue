<script setup lang="ts">
// GoopNavigationMenuContent: shadcn-vue's NavigationMenuContent (reka-ui NavigationMenuContent,
// same props/emits, `class` merge, `asChild`). Inside a goo GoopNavigationMenu:
//   - its links' hover / focus background is one goo blob that glides between them (the menu
//     highlight's feel, `contentHighlight`);
//   - in the shared viewport it keeps shadcn's slide between panels; the viewport's goo is
//     the background;
//   - with `:viewport="false"` the panel itself blooms out of its trigger (the hover card's
//     emerge engine) and shrinks back into it on close.
import {
  NAVIGATION_MENU_SCOPE_ATTR,
  attachEmerge,
  attachNavigationMenuHighlight,
  type EmergeHandle,
  type MenuHighlightHandle,
} from '@goopui/core'
import { cn } from 'cn'
import type { NavigationMenuContentEmits, NavigationMenuContentProps } from 'reka-ui'
import { NavigationMenuContent, injectNavigationMenuContext, injectNavigationMenuItemContext, useForwardPropsEmits } from 'reka-ui'
import { computed, onBeforeUnmount, shallowRef, watch, type HTMLAttributes } from 'vue'
import { injectGoopNavigationMenu, provideGoopNavigationMenuContent } from './context'
import { NAVIGATION_MENU_CONTENT, NAVIGATION_MENU_CONTENT_GOO, NAVIGATION_MENU_CONTENT_GOO_INLINE } from './variants'

const props = defineProps<NavigationMenuContentProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<NavigationMenuContentEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

provideGoopNavigationMenuContent()
const root = injectGoopNavigationMenu()
const menu = injectNavigationMenuContext()
const itemCtx = injectNavigationMenuItemContext()
const bloom = computed(() => root?.goo.value.viewport ?? null)
/** 'viewport': inside the goo viewport; 'inline': a `viewport: false` panel that blooms itself. */
const mode = computed(() => (!bloom.value ? 'plain' : root?.viewport.value === false ? 'inline' : 'viewport'))
const classes = computed(() =>
  cn(mode.value === 'viewport' ? NAVIGATION_MENU_CONTENT_GOO : mode.value === 'inline' ? NAVIGATION_MENU_CONTENT_GOO_INLINE : NAVIGATION_MENU_CONTENT, props.class),
)
const scope = computed(() => (root ? { [NAVIGATION_MENU_SCOPE_ATTR]: '' } : {}))
const open = computed(() => menu.modelValue.value === itemCtx.value)

// reka teleports the content into the viewport: a hidden marker finds the content element.
const marker = shallowRef<HTMLElement | null>(null)
const content = computed(() => marker.value?.parentElement ?? null)
const surface = shallowRef<HTMLElement | null>(null)

const highlight = shallowRef<MenuHighlightHandle | null>(null)
const syncHighlight = () => {
  const el = content.value
  const opts = root?.goo.value.contentHighlight ?? null
  if (!el || !opts) {
    highlight.value?.destroy()
    highlight.value = null
    return
  }
  if (highlight.value) highlight.value.update(opts)
  else highlight.value = attachNavigationMenuHighlight(el, opts)
}
watch(content, () => {
  highlight.value?.destroy()
  highlight.value = null
  syncHighlight()
}, { flush: 'post' })
watch(() => root?.goo.value.contentHighlight, syncHighlight, { flush: 'post' })

const emerge = shallowRef<EmergeHandle | null>(null)
const trigger = () => menu.activeTrigger.value ?? content.value?.parentElement?.querySelector('[data-navigation-menu-trigger]') ?? null
const detachEmerge = () => {
  emerge.value?.destroy()
  emerge.value = null
}
watch(surface, (el) => {
  detachEmerge()
  const host = el?.parentElement
  const opts = bloom.value
  if (!el || !host || !opts) return
  const { jelly: _jelly, target: _target, jellyFeel: _feel, ...rest } = opts
  emerge.value = attachEmerge(host, { ...rest, surface: el, side: 'bottom', anchor: trigger, bloomOrigin: trigger })
  if (open.value) emerge.value.open()
}, { flush: 'post' })
watch(bloom, (next) => {
  if (!next) return
  const { jelly: _jelly, target: _target, jellyFeel: _feel, ...rest } = next
  emerge.value?.update(rest)
}, { flush: 'post' })
watch(open, (o) => {
  if (o) emerge.value?.open()
  else emerge.value?.close()
})

onBeforeUnmount(() => {
  highlight.value?.destroy()
  highlight.value = null
  detachEmerge()
})
</script>

<template>
  <NavigationMenuContent
    data-slot="navigation-menu-content"
    v-bind="{ ...forwarded, ...scope }"
    :class="classes"
  >
    <span
      v-if="mode === 'inline'"
      ref="surface"
      data-goop="surface"
      aria-hidden="true"
      style="position: absolute; inset: 0; z-index: -1; pointer-events: none; border-radius: inherit"
    />
    <slot />
    <span
      v-if="root"
      ref="marker"
      hidden
      aria-hidden="true"
      data-goop="marker"
    />
  </NavigationMenuContent>
</template>

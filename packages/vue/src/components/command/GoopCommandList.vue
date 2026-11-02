<script setup lang="ts">
// GoopCommandList: shadcn-vue's CommandList (reka-ui ListboxContent, the scroller, `class`
// merge). Inside it, an item list holds the command's goo highlight (core
// `attachMenuHighlight`, the same blob as GoopDropdownMenu / GoopSelect): it glides between
// items as the arrow keys or the pointer move reka's highlight, stretches with momentum, and
// shrinks out when a filter hides the highlighted item (`findCommandHighlight`). The list
// clips the blob's overshoot (`overflow: clip`), so it never adds scroll overflow. Reduced
// motion: the blob snaps to the item.
import { attachMenuHighlight, findCommandHighlight } from '@goopui/core'
import { cn } from 'cn'
import type { ListboxContentProps } from 'reka-ui'
import { ListboxContent } from 'reka-ui'
import { computed, onBeforeUnmount, useTemplateRef, watch, type HTMLAttributes } from 'vue'
import { injectGoopCommand } from './context'

const props = defineProps<ListboxContentProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})

const command = injectGoopCommand()
const list = useTemplateRef<HTMLElement>('list')

const detach = () => {
  command.highlight.value?.destroy()
  command.highlight.value = null
}
const sync = () => {
  const el = list.value
  const opts = command.options.value.highlight
  if (!el || !opts) return detach()
  const full = { ...opts, find: findCommandHighlight as (c: HTMLElement) => Element | null }
  if (command.highlight.value) command.highlight.value.update(full)
  else command.highlight.value = attachMenuHighlight(el, full)
}
watch(list, () => {
  detach()
  sync()
}, { flush: 'post' })
watch(() => command.options.value.highlight, sync, { flush: 'post' })
// Filtering adds / removes items without touching data-highlighted: re-read the target.
watch(() => command.filterState.search, () => command.highlight.value?.refresh(), { flush: 'post' })
onBeforeUnmount(detach)
</script>

<template>
  <ListboxContent
    data-slot="command-list"
    v-bind="delegated"
    :class="cn('max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none', props.class)"
  >
    <div
      ref="list"
      role="presentation"
      data-slot="command-list-items"
      :class="command.options.value.highlight ? 'relative overflow-clip' : undefined"
    >
      <slot />
    </div>
  </ListboxContent>
</template>

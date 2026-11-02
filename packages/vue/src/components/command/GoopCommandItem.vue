<script setup lang="ts">
// GoopCommandItem: shadcn-vue's CommandItem (reka-ui ListboxItem, registers with the command's
// filter and hides when it doesn't match, clears the search on select, `class` merge,
// `asChild`). With the goo highlight on, the flat highlighted bg is dropped (the blob draws
// it) and choosing the item squishes the blob.
import { cn } from 'cn'
import type { ListboxItemEmits, ListboxItemProps } from 'reka-ui'
import { ListboxItem, useForwardPropsEmits, useId } from 'reka-ui'
import { computed, onMounted, onUnmounted, shallowRef, type HTMLAttributes } from 'vue'
import { injectGoopCommand, injectGoopCommandGroup } from './context'

/** shadcn's flat highlight, used when the goo blob is off. */
const FLAT_BG = 'data-highlighted:bg-accent'

const props = defineProps<ListboxItemProps & { class?: HTMLAttributes['class'] }>()
const emits = defineEmits<ListboxItemEmits>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const forwarded = useForwardPropsEmits(delegated, emits)

const id = useId()
const command = injectGoopCommand()
const group = injectGoopCommandGroup()

const isRender = computed(() => {
  if (!command.filterState.search) return true
  const score = command.filterState.filtered.items.get(id)
  if (score === undefined) return true
  return score > 0
})

const el = shallowRef<HTMLElement | null>(null)
const setEl = (v: unknown) => {
  const node = (v as { $el?: unknown } | null)?.$el
  el.value = node instanceof HTMLElement ? node : null
}
onMounted(() => {
  command.allItems.value.set(id, el.value?.textContent ?? props.value?.toString() ?? '')
  const groupId = group?.id
  if (!groupId) return
  const set = command.allGroups.value.get(groupId)
  if (set) set.add(id)
  else command.allGroups.value.set(groupId, new Set([id]))
})
onUnmounted(() => {
  command.allItems.value.delete(id)
})

const classes = computed(() =>
  cn(
    command.options.value.highlight ? '' : FLAT_BG,
    "data-highlighted:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    props.class,
  ),
)

const onSelect = () => {
  command.filterState.search = ''
  command.highlight.value?.pop()
}
</script>

<template>
  <ListboxItem
    v-if="isRender"
    v-bind="forwarded"
    :id="id"
    :ref="setEl"
    data-slot="command-item"
    :class="classes"
    @select="onSelect"
  >
    <slot />
  </ListboxItem>
</template>

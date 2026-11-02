<script setup lang="ts">
// GoopCommand: shadcn-vue's Command (reka-ui ListboxRoot + shadcn's filter state, same
// props/emits, `class` merge). Its parts read the goo settings from here: the active item is
// a goo blob that glides between items with the arrow keys and the pointer (GoopCommandList,
// core `attachMenuHighlight` + `findCommandHighlight`), choosing an item squishes it, and the
// search input gets GoopInput's goo focus ring. `highlightOnHover` defaults on (the pointer
// moves the highlight, like cmdk). With `:goo="false"` it is exactly shadcn's Command.
import type { MenuHighlightHandle } from '@goopui/core'
import { cn } from 'cn'
import type { ListboxRootEmits, ListboxRootProps } from 'reka-ui'
import { ListboxRoot, useFilter, useForwardPropsEmits } from 'reka-ui'
import { computed, reactive, ref, shallowRef, watch, type HTMLAttributes } from 'vue'
import { useGoopConfig } from '../../config'
import { COMMAND_PROP_KEYS, resolveCommandProps, toCommandOptions, type GoopCommandProps } from '../../goop-props'
import { provideGoopCommand, type GoopCommandFilterState } from './context'

const props = withDefaults(defineProps<ListboxRootProps & GoopCommandProps & { class?: HTMLAttributes['class'] }>(), {
  modelValue: '',
  highlightOnHover: true,
  goo: undefined,
  highlight: undefined,
  pop: undefined,
  ring: undefined,
  wobble: undefined,
  momentum: undefined,
  followPointer: undefined,
  speed: undefined,
  preset: undefined,
  renderer: undefined,
})
const emits = defineEmits<ListboxRootEmits>()

const OWN = new Set<string>(['class', ...COMMAND_PROP_KEYS])
const delegated = computed(() => Object.fromEntries(Object.entries(props).filter(([k]) => !OWN.has(k))) as ListboxRootProps)
const forwarded = useForwardPropsEmits(delegated, emits)

const config = useGoopConfig()
const cmd = computed(() => resolveCommandProps(props))
const options = computed(() => toCommandOptions(cmd.value, config))

// shadcn-vue's filter: every item registers its text; typing scores them (contains,
// accent-insensitive) and groups with no match hide.
const allItems = ref<Map<string, string>>(new Map())
const allGroups = ref<Map<string, Set<string>>>(new Map())
const { contains } = useFilter({ sensitivity: 'base' })
const filterState = reactive<GoopCommandFilterState>({
  search: '',
  filtered: { count: 0, items: new Map(), groups: new Set() },
})

function filterItems() {
  if (!filterState.search) {
    filterState.filtered.count = allItems.value.size
    return
  }
  filterState.filtered.groups = new Set()
  let count = 0
  for (const [id, value] of allItems.value) {
    const score = contains(value, filterState.search)
    filterState.filtered.items.set(id, score ? 1 : 0)
    if (score) count++
  }
  for (const [groupId, group] of allGroups.value) {
    for (const itemId of group) {
      if ((filterState.filtered.items.get(itemId) ?? 0) > 0) {
        filterState.filtered.groups.add(groupId)
        break
      }
    }
  }
  filterState.filtered.count = count
}
watch(() => filterState.search, filterItems)

provideGoopCommand({
  allItems,
  allGroups,
  filterState,
  cmd,
  options,
  highlight: shallowRef<MenuHighlightHandle | null>(null),
})

const classes = computed(() =>
  cn('bg-popover text-popover-foreground flex size-full flex-col overflow-hidden rounded-xl p-1', props.class),
)
</script>

<template>
  <ListboxRoot
    v-slot="slotProps"
    data-slot="command"
    v-bind="forwarded"
    :class="classes"
  >
    <slot v-bind="slotProps" />
  </ListboxRoot>
</template>

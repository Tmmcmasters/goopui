<script setup lang="ts">
// GoopCommandGroup: shadcn-vue's CommandGroup (reka-ui ListboxGroup with an optional
// `heading`, hidden when none of its items match the search, `class` merge).
import { cn } from 'cn'
import type { ListboxGroupProps } from 'reka-ui'
import { ListboxGroup, ListboxGroupLabel, useId } from 'reka-ui'
import { computed, onMounted, onUnmounted, type HTMLAttributes } from 'vue'
import { injectGoopCommand, provideGoopCommandGroup } from './context'

const props = defineProps<ListboxGroupProps & { class?: HTMLAttributes['class']; heading?: string }>()

const delegated = computed(() => {
  const { class: _class, heading: _heading, ...rest } = props
  return rest
})

const command = injectGoopCommand()
const id = useId()
const isRender = computed(() => (command.filterState.search ? command.filterState.filtered.groups.has(id) : true))

provideGoopCommandGroup({ id })
onMounted(() => {
  if (!command.allGroups.value.has(id)) command.allGroups.value.set(id, new Set())
})
onUnmounted(() => {
  command.allGroups.value.delete(id)
})
</script>

<template>
  <ListboxGroup
    v-bind="delegated"
    :id="id"
    data-slot="command-group"
    :class="cn('text-foreground p-1', props.class)"
    :hidden="isRender ? undefined : true"
  >
    <ListboxGroupLabel
      v-if="heading"
      data-slot="command-group-heading"
      class="text-muted-foreground px-2 py-1.5 text-xs font-medium"
    >
      {{ heading }}
    </ListboxGroupLabel>
    <slot />
  </ListboxGroup>
</template>

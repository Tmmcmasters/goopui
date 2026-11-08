<script setup lang="ts">
// GoopCommandEmpty: shadcn-vue's CommandEmpty (shown when the search matches nothing). With
// the command's `ignoreFilter` it shows when the command has no items at all (like cmdk with
// `shouldFilter={false}`), after mount: items register on mount, so the server can't count them.
import { cn } from 'cn'
import type { PrimitiveProps } from 'reka-ui'
import { Primitive } from 'reka-ui'
import { computed, onMounted, ref, type HTMLAttributes } from 'vue'
import { injectGoopCommand } from './context'

const props = defineProps<PrimitiveProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})

const command = injectGoopCommand()
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})
const isRender = computed(() =>
  command.ignoreFilter.value
    ? mounted.value && command.allItems.value.size === 0
    : !!command.filterState.search && command.filterState.filtered.count === 0,
)
</script>

<template>
  <Primitive
    v-if="isRender"
    data-slot="command-empty"
    v-bind="delegated"
    :class="cn('text-muted-foreground py-6 text-center text-sm', props.class)"
  >
    <slot />
  </Primitive>
</template>

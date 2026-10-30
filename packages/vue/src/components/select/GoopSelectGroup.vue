<script setup lang="ts">
// GoopSelectGroup: shadcn-vue's SelectGroup (`class`).
import { cn } from 'cn'
import type { SelectGroupProps } from 'reka-ui'
import { SelectGroup } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'

const props = defineProps<SelectGroupProps & { class?: HTMLAttributes['class'] }>()

const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <SelectGroup
    data-slot="select-group"
    v-bind="delegated"
    :class="cn('scroll-my-1 p-1', props.class)"
  >
    <slot />
  </SelectGroup>
</template>

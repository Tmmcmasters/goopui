<script setup lang="ts">
// GoopSeparator: shadcn-vue's Separator (reka Separator), a plain port with no goo.
import { cn } from 'cn'
import type { SeparatorProps } from 'reka-ui'
import { Separator } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { SEPARATOR } from './styles'

const props = withDefaults(defineProps<SeparatorProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'horizontal',
  decorative: true,
})
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <Separator
    data-slot="separator"
    v-bind="delegated"
    :class="cn(SEPARATOR, props.class)"
  />
</template>

<script setup lang="ts">
// GoopKbdGroup: shadcn-vue's KbdGroup (a <kbd>, `class` merge). Plain: no goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { KBD_GROUP } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <kbd data-slot="kbd-group" :class="cn(KBD_GROUP, props.class)">
    <slot />
  </kbd>
</template>

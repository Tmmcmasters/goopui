<script setup lang="ts">
// GoopSidebarInput: shadcn-vue's SidebarInput, a compact GoopInput (with its goo focus flow)
// for a search field in the sidebar. v-model and attributes pass through.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import GoopInput from '../input/GoopInput.vue'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
const model = defineModel<string | number>()
</script>

<template>
  <GoopInput
    v-model="model"
    data-slot="sidebar-input"
    data-sidebar="input"
    :class="cn('bg-background h-8 w-full shadow-none', props.class)"
  />
</template>

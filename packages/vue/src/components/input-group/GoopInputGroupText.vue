<script setup lang="ts">
// GoopInputGroupText: shadcn-vue's InputGroupText (a <span>, `class` merge). Plain.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { INPUT_GROUP_TEXT } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span :class="cn(INPUT_GROUP_TEXT, props.class)">
    <slot />
  </span>
</template>

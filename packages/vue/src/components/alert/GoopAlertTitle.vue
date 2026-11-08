<script setup lang="ts">
// GoopAlertTitle: shadcn-vue's AlertTitle (a div, `class` merge). No goo of its own.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ALERT_TITLE } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="alert-title" :class="cn(ALERT_TITLE, props.class)">
    <slot />
  </div>
</template>

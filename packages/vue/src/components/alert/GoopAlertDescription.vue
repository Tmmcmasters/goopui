<script setup lang="ts">
// GoopAlertDescription: shadcn-vue's AlertDescription (a div, `class` merge). No goo of its own.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ALERT_DESCRIPTION } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="alert-description" :class="cn(ALERT_DESCRIPTION, props.class)">
    <slot />
  </div>
</template>

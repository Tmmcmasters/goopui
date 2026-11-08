<script setup lang="ts">
// GoopAlertAction: shadcn-vue's AlertAction (a div, `class` merge). No goo of its own.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { ALERT_ACTION } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="alert-action" :class="cn(ALERT_ACTION, props.class)">
    <slot />
  </div>
</template>

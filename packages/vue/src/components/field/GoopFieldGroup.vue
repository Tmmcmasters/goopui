<script setup lang="ts">
// GoopFieldGroup: shadcn-vue's FieldGroup (a div, the container-query root for responsive fields, `class` merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_GROUP } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="field-group" :class="cn(FIELD_GROUP, props.class)">
    <slot />
  </div>
</template>

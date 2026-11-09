<script setup lang="ts">
// GoopFieldSet: shadcn-vue's FieldSet (a fieldset, `class` merge, same classes). No goo.
import { cn } from 'cn'
import type { HTMLAttributes } from 'vue'
import { FIELD_SET } from './variants'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <fieldset data-slot="field-set" :class="cn(FIELD_SET, props.class)">
    <slot />
  </fieldset>
</template>

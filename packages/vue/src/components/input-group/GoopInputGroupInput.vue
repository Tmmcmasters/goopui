<script setup lang="ts">
// GoopInputGroupInput: shadcn-vue's InputGroupInput, a plain Input (v-model, `class` merge,
// `data-slot="input-group-control"`) with no ring of its own: the group's goo ring is its focus
// indicator (shadcn's group selectors need the <input> to be a direct child, so no wrapper).
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { inputVariants } from '../input/variants'
import { injectGoopInputGroup } from './context'
import { INPUT_GROUP_INPUT, goopInputGroupControlActive } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class']; defaultValue?: string | number }>()
const model = defineModel<string | number>()
if (model.value === undefined && props.defaultValue !== undefined) model.value = props.defaultValue
const active = injectGoopInputGroup()
const classes = computed(() => cn(inputVariants(), INPUT_GROUP_INPUT, active?.value && goopInputGroupControlActive, props.class))
</script>

<template>
  <input v-model="model" data-slot="input-group-control" :class="classes">
</template>

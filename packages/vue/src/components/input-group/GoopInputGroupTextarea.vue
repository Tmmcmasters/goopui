<script setup lang="ts">
// GoopInputGroupTextarea: shadcn-vue's InputGroupTextarea, a plain Textarea (v-model, `class`
// merge, `data-slot="input-group-control"`) with no ring of its own: the group's goo ring is
// its focus indicator, and typing ripples it from the caret.
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import { textareaVariants } from '../input/variants'
import { injectGoopInputGroup } from './context'
import { INPUT_GROUP_TEXTAREA, goopInputGroupControlActive } from './styles'

const props = defineProps<{ class?: HTMLAttributes['class']; defaultValue?: string | number }>()
const model = defineModel<string | number>()
if (model.value === undefined && props.defaultValue !== undefined) model.value = props.defaultValue
const active = injectGoopInputGroup()
const classes = computed(() => cn(textareaVariants(), INPUT_GROUP_TEXTAREA, active?.value && goopInputGroupControlActive, props.class))
</script>

<template>
  <textarea v-model="model" data-slot="input-group-control" :class="classes" />
</template>

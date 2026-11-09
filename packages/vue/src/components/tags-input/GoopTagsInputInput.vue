<script setup lang="ts">
// GoopTagsInputInput: shadcn-vue's TagsInputInput (reka; placeholder, autoFocus, maxLength,
// `class` merge, same classes). Its focus draws the parent's goo ring around the whole box.
import { cn } from 'cn'
import { TagsInputInput, type TagsInputInputProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { useGoopCue } from '../../sound'
import { TAGS_INPUT_INPUT } from './variants'

const props = defineProps<TagsInputInputProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
const cue = useGoopCue('input')
</script>

<template>
  <TagsInputInput data-slot="tags-input-input" v-bind="{ ...delegated, ...cue }" :class="cn(TAGS_INPUT_INPUT, props.class)" />
</template>

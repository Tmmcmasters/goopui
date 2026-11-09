<script setup lang="ts">
// GoopTagsInputItemText: shadcn-vue's TagsInputItemText (reka; `class` merge, same classes).
import { cn } from 'cn'
import { TagsInputItemText, type TagsInputItemTextProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { TAGS_INPUT_ITEM_TEXT } from './variants'

const props = defineProps<TagsInputItemTextProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <TagsInputItemText data-slot="tags-input-item-text" v-bind="delegated" :class="cn(TAGS_INPUT_ITEM_TEXT, props.class)" />
</template>

<script setup lang="ts">
// GoopTagsInputItem: shadcn-vue's TagsInputItem (reka TagsInputItem: `value`, `disabled`,
// `class` merge, same classes). Its merge-in and melt come from the parent GoopTagsInput.
import { cn } from 'cn'
import { TagsInputItem, type TagsInputItemProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { TAGS_INPUT_ITEM } from './variants'

const props = defineProps<TagsInputItemProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <TagsInputItem data-slot="tags-input-item" v-bind="delegated" :class="cn(TAGS_INPUT_ITEM, props.class)">
    <slot />
  </TagsInputItem>
</template>

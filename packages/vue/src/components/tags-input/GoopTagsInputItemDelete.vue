<script setup lang="ts">
// GoopTagsInputItemDelete: shadcn-vue's TagsInputItemDelete (reka; `class` merge, same
// classes, lucide's X by default). Removing a tag melts it away (the parent's goo). A press
// keeps the focus (and the goo ring) in the field.
import { cn } from 'cn'
import { TagsInputItemDelete, type TagsInputItemDeleteProps } from 'reka-ui'
import { computed, type HTMLAttributes } from 'vue'
import { TAGS_INPUT_ITEM_DELETE } from './variants'

const props = defineProps<TagsInputItemDeleteProps & { class?: HTMLAttributes['class'] }>()
const delegated = computed(() => {
  const { class: _class, ...rest } = props
  return rest
})
</script>

<template>
  <TagsInputItemDelete data-slot="tags-input-item-delete" v-bind="delegated" @mousedown.prevent :class="cn(TAGS_INPUT_ITEM_DELETE, props.class)">
    <slot>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="w-4 h-4"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    </slot>
  </TagsInputItemDelete>
</template>

<script setup lang="ts">
// GoopPaginationLink: shadcn-vue's PaginationLink (a plain `<a>` page link, `href`,
// `isActive`, `size`, `class` merge) for server-routed pagination. Inside a
// GoopPaginationContent with the goo blob on, the active link's outline look is the blob.
import { cn } from 'cn'
import { computed, type HTMLAttributes } from 'vue'
import type { ButtonSize } from '../button/variants'
import { injectGoopPaginationContent } from './context'
import { paginationItemClass } from './variants'

const props = withDefaults(
  defineProps<{ href?: string; size?: ButtonSize; isActive?: boolean; class?: HTMLAttributes['class'] }>(),
  { size: 'icon', isActive: false },
)
const content = injectGoopPaginationContent()
const classes = computed(() => cn(paginationItemClass(props.isActive, props.size, content?.blob.value ?? false), props.class))
</script>

<template>
  <a
    :href="href"
    data-slot="pagination-link"
    :data-active="isActive ? '' : undefined"
    :aria-current="isActive ? 'page' : undefined"
    :class="classes"
  >
    <slot />
  </a>
</template>

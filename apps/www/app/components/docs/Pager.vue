<script setup lang="ts">
import type { ContentNavigationItem } from '@nuxt/content'

defineProps<{ prev?: ContentNavigationItem | null; next?: ContentNavigationItem | null }>()
</script>

<template>
  <nav aria-label="Pagination" class="mt-16 grid gap-3 sm:grid-cols-2">
    <NuxtLink v-if="prev" :to="prev.path" class="pager group">
      <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SiteIcon name="arrowLeft" :size="13" class="arrow-l" /> Previous
      </span>
      <span class="mt-1 font-medium">{{ prev.title }}</span>
    </NuxtLink>
    <span v-else class="hidden sm:block" />
    <NuxtLink v-if="next" :to="next.path" class="pager group text-right sm:col-start-2">
      <span class="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        Next <SiteIcon name="arrowRight" :size="13" class="arrow-r" />
      </span>
      <span class="mt-1 font-medium">{{ next.title }}</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  flex-direction: column;
  padding: 0.9rem 1.1rem;
  border-radius: 0.875rem;
  border: 1px solid var(--border);
  transition:
    border-color 150ms ease,
    background-color 150ms ease;
}
.pager:hover {
  border-color: var(--border-strong);
  background: var(--card);
}
.arrow-l,
.arrow-r {
  transition: transform 200ms var(--ease-out-strong);
}
@media (hover: hover) and (pointer: fine) {
  .pager:hover .arrow-l {
    transform: translateX(-2px);
  }
  .pager:hover .arrow-r {
    transform: translateX(2px);
  }
}
</style>

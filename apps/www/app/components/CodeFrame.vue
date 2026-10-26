<script setup lang="ts">
// Chrome around a code block: optional filename/tab bar, copy button, horizontal scroll.
// The scroll area opts out of Lenis for horizontal gestures only, so vertical wheel/swipes
// over code still scroll the page smoothly.
defineProps<{ code: string; filename?: string; language?: string }>()
</script>

<template>
  <div class="code-frame group relative my-5 overflow-hidden rounded-xl border border-border bg-card">
    <div
      v-if="filename || $slots.tabs"
      class="flex h-10 items-center gap-2 border-b border-border pl-4 pr-12 font-mono text-xs text-muted-foreground"
    >
      <slot name="tabs">
        <span class="truncate">{{ filename }}</span>
      </slot>
    </div>
    <div class="absolute right-1.5 z-10" :class="filename || $slots.tabs ? 'top-1' : 'top-1.5'">
      <CopyButton :text="code" />
    </div>
    <div class="code-body overflow-x-auto" data-lenis-prevent-horizontal tabindex="0" :aria-label="filename ? `Code: ${filename}` : 'Code'">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.code-body :deep(pre) {
  margin: 0;
  padding: 1rem 3.25rem 1rem 1.125rem;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  background: transparent !important;
  min-width: max-content;
}
.code-body :deep(code) {
  font-family: inherit;
}
.code-body:focus-visible {
  outline-offset: -2px;
  border-radius: 0 0 0.75rem 0.75rem;
}
</style>

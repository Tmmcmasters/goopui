<script setup lang="ts">
const props = withDefaults(defineProps<{ code: string; lang?: 'ts' | 'vue' | 'shell' | 'css'; filename?: string }>(), {
  lang: 'ts',
})
const html = computed(() => highlight(props.code.trim(), props.lang))
</script>

<template>
  <CodeFrame :code="code.trim()" :filename="filename" class="snippet">
    <template v-if="$slots.tabs" #tabs><slot name="tabs" /></template>
    <pre><code v-html="html" /></pre>
  </CodeFrame>
</template>

<style scoped>
.snippet :deep(.tk-comment) {
  color: var(--subtle);
}
.snippet :deep(.tk-string) {
  color: oklch(0.5 0.13 145);
}
.snippet :deep(.tk-keyword) {
  color: oklch(0.52 0.19 300);
}
.snippet :deep(.tk-number) {
  color: oklch(0.55 0.15 50);
}
.snippet :deep(.tk-fn),
.snippet :deep(.tk-prop) {
  color: oklch(0.5 0.15 255);
}
.snippet :deep(.tk-tag) {
  color: oklch(0.52 0.16 25);
}
.snippet :deep(.tk-attr) {
  color: oklch(0.5 0.15 255);
}
.dark .snippet :deep(.tk-string) {
  color: oklch(0.82 0.13 145);
}
.dark .snippet :deep(.tk-keyword) {
  color: oklch(0.78 0.13 300);
}
.dark .snippet :deep(.tk-number) {
  color: oklch(0.8 0.12 60);
}
.dark .snippet :deep(.tk-fn),
.dark .snippet :deep(.tk-prop),
.dark .snippet :deep(.tk-attr) {
  color: oklch(0.8 0.11 245);
}
.dark .snippet :deep(.tk-tag) {
  color: oklch(0.78 0.13 25);
}
</style>

<script setup lang="ts">
// Docs code blocks: Shiki output (dual light/dark themes) inside the shared CodeFrame,
// with a filename bar when the fence has one (```ts [nuxt.config.ts]) and a copy button.
defineProps<{
  code?: string
  language?: string | null
  filename?: string | null
  highlights?: number[]
  meta?: string | null
  class?: string | null
}>()
</script>

<template>
  <CodeFrame :code="code ?? ''" :filename="filename ?? undefined" :language="language ?? undefined">
    <pre :class="$props.class"><slot /></pre>
  </CodeFrame>
</template>

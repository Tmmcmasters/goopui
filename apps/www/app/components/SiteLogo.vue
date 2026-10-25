<script setup lang="ts">
// Temporary text wordmark. The real logo is being designed in /brand; replace this
// file's template when it lands. Everything else imports <SiteLogo> only.
defineProps<{ size?: 'sm' | 'md' }>()
</script>

<template>
  <span
    class="inline-flex items-baseline font-semibold tracking-[-0.04em] text-foreground select-none"
    :class="size === 'sm' ? 'text-base' : 'text-[1.1875rem]'"
  >
    goop<span class="text-goo-ink">UI</span>
  </span>
</template>

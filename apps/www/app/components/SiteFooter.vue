<script setup lang="ts">
defineProps<{ wide?: boolean }>()
</script>

<template>
  <footer class="border-t border-border">
    <div
      class="mx-auto flex flex-col gap-6 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6"
      :class="wide ? 'max-w-[1440px]' : 'max-w-6xl'"
    >
      <div class="flex flex-col gap-1.5">
        <SiteLogo size="sm" />
        <p>MIT licensed. Vue first; React and Svelte later.</p>
      </div>
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <NuxtLink to="/docs/getting-started/introduction" class="hover:text-foreground">Docs</NuxtLink>
        <NuxtLink to="/docs/getting-started/accessibility" class="hover:text-foreground">Accessibility</NuxtLink>
        <a href="https://github.com/Tmmcmasters/goopui" class="hover:text-foreground" rel="noopener" target="_blank">
          GitHub
        </a>
        <MotionSwitch compact />
      </div>
    </div>
  </footer>
</template>

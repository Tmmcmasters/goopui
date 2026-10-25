<script setup lang="ts">
const { theme, simulateReducedMotion } = usePlaygroundSettings()

useHead({
  titleTemplate: t => (t ? `${t} · goopUI playground` : 'goopUI playground'),
  htmlAttrs: {
    'class': computed(() => (theme.value === 'dark' ? 'dark' : undefined)),
    'data-reduced-motion': computed(() => (simulateReducedMotion.value ? 'true' : undefined)),
  },
})
</script>

<template>
  <div class="min-h-dvh">
    <PlaygroundToolbar />
    <main class="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <NuxtPage />
    </main>
  </div>
</template>

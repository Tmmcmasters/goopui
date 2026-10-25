<script setup lang="ts">
useHead({
  titleTemplate: (t) => (t && t !== 'goopUI' ? `${t} · goopUI` : 'goopUI: components that drip'),
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

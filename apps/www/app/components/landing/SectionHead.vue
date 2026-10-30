<script setup lang="ts">
defineProps<{ title: string; id?: string }>()
</script>

<template>
  <div v-reveal class="max-w-2xl">
    <h2 :id="id" class="type-display text-[clamp(1.875rem,4.2vw,2.75rem)] leading-[1.05] text-balance">
      {{ title }}
    </h2>
    <div class="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground text-pretty">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ index: string; label: string; title: string; id?: string }>()
</script>

<template>
  <div v-reveal class="max-w-2xl">
    <p class="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-subtle">
      <span class="text-foreground">{{ index }}</span>
      <span aria-hidden="true" class="h-px w-5 bg-border-strong" />
      {{ label }}
    </p>
    <h2 :id="id" class="mt-4 text-[clamp(1.875rem,4.2vw,2.75rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-balance">
      {{ title }}
    </h2>
    <div class="mt-4 text-[1.0625rem] leading-relaxed text-muted-foreground text-pretty">
      <slot />
    </div>
  </div>
</template>

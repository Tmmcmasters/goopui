<script setup lang="ts">
// Live aspect-ratio demos for the Aspect Ratio docs page: real <GoopAspectRatio>. `set` picks
// the group. Keep each set in sync with the code sample beside it in the docs.
withDefaults(defineProps<{ set?: 'basic' | 'square' }>(), { set: 'basic' })
// On /react/docs: the same sets, as real @goopui/react components (react-demos/layout.tsx).
const { isReact } = useFramework()
</script>

<template>
  <ReactIsland v-if="isReact" demo="aspect-ratio" :set="set" />
  <div v-else-if="set === 'basic'" class="w-full max-w-sm">
    <GoopAspectRatio :ratio="16 / 9" class="ratio-art rounded-lg">
      <span class="ratio-label">16 / 9</span>
    </GoopAspectRatio>
  </div>
  <div v-else class="w-full max-w-[12rem]">
    <GoopAspectRatio :ratio="1" class="ratio-art rounded-lg">
      <span class="ratio-label">1 / 1</span>
    </GoopAspectRatio>
  </div>
</template>

<style>
/* A drawn "photo" (no image file): an ink wash with a low hill. Shared with the React island. */
.ratio-art {
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(120% 70% at 30% 105%, color-mix(in oklch, var(--foreground) 16%, transparent) 0 55%, transparent 56%),
    radial-gradient(90% 60% at 85% 110%, color-mix(in oklch, var(--foreground) 10%, transparent) 0 55%, transparent 56%),
    linear-gradient(160deg, var(--muted), color-mix(in oklch, var(--muted) 60%, var(--background)));
  box-shadow: inset 0 0 0 1px var(--border);
}
.ratio-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--muted-foreground);
  font-variant-numeric: tabular-nums;
}
</style>

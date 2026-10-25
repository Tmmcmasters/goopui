<script setup lang="ts">
// A live demo frame for docs pages. Put any goo demo in the default slot; the controls
// (Drip, Slow-mo, Let it fly) reach every goo inside through the stage.
withDefaults(defineProps<{ caption?: string; controls?: boolean; splash?: boolean }>(), { controls: true, splash: true })
const stage = ref<HTMLElement | null>(null)
</script>

<template>
  <div class="preview not-prose my-6 overflow-hidden rounded-xl border border-border bg-card">
    <div ref="stage" data-goop-stage class="stage flex min-h-56 flex-wrap items-center justify-center gap-4 px-4 pb-14 pt-10">
      <slot />
    </div>
    <div v-if="controls || caption" class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
      <span class="pl-1 text-xs text-muted-foreground">{{ caption }}</span>
      <StageControls v-if="controls" :stage="stage" :splash="splash" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
</style>

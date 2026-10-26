<script setup lang="ts">
// Controls for a goo stage (see composables/useGoopStage.ts): Drip calls each button's
// exposed drip(); Slow-mo sets the `timeScale` prop; Let it fly sets `splash="escape"`.
import type { GoopStage } from '~/composables/useGoopStage'

withDefaults(defineProps<{ stage: GoopStage; splash?: boolean }>(), { splash: true })
</script>

<template>
  <div class="flex gap-1.5">
    <button type="button" class="ctl" title="Drip every goo in this demo" @click="stage.drip()">Drip</button>
    <button
      type="button"
      class="ctl"
      title="Run this demo at 30% speed"
      :aria-pressed="stage.slow.value"
      @click="stage.slow.value = !stage.slow.value"
    >
      Slow-mo
    </button>
    <button
      v-if="splash"
      type="button"
      class="ctl"
      title="Splashes escape the frame and fly across the page"
      :aria-pressed="stage.escape.value"
      @click="stage.escape.value = !stage.escape.value"
    >
      Let it fly
    </button>
  </div>
</template>

<style scoped>
.ctl {
  height: 1.875rem;
  padding: 0 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  white-space: nowrap;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.ctl:hover {
  color: var(--foreground);
  background: var(--muted);
}
.ctl:active {
  transform: scale(0.96);
}
.ctl[aria-pressed='true'] {
  color: var(--background);
  background: var(--foreground);
  box-shadow: none;
}
</style>

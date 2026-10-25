<script setup lang="ts">
// Controls for a goo stage (see utils/goopStage.ts). Each toggle is one entry in TOGGLES,
// so new engine features (round 4) slot in as one more line.
import type { GoopOptions } from '@goopui/core'

const props = withDefaults(defineProps<{ stage: HTMLElement | null; splash?: boolean }>(), { splash: true })

interface Toggle {
  key: string
  label: string
  title: string
  on: GoopOptions
  off: GoopOptions
}

const TOGGLES: Toggle[] = [
  // Per-instance time scale: only this frame slows down, not the whole page.
  { key: 'slow', label: 'Slow-mo', title: 'Run this demo at 30% speed', on: { timeScale: 0.3 }, off: { timeScale: 1 } },
  {
    key: 'escape',
    label: 'Let it fly',
    title: 'Splashes escape the frame and fly across the page',
    on: { splash: 'escape' },
    off: { splash: 'near' },
  },
]

const visible = computed(() => TOGGLES.filter((t) => props.splash || t.key !== 'escape'))
const state = reactive<Record<string, boolean>>({})

const flip = (t: Toggle) => {
  state[t.key] = !state[t.key]
  setStageOptions(props.stage, state[t.key] ? t.on : t.off)
}
</script>

<template>
  <div class="flex gap-1.5">
    <button type="button" class="ctl" title="Drip every goo in this demo" @click="dripStage(stage)">Drip</button>
    <button
      v-for="t in visible"
      :key="t.key"
      type="button"
      class="ctl"
      :title="t.title"
      :aria-pressed="!!state[t.key]"
      @click="flip(t)"
    >
      {{ t.label }}
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

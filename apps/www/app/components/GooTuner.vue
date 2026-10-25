<script setup lang="ts">
// Live --goop-* tuning. Sliders write CSS custom properties on the stage element (exactly
// what you'd do in your own CSS), then each button re-reads them with handle.update().
// Used on the landing page and in the Theming docs page.
import { GOOP_CSS_VARS, GOOP_DEFAULTS, type GoopTuning } from '@goopui/core'

type Key = keyof GoopTuning
const KNOBS: { key: Key; label: string; min: number; max: number; step: number; unit?: string }[] = [
  { key: 'blur', label: 'Blur', min: 0, max: 12, step: 0.5, unit: 'px' },
  { key: 'threshold', label: 'Threshold', min: 0.1, max: 0.9, step: 0.01 },
  { key: 'dripSize', label: 'Drip size', min: 2, max: 16, step: 0.5, unit: 'px' },
  { key: 'dripLength', label: 'Drip length', min: 0, max: 40, step: 1, unit: 'px' },
  { key: 'viscosity', label: 'Viscosity', min: 0.3, max: 3, step: 0.05 },
  { key: 'fall', label: 'Fall', min: 0, max: 120, step: 1, unit: 'px' },
  { key: 'squish', label: 'Squish', min: 0, max: 0.3, step: 0.01 },
  { key: 'restingDrips', label: 'Resting drips', min: 0, max: 4, step: 1 },
]

const values = reactive<Record<Key, number>>({ ...GOOP_DEFAULTS })
const changed = computed(() => KNOBS.filter((k) => values[k.key] !== GOOP_DEFAULTS[k.key]))

const buttons = ref<{ getHandle: () => import('@goopui/core').GoopHandle | null; refresh: () => void }[]>([])
const setRef = (i: number) => (el: unknown) => {
  if (el) buttons.value[i] = el as (typeof buttons.value)[number]
}

const stageStyle = computed(() => {
  const s: Record<string, string> = {}
  for (const k of KNOBS) if (values[k.key] !== GOOP_DEFAULTS[k.key]) s[GOOP_CSS_VARS[k.key]] = String(values[k.key])
  return s
})

// Wait for Vue to write the style, then let every instance re-read its CSS vars.
watch(stageStyle, () => nextTick(() => buttons.value.forEach((b) => b.refresh())))

const css = computed(() => {
  const lines = changed.value.map((k) => `  ${GOOP_CSS_VARS[k.key]}: ${values[k.key]};`)
  return lines.length ? `:root {\n${lines.join('\n')}\n}` : `/* Defaults. Move a slider. */\n:root {\n  ${GOOP_CSS_VARS.blur}: ${GOOP_DEFAULTS.blur};\n}`
})

const reset = () => Object.assign(values, GOOP_DEFAULTS)
const drip = () => buttons.value.forEach((b) => b.getHandle()?.drip())
const fmt = (k: (typeof KNOBS)[number]) => `${values[k.key]}${k.unit ?? ''}`
</script>

<template>
  <div class="tuner grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,20rem)_1fr]">
    <div class="border-b border-border p-5 lg:border-b-0 lg:border-r">
      <div class="grid gap-4">
        <label v-for="k in KNOBS" :key="k.key" class="knob grid gap-1.5">
          <span class="flex items-baseline justify-between gap-2 text-[13px]">
            <span>{{ k.label }}</span>
            <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ fmt(k) }}</span>
          </span>
          <input
            v-model.number="values[k.key]"
            type="range"
            :min="k.min"
            :max="k.max"
            :step="k.step"
            :aria-valuetext="fmt(k)"
          />
          <span class="font-mono text-[10.5px] text-subtle">{{ GOOP_CSS_VARS[k.key] }}</span>
        </label>
      </div>
    </div>

    <div class="flex min-w-0 flex-col">
      <div class="stage grid min-h-64 flex-1 place-items-center px-4 pb-14 pt-10" :style="stageStyle">
        <div class="flex flex-wrap items-center justify-center gap-4">
          <GoopButtonDemo :ref="setRef(0)">Button</GoopButtonDemo>
          <GoopButtonDemo :ref="setRef(1)" variant="goo" shape="pill">Pill</GoopButtonDemo>
          <GoopButtonDemo :ref="setRef(2)" variant="destructive" size="lg">Delete</GoopButtonDemo>
        </div>
      </div>
      <div class="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
        <span class="text-xs text-muted-foreground">Hover the buttons, or</span>
        <div class="flex gap-1.5">
          <button type="button" class="ctl" @click="drip">Drip</button>
          <button type="button" class="ctl" :disabled="!changed.length" @click="reset">Reset</button>
        </div>
      </div>
      <div class="border-t border-border px-1 [&_.code-frame]:my-0 [&_.code-frame]:border-0 [&_.code-frame]:bg-transparent">
        <CodeSnippet :code="css" lang="css" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage {
  background-image: radial-gradient(circle at 1px 1px, var(--border) 1px, transparent 0);
  background-size: 18px 18px;
}
.knob input[type='range'] {
  width: 100%;
  accent-color: var(--foreground);
  height: 18px;
  cursor: pointer;
}
.ctl {
  height: 2rem;
  padding: 0 0.7rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  color: var(--muted-foreground);
  box-shadow: inset 0 0 0 1px var(--border);
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.ctl:hover:not(:disabled) {
  color: var(--foreground);
  background: var(--muted);
}
.ctl:active:not(:disabled) {
  transform: scale(0.96);
}
.ctl:disabled {
  opacity: 0.45;
  cursor: default;
}
</style>

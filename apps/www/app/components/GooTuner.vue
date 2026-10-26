<script setup lang="ts">
// Live --goop-* tuning, generated from GOOP_VAR_META (@goopui/core):
//   - Preset picker: resets every slider to that preset's values.
//   - Modes: every keyword var except the preset (splash, hit effect, finish), as
//     segmented controls. Finish hot-swaps the renderer via update().
//   - FEATURES: one switch per engine feature.
//   - A tab per var group; each slider shows the engine's label, value + unit, and its
//     one-line description. A var core adds later appears in its group automatically.
// Sliders write CSS custom properties on the stage (what you'd do in your own CSS); modes
// and switches are JS options pushed through the stage (utils/goopStage.ts).
// Used on the landing page and the Theming docs page.
import { GOOP_DEFAULT_PRESET, GOOP_PRESETS, type GoopOptions, type GoopPreset } from '@goopui/core'

const PRESETS = Object.keys(GOOP_PRESETS) as GoopPreset[]
const preset = ref<GoopPreset>(GOOP_DEFAULT_PRESET)

// ---- features -------------------------------------------------------------------------
interface Feature {
  id: string
  label: string
  /** Var whose resolved value says whether the preset has it on. */
  meta?: string
  on: GoopOptions
  off: GoopOptions
}
// Chip text is a short name; the engine's label and description show on hover.
const bool = (k: string, name: string): Feature => ({ id: k, label: name, meta: k, on: { [k]: true }, off: { [k]: false } })
const zero = (k: string, name: string): Feature => ({ id: k, label: name, meta: k, on: { [k]: undefined }, off: { [k]: 0 } })
const FEATURES: Feature[] = [
  { id: 'drips', label: 'Drips', on: { drips: true }, off: { drips: false } },
  zero('shockwave', 'Shockwave'),
  bool('gloss', 'Gloss'),
  bool('taffy', 'Taffy'),
  bool('reach', 'Reach'),
  zero('strands', 'Strands'),
  bool('puddles', 'Puddles'),
  bool('labelRide', 'Label ride'),
  bool('keyboard', 'Keyboard'),
  bool('idle', 'Idle'),
]
const presetHas = (f: Feature, p: GoopPreset) => !f.meta || Number(presetDefault(meta(f.meta), p)) > 0
const featureOn = reactive<Record<string, boolean>>({})
const resetFeatures = () => FEATURES.forEach((f) => (featureOn[f.id] = presetHas(f, preset.value)))
resetFeatures()

// ---- modes (keyword vars) -------------------------------------------------------------
const MODES = ALL_VARS.filter((m) => isKeyword(m) && m.option !== 'preset')
const modes = reactive<Record<string, string>>({})
const resetModes = () => MODES.forEach((m) => (modes[m.option] = String(presetDefault(m, preset.value))))
resetModes()

// ---- sliders --------------------------------------------------------------------------
// On/off vars are switches above, not sliders.
const SLIDERS = (m: VarMeta) => isNumeric(m) && m.unit !== 'on/off'
const groups = varGroups(SLIDERS)
const tab = ref(groups[0]!.group)
const values = reactive<Record<string, number>>({})
const resetValues = () => groups.forEach((g) => g.vars.forEach((m) => (values[m.option] = Number(presetDefault(m, preset.value)))))
resetValues()

watch(preset, () => {
  resetValues()
  resetFeatures()
  resetModes()
})

const changed = computed(() =>
  groups.flatMap((g) => g.vars).filter((m) => values[m.option] !== Number(presetDefault(m, preset.value))),
)

const stage = ref<HTMLElement | null>(null)
const stageStyle = computed(() => Object.fromEntries(changed.value.map((m) => [m.name, String(values[m.option])])))

const stageOpts = computed<GoopOptions>(() => {
  const o: Record<string, unknown> = { preset: preset.value, ...modes }
  for (const f of FEATURES) Object.assign(o, featureOn[f.id] ? f.on : f.off)
  return o as GoopOptions
})

// Let Vue write the CSS vars first, then every instance re-reads vars + options.
watch([stageStyle, stageOpts], () => nextTick(() => setStageOptions(stage.value, stageOpts.value)), { deep: true })
onMounted(() => setStageOptions(stage.value, stageOpts.value))

const css = computed(() => {
  const lines: string[] = []
  if (preset.value !== GOOP_DEFAULT_PRESET) lines.push(`  --goop-preset: ${preset.value};`)
  for (const m of MODES) if (modes[m.option] !== String(presetDefault(m, preset.value))) lines.push(`  ${m.name}: ${modes[m.option]};`)
  for (const f of FEATURES) {
    if (featureOn[f.id] === presetHas(f, preset.value) || !f.meta) continue
    const m = meta(f.meta)
    lines.push(`  ${m.name}: ${featureOn[f.id] ? (Number(m.default) > 0 ? m.default : 1) : 0};`)
  }
  for (const m of changed.value) lines.push(`  ${m.name}: ${values[m.option]};`)
  return lines.length ? `.goop {\n${lines.join('\n')}\n}` : `/* The ${preset.value} preset, as is. Move something. */`
})

const dirty = computed(() => css.value.startsWith('.goop') || preset.value !== GOOP_DEFAULT_PRESET)
const reset = () => {
  if (preset.value !== GOOP_DEFAULT_PRESET) preset.value = GOOP_DEFAULT_PRESET
  else {
    resetValues()
    resetFeatures()
    resetModes()
  }
}
const fmt = (m: VarMeta) => `${values[m.option]}${unitSuffix(m)}`
</script>

<template>
  <div class="tuner overflow-hidden rounded-2xl border border-border bg-card">
    <!-- Preset + modes -->
    <div class="flex flex-wrap items-end gap-x-5 gap-y-3 border-b border-border px-4 py-3">
      <div class="grid gap-1">
        <span class="text-[11px] text-muted-foreground">Preset</span>
        <div class="seg" role="group" aria-label="Preset">
          <button v-for="p in PRESETS" :key="p" type="button" :aria-pressed="preset === p" @click="preset = p">{{ p }}</button>
        </div>
      </div>
      <div v-for="m in MODES" :key="m.option" class="grid gap-1" :title="m.description">
        <span class="text-[11px] text-muted-foreground">{{ m.label }}</span>
        <div class="seg" role="group" :aria-label="m.label">
          <button
            v-for="v in m.values"
            :key="v"
            type="button"
            :aria-pressed="modes[m.option] === v"
            @click="modes[m.option] = v"
          >
            {{ v }}
          </button>
        </div>
      </div>
    </div>

    <div class="grid lg:grid-cols-[minmax(0,22rem)_1fr]">
      <!-- Sliders -->
      <div class="flex min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div class="flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="group" aria-label="Var group" data-lenis-prevent-horizontal>
          <button v-for="g in groups" :key="g.group" type="button" class="tab" :aria-pressed="tab === g.group" @click="tab = g.group">
            {{ g.group }}
          </button>
        </div>
        <div class="knobs grid max-h-[34rem] gap-5 overflow-y-auto p-5" data-lenis-prevent>
          <label v-for="m in groups.find((g) => g.group === tab)?.vars" :key="m.option" class="knob grid gap-1.5">
            <span class="flex items-baseline justify-between gap-2 text-[13px]">
              <span>{{ m.label }}</span>
              <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ fmt(m) }}</span>
            </span>
            <input
              v-model.number="values[m.option]"
              type="range"
              :min="m.min"
              :max="m.max"
              :step="m.step"
              :aria-valuetext="fmt(m)"
              :aria-description="m.description"
            />
            <span class="text-[12px] leading-snug text-muted-foreground">{{ m.description }}</span>
            <span class="font-mono text-[10.5px] text-subtle">{{ m.name }}<template v-if="m.unit && !unitSuffix(m)"> · {{ m.unit }}</template></span>
          </label>
        </div>
      </div>

      <!-- Stage -->
      <div class="flex min-w-0 flex-col">
        <div class="flex flex-wrap gap-1.5 border-b border-border px-3 py-2" role="group" aria-label="Features">
          <button
            v-for="f in FEATURES"
            :key="f.id"
            type="button"
            class="chip"
            :aria-pressed="featureOn[f.id]"
            :title="f.meta ? `${meta(f.meta).label}: ${meta(f.meta).description}` : 'Hover and tap drips.'"
            @click="featureOn[f.id] = !featureOn[f.id]"
          >
            <span class="dot" aria-hidden="true" />{{ f.label }}
          </button>
        </div>
        <div ref="stage" data-goop-stage class="stage grid min-h-72 flex-1 place-items-center px-4 pb-16 pt-12" :style="stageStyle">
          <div class="flex flex-wrap items-center justify-center gap-4">
            <GoopButtonDemo>Button</GoopButtonDemo>
            <GoopButtonDemo variant="goo" shape="pill">Pill</GoopButtonDemo>
            <GoopButtonDemo variant="destructive" size="lg">Delete</GoopButtonDemo>
          </div>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span class="pl-1 text-xs text-muted-foreground">Hover, approach slowly, swipe, click, press and drag off.</span>
          <div class="flex gap-1.5">
            <StageControls :stage="stage" :splash="false" />
            <button type="button" class="ctl" :disabled="!dirty" @click="reset">Reset</button>
          </div>
        </div>
        <div class="border-t border-border px-1 [&_.code-frame]:my-0 [&_.code-frame]:border-0 [&_.code-frame]:bg-transparent">
          <CodeSnippet :code="css" lang="css" />
        </div>
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
.tab,
.ctl,
.chip,
.seg button {
  height: 1.875rem;
  padding: 0 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  white-space: nowrap;
  color: var(--muted-foreground);
  transition:
    background-color 150ms ease,
    color 150ms ease,
    transform 140ms var(--ease-out-strong);
}
.tab:hover,
.chip:hover,
.seg button:hover {
  color: var(--foreground);
}
.tab[aria-pressed='true'] {
  color: var(--foreground);
  background: var(--muted);
}
.ctl {
  box-shadow: inset 0 0 0 1px var(--border);
}
.ctl:hover:not(:disabled) {
  color: var(--foreground);
  background: var(--muted);
}
.ctl:active:not(:disabled),
.chip:active {
  transform: scale(0.96);
}
.ctl:disabled {
  opacity: 0.45;
  cursor: default;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 1.75rem;
  padding: 0 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  box-shadow: inset 0 0 0 1px var(--border);
}
.chip .dot {
  width: 7px;
  height: 7px;
  border-radius: 99px;
  background: var(--border-strong);
  transition: background-color 150ms ease;
}
.chip[aria-pressed='true'] {
  color: var(--foreground);
}
.chip[aria-pressed='true'] .dot {
  background: var(--slime);
}
.seg {
  display: inline-flex;
  width: fit-content;
  padding: 2px;
  gap: 2px;
  border-radius: 0.6rem;
  background: var(--muted);
}
.seg button {
  height: 1.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}
.seg button[aria-pressed='true'] {
  color: var(--foreground);
  background: var(--card);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}
</style>

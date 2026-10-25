<script setup lang="ts">
// Live --goop-* tuning. Sliders write CSS custom properties on the stage element (exactly
// what you'd do in your own CSS) and every button re-reads them with handle.update().
// Everything is data-driven from utils/goopDocs.ts + @goopui/core:
//   - a tab per knob group (a knob core adds later appears under "More");
//   - FEATURES: one switch per engine feature (round 4's per-feature toggles go here);
//   - splash mode and finish are options, not sliders.
// Used on the landing page and in the Theming docs page.
import {
  GOOP_CSS_VARS,
  GOOP_DEFAULTS,
  GOOP_FINISH_DEFAULTS,
  GOOP_FINISH_VARS,
  type GoopOptions,
  type GoopSplashMode,
} from '@goopui/core'

type Key = TuningKey | FinishKey

const groups = [...knobGroups(), { id: 'finish', label: 'Finish', keys: [] as TuningKey[] }]
const FINISH_KEYS: FinishKey[] = ['oilIntensity', 'oilScale', 'oilShift', 'oilReact']
const tab = ref(groups[0]!.id)

const LABELS: Partial<Record<Key, string>> = {
  dripSize: 'Drip size',
  dripLength: 'Drip length',
  dripCount: 'Drips per hover',
  dripInterval: 'Drip interval',
  restingDrips: 'Resting drips',
  maxDrips: 'Max drips',
  clickMass: 'Click mass',
  massDecay: 'Mass decay',
  scrollSlosh: 'Scroll slosh',
  tiltStrength: 'Tilt',
  splashThreshold: 'Splash threshold',
  splashAmount: 'Splash amount',
  oilIntensity: 'Intensity',
  oilScale: 'Band scale',
  oilShift: 'Band shift',
  oilReact: 'Pointer react',
}
const label = (k: Key) => LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1').toLowerCase()
const varName = (k: Key) => (k in GOOP_CSS_VARS ? GOOP_CSS_VARS[k as TuningKey] : GOOP_FINISH_VARS[k as FinishKey])
const defaultOf = (k: Key): number =>
  k in GOOP_DEFAULTS ? GOOP_DEFAULTS[k as TuningKey] : (GOOP_FINISH_DEFAULTS[k as FinishKey] as number)

const allKeys: Key[] = [...(Object.keys(GOOP_DEFAULTS) as TuningKey[]), ...FINISH_KEYS]
const defaults = () => Object.fromEntries(allKeys.map((k) => [k, defaultOf(k)])) as Record<Key, number>
const values = reactive<Record<Key, number>>(defaults())

// Engine features you can switch off outright. Off = a JS option, which beats the CSS var.
interface Feature {
  id: string
  label: string
  off: GoopOptions
}
const FEATURES: Feature[] = [
  { id: 'drips', label: 'Drips', off: { drips: false } },
  { id: 'shockwave', label: 'Shockwave', off: { shockwave: 0 } },
  { id: 'inertia', label: 'Inertia', off: { inertia: 0 } },
  { id: 'flow', label: 'Flow', off: { flow: 0 } },
  { id: 'click', label: 'Click mass', off: { clickMass: 0 } },
]
const featureOn = reactive<Record<string, boolean>>(Object.fromEntries(FEATURES.map((f) => [f.id, true])))

const splash = ref<GoopSplashMode>('near')
const finish = ref<'solid' | 'oil'>('solid')

const stage = ref<HTMLElement | null>(null)

const changed = computed(() => allKeys.filter((k) => values[k] !== defaultOf(k)))

const stageStyle = computed(() => {
  const s: Record<string, string> = {}
  for (const k of changed.value) s[varName(k)] = String(values[k])
  return s
})

/** Options pushed to every button on the stage. */
const stageOpts = computed<GoopOptions>(() => {
  const o: Record<string, unknown> = { splash: splash.value }
  for (const f of FEATURES) {
    for (const [k, v] of Object.entries(f.off)) o[k] = featureOn[f.id] ? (k === 'drips' ? true : undefined) : v
  }
  return o as GoopOptions
})

// Let Vue write the style first, then every instance re-reads its CSS vars + options.
watch([stageStyle, stageOpts], () => nextTick(() => setStageOptions(stage.value, stageOpts.value)), { deep: true })
onMounted(() => setStageOptions(stage.value, stageOpts.value))

const css = computed(() => {
  const lines = changed.value.map((k) => `  ${varName(k)}: ${values[k]};`)
  if (splash.value !== 'near') lines.push(`  --goop-splash: ${splash.value};`)
  if (finish.value === 'oil') lines.unshift('  --goop-finish: oil;')
  return lines.length ? `.goop {\n${lines.join('\n')}\n}` : `/* Defaults. Move a slider. */\n.goop {\n  ${GOOP_CSS_VARS.blur}: ${GOOP_DEFAULTS.blur};\n}`
})

const reset = () => {
  Object.assign(values, defaults())
  for (const f of FEATURES) featureOn[f.id] = true
  splash.value = 'near'
  finish.value = 'solid'
}
const dirty = computed(() => changed.value.length > 0 || splash.value !== 'near' || finish.value === 'oil' || FEATURES.some((f) => !featureOn[f.id]))
const fmt = (k: Key) => `${values[k]}${sliderFor(k).unit ?? ''}`
const keysFor = (id: string): Key[] => (id === 'finish' ? FINISH_KEYS : (groups.find((g) => g.id === id)?.keys ?? []))
</script>

<template>
  <div class="tuner grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,21rem)_1fr]">
    <div class="flex min-w-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
      <div class="tabs flex gap-1 overflow-x-auto border-b border-border px-3 py-2" role="group" aria-label="Knob group" data-lenis-prevent-horizontal>
        <button
          v-for="g in groups"
          :key="g.id"
          type="button"
          class="tab"
          :aria-pressed="tab === g.id"
          @click="tab = g.id"
        >
          {{ g.label }}
        </button>
      </div>

      <div class="grid gap-4 p-5">
        <div v-if="tab === 'splash'" class="grid gap-1.5">
          <span class="text-[13px]">Splash goes</span>
          <div class="seg" role="group" aria-label="Splash mode">
            <button v-for="m in ['near', 'escape', 'off'] as const" :key="m" type="button" :aria-pressed="splash === m" @click="splash = m">
              {{ m }}
            </button>
          </div>
          <span class="font-mono text-[10.5px] text-subtle">--goop-splash · escape flies across the page</span>
        </div>
        <div v-if="tab === 'finish'" class="grid gap-1.5">
          <span class="text-[13px]">Finish</span>
          <div class="seg" role="group" aria-label="Finish">
            <button v-for="m in ['solid', 'oil'] as const" :key="m" type="button" :aria-pressed="finish === m" @click="finish = m">
              {{ m }}
            </button>
          </div>
          <span class="font-mono text-[10.5px] text-subtle">--goop-finish · oil uses the canvas renderer</span>
        </div>

        <label v-for="k in keysFor(tab)" :key="k" class="knob grid gap-1.5">
          <span class="flex items-baseline justify-between gap-2 text-[13px]">
            <span>{{ label(k) }}</span>
            <span class="font-mono text-xs tabular-nums text-muted-foreground">{{ fmt(k) }}</span>
          </span>
          <input
            v-model.number="values[k]"
            type="range"
            :min="sliderFor(k).min"
            :max="sliderFor(k).max"
            :step="sliderFor(k).step"
            :aria-valuetext="fmt(k)"
          />
          <span class="font-mono text-[10.5px] text-subtle">{{ varName(k) }}</span>
        </label>
        <p v-if="tab === 'touch'" class="text-xs leading-relaxed text-muted-foreground">
          Inertia and flow need a moving pointer: sweep across the buttons.
        </p>
      </div>
    </div>

    <div class="flex min-w-0 flex-col">
      <div class="flex flex-wrap gap-1.5 border-b border-border px-3 py-2" role="group" aria-label="Features">
        <button
          v-for="f in FEATURES"
          :key="f.id"
          type="button"
          class="chip"
          :aria-pressed="featureOn[f.id]"
          @click="featureOn[f.id] = !featureOn[f.id]"
        >
          <span class="dot" aria-hidden="true" />{{ f.label }}
        </button>
      </div>
      <div ref="stage" data-goop-stage class="stage grid min-h-64 flex-1 place-items-center px-4 pb-14 pt-10" :style="stageStyle">
        <div :key="finish" class="flex flex-wrap items-center justify-center gap-4">
          <GoopButtonDemo :options="finish === 'oil' ? { finish: 'oil' } : {}">Button</GoopButtonDemo>
          <GoopButtonDemo variant="goo" shape="pill" :options="finish === 'oil' ? { finish: 'oil' } : {}">Pill</GoopButtonDemo>
          <GoopButtonDemo variant="destructive" size="lg" :options="finish === 'oil' ? { finish: 'oil' } : {}">Delete</GoopButtonDemo>
        </div>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <span class="pl-1 text-xs text-muted-foreground">Hover, swipe through fast, click.</span>
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

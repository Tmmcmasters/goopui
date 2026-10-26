<script setup lang="ts">
// The GoopButton props reference. Two parts:
//   - the component's own props (variant, size, asChild, ...): listed here, since they live
//     in the component, not the engine;
//   - every engine prop, generated from GOOP_VAR_META (core) and the prop lists exported by
//     @goopui/vue (ENGINE_OPTION_KEYS, FEATURE_KEYS), so a new core option appears here
//     without touching this file.
//   :goop-button-props            -> both tables
//   :goop-button-props{part="own"} / {part="engine"}
import { ENGINE_OPTION_KEYS, isGoopFeature } from '@goopui/vue'

const props = withDefaults(defineProps<{ part?: 'own' | 'engine' | 'all' }>(), { part: 'all' })

const own = [
  { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'`, def: `'default'`, note: 'Same as shadcn. The goo takes the variant\'s color: tinted for destructive, a goo stroke for outline, hover-only for ghost. Link has no goo.' },
  { prop: 'size', type: `'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'`, def: `'default'`, note: 'Same as shadcn.' },
  { prop: 'asChild', type: 'boolean', def: 'false', note: 'Render your own child (a NuxtLink, an <a>) with the button\'s classes and goo, via reka-ui Primitive.' },
  { prop: 'as', type: 'string | Component', def: `'button'`, note: 'The element to render.' },
  { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn. Utilities such as bg-*, rounded-*, and [--goop-color:...] win over the variant.' },
  { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables the button. Drips already running finish; nothing new starts.' },
  { prop: 'goo', type: 'boolean', def: 'true (false for link)', note: 'Master switch. false renders a plain shadcn Button.' },
  { prop: 'goop', type: 'GoopOptions', def: '', note: 'Escape hatch: any engine option as an object. The explicit props below win over it.' },
]

// Props that core gives no var metadata for (not CSS-tunable), so describe them here.
const extra: Record<string, { type: string; def: string; note: string }> = {
  renderer: { type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn. finish="oil" upgrades to canvas.' },
  drips: { type: 'boolean', def: 'true', note: 'false keeps the goo body and squish but never drips.' },
  interactive: { type: 'boolean', def: 'true', note: 'false ignores the pointer (static or script-driven goo).' },
  tilt: { type: 'boolean', def: 'true', note: 'Lean toward the pointer.' },
  reducedMotion: { type: `boolean | 'auto'`, def: `'auto'`, note: 'Force reduced motion on, or ignore the OS setting with false.' },
  seed: { type: 'number', def: 'per instance', note: 'Seed for the random drips, so a button looks the same on every render.' },
  timeScale: { type: 'number', def: '1', note: 'Per-instance time scale: 0.3 runs this button in slow motion.' },
  escapeRenderer: { type: `'svg' | 'canvas'`, def: `'canvas'`, note: 'Renderer for splashes that leave the button.' },
}

const featureNote = 'Boolean: false turns it off, true uses the preset\'s strength, a number tunes it.'
const engine = computed(() => {
  const groups = varGroups()
  const covered = new Set(ALL_VARS.map((m) => m.option))
  const rest = ENGINE_OPTION_KEYS.filter((k) => !covered.has(k)).map((k) => ({ prop: k, ...(extra[k] ?? { type: '', def: '', note: '' }) }))
  return { groups, rest }
})

const typeOf = (m: VarMeta) => {
  if (m.values) return m.values.map((v) => `'${v}'`).join(' | ')
  const base = m.option === 'restingDrips' ? 'number | number[] | object[]' : 'number'
  return isGoopFeature(m.option) ? `boolean | ${base}` : base
}
</script>

<template>
  <div class="not-prose my-6 space-y-6">
    <div v-if="part !== 'engine'" class="overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
      <table class="props w-full min-w-[40rem] table-fixed text-sm">
        <caption class="sr-only">GoopButton component props</caption>
        <colgroup>
          <col class="w-[16%]" />
          <col class="w-[34%]" />
          <col class="w-[14%]" />
          <col />
        </colgroup>
        <thead>
          <tr><th>Prop</th><th>Type</th><th>Default</th><th>Notes</th></tr>
        </thead>
        <tbody>
          <tr v-for="p in own" :key="p.prop">
            <td><code>{{ p.prop }}</code></td>
            <td class="mono">{{ p.type }}</td>
            <td class="mono">{{ p.def }}</td>
            <td class="text-muted-foreground">{{ p.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="part !== 'own'" class="overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
      <table class="props w-full min-w-[40rem] table-fixed text-sm">
        <caption class="sr-only">GoopButton engine props, generated from GOOP_VAR_META</caption>
        <colgroup>
          <col class="w-[20%]" />
          <col class="w-[26%]" />
          <col class="w-[10%]" />
          <col />
        </colgroup>
        <thead>
          <tr><th>Prop</th><th>Type</th><th>Default</th><th>What it does</th></tr>
        </thead>
        <tbody v-for="g in engine.groups" :key="g.group">
          <tr class="group-row"><th colspan="4">{{ g.group }}</th></tr>
          <tr v-for="m in g.vars" :key="m.option">
            <td>
              <code>{{ m.option }}</code>
              <div class="mt-1 font-mono text-[11px] text-subtle">{{ m.name }}</div>
            </td>
            <td class="mono">
              {{ typeOf(m) }}
              <div v-if="!m.values && m.unit" class="text-subtle">{{ rangeText(m) }} {{ m.unit }}</div>
            </td>
            <td class="mono">{{ m.default }}</td>
            <td class="text-muted-foreground">
              {{ m.description }}
              <div v-if="isGoopFeature(m.option)" class="mt-1 text-[12px] text-subtle">{{ featureNote }}</div>
            </td>
          </tr>
        </tbody>
        <tbody>
          <tr class="group-row"><th colspan="4">Also</th></tr>
          <tr v-for="p in engine.rest" :key="p.prop">
            <td><code>{{ p.prop }}</code></td>
            <td class="mono">{{ p.type }}</td>
            <td class="mono">{{ p.def }}</td>
            <td class="text-muted-foreground">{{ p.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.props th,
.props td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--border);
}
.props thead th {
  background: var(--card);
  font-weight: 500;
}
.props tbody:last-child tr:last-child td {
  border-bottom: 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.group-row th {
  padding-top: 1.1rem;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--subtle);
}
</style>

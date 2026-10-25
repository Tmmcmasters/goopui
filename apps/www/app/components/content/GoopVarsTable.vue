<script setup lang="ts">
// Generated from @goopui/core: names, defaults, and ranges come straight from the
// engine's exports, so this table can't drift. Words and grouping live in
// utils/goopDocs.ts; a knob core adds later shows up under "More" automatically.
//   :goop-vars-table                 -> every tuning group
//   :goop-vars-table{group="splash"} -> one group
//   :goop-vars-table{group="finish"} -> the oil finish vars
import { GOOP_DEFAULT_SPLASH, GOOP_SPLASH_VAR } from '@goopui/core'

const props = defineProps<{ group?: string }>()

const sections = computed(() => {
  const groups = knobGroups()
    .filter((g) => !props.group || g.id === props.group)
    .map((g) => ({
      id: g.id,
      label: g.label,
      rows: g.keys.map((k) => {
        const r = tuningRow(k)
        return { name: r.name, def: String(r.def), range: `${r.range[0]} to ${r.range[1]}`, desc: r.desc }
      }),
    }))
  if (!props.group || props.group === 'splash') {
    const splash = groups.find((g) => g.id === 'splash')
    splash?.rows.unshift({
      name: GOOP_SPLASH_VAR,
      def: GOOP_DEFAULT_SPLASH,
      range: 'near · escape · off',
      desc: "Where splash and shockwave particles go: 'near' stays within about 70px of the element, 'escape' flies across the page in a shared overlay, 'off' has none.",
    })
  }
  if (!props.group || props.group === 'finish') {
    groups.push({
      id: 'finish',
      label: 'Finish',
      rows: [
        { name: '--goop-finish', def: 'solid', range: 'solid · oil', desc: "'oil' adds a thin-film iridescent sheen. Read when the goo attaches; picks the canvas renderer." },
        ...FINISH_ROWS.map((r) => ({ name: r.name, def: String(r.def), range: '', desc: r.desc })),
      ],
    })
  }
  return groups
})
const showHeadings = computed(() => !props.group)
</script>

<template>
  <div class="vars-table my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="!my-0 min-w-[38rem]">
      <thead>
        <tr>
          <th class="!pl-4">Variable</th>
          <th>Default</th>
          <th>Range</th>
          <th>What it does</th>
        </tr>
      </thead>
      <tbody v-for="s in sections" :key="s.id">
        <tr v-if="showHeadings" class="group-row">
          <th colspan="4" class="!pl-4">{{ s.label }}</th>
        </tr>
        <tr v-for="r in s.rows" :key="r.name">
          <td class="!pl-4"><code class="whitespace-nowrap">{{ r.name }}</code></td>
          <td class="font-mono text-[13px] tabular-nums">{{ r.def }}</td>
          <td class="whitespace-nowrap font-mono text-[13px] tabular-nums text-muted-foreground">{{ r.range }}</td>
          <td class="text-muted-foreground">{{ r.desc }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.vars-table tbody:last-child tr:last-child td {
  border-bottom: 0;
}
.vars-table thead th {
  background: var(--card);
  padding-top: 0.65rem;
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

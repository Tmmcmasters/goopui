<script setup lang="ts">
// Generated from @goopui/core: names, defaults, and clamps come straight from
// GOOP_CSS_VARS / GOOP_DEFAULTS / GOOP_LIMITS, so this table can't drift from the engine.
// Descriptions mirror the JSDoc on GoopTuning in packages/core/src/constants.ts.
import { GOOP_CSS_VARS, GOOP_DEFAULTS, GOOP_LIMITS, type GoopTuning } from '@goopui/core'

const DESCRIPTIONS: Record<keyof GoopTuning, string> = {
  blur: 'Blur radius (stdDeviation) of the goo filter, in px. Higher gives blobbier shapes, wider necks, and rounder corners. Keep it below the drip size or small drips disappear.',
  contrast: 'Alpha multiplier after the blur. Higher gives a crisper goo edge.',
  threshold: 'Blurred alpha level (0 to 1) that becomes the edge. Lower makes shapes bulge out and merge from further away. Higher gives tighter, thinner necks.',
  dripCount: 'Max drips per hover. Each hover picks 1 to N at random, capped by the element width.',
  dripLength: 'How far the bulb hangs below the edge before it detaches, in px.',
  dripSize: 'Bulb radius at full swell, in px (randomized a little).',
  viscosity: 'Global thickness multiplier. Above 1 is slower and less bouncy, like honey. Below 1 is quicker and springier.',
  fall: 'Average distance a detached drop falls before it fades out, in px (32 gives about 24 to 40).',
  gravity: 'Acceleration of detached drops, in px/s².',
  squish: 'How much the body compresses vertically on press (0 to 0.4). 0 turns it off.',
  restingDrips: 'Static drips that always hang off the bottom edge. These stay in reduced-motion mode.',
}

const rows = (Object.keys(GOOP_DEFAULTS) as (keyof GoopTuning)[]).map((k) => ({
  key: k,
  name: GOOP_CSS_VARS[k],
  def: GOOP_DEFAULTS[k],
  range: GOOP_LIMITS[k],
  desc: DESCRIPTIONS[k],
}))
</script>

<template>
  <div class="vars-table my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="!my-0 min-w-[36rem]">
      <thead>
        <tr>
          <th class="!pl-4">Variable</th>
          <th>Default</th>
          <th>Range</th>
          <th>What it does</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.key">
          <td class="!pl-4"><code class="whitespace-nowrap">{{ r.name }}</code></td>
          <td class="font-mono text-[13px] tabular-nums">{{ r.def }}</td>
          <td class="whitespace-nowrap font-mono text-[13px] tabular-nums text-muted-foreground">{{ r.range[0] }} to {{ r.range[1] }}</td>
          <td class="text-muted-foreground">{{ r.desc }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.vars-table tr:last-child td {
  border-bottom: 0;
}
.vars-table th {
  background: var(--card);
  padding-top: 0.65rem;
}
</style>

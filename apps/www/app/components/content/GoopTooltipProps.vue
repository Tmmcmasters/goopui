<script setup lang="ts">
// Goo props of GoopTooltipContent. Everything else is reka-ui's TooltipContent. Defaults
// match toTooltipOptions in packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn TooltipContent.' },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'A small bulb and lumpy neck between the trigger and the tooltip.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot and wobble.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The tooltip launches away from the trigger, stretching the neck until it snaps.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The text fades in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true (0.4)', note: 'On open, the far edge bulges and wobbles. true is a light 0.4; a number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'false', note: 'Drops fling off the far edge. Off by default, since at tooltip size they read as noise. true or a number from 0 to 2 turns them on.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Burst drop count, 0 to 3. Only matters when openDrips is on.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Burst drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and close (off-centre, one or two lumps, staggered), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true (0.5)', note: 'On close, the near edge sloshes against the trigger. true is a light 0.5; a number from 0 to 2 sets the strength.' },
  { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `'popover' is shadcn's inverted tooltip (foreground goo, background text). 'trigger' takes the trigger's background and text color. Any CSS color works, and the arrow follows.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <div class="not-prose my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="props w-full min-w-[40rem] table-fixed text-sm">
      <caption class="sr-only">GoopTooltipContent goo props</caption>
      <colgroup>
        <col class="w-[18%]" />
        <col class="w-[24%]" />
        <col class="w-[14%]" />
        <col />
      </colgroup>
      <thead>
        <tr><th>Prop</th><th>Type</th><th>Default</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr v-for="p in rows" :key="p.prop">
          <td><code>{{ p.prop }}</code></td>
          <td class="mono">{{ p.type }}</td>
          <td class="mono">{{ p.def }}</td>
          <td class="text-muted-foreground">{{ p.note }}</td>
        </tr>
      </tbody>
    </table>
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
.props tbody tr:last-child td {
  border-bottom: 0;
}
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
</style>

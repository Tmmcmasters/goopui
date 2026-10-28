<script setup lang="ts">
// Goo props of GoopPopoverContent. Everything else is reka-ui's PopoverContent. Defaults
// match packages/vue/src/components/popover/GoopPopoverContent.vue.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn PopoverContent.' },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the trigger and the panel.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot and wobble.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The panel launches away from the trigger, stretching the neck until it snaps.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The content fades in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true', note: 'On open, the far edge bulges past rest, rebounds, and wobbles. A number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'true', note: 'On open, the far edge bursts: globs, drops, and specks fling off, fall, and fade. A number from 0 to 2 sets the strength.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Burst drop count, 0 to 3, times the preset\'s count.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Burst drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung before they fall, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of big globs and specks, and how uneven the spray is, 0 to 1. 0 makes every drop alike.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true', note: 'On close, the goo lags and the near edge sloshes against the trigger. A number from 0 to 2 sets the strength.' },
  { prop: 'surface', type: `'trigger' | 'popover' | string`, def: `'trigger'`, note: `The panel's color. 'trigger' takes the trigger's background and text color, falling back to the theme's primary when the trigger has none. 'popover' uses shadcn's popover tokens. Any CSS color also works.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <div class="not-prose my-6 overflow-x-auto rounded-xl border border-border" data-lenis-prevent-horizontal>
    <table class="props w-full min-w-[40rem] table-fixed text-sm">
      <caption class="sr-only">GoopPopoverContent goo props</caption>
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

<script setup lang="ts">
// Goo props of GoopTooltipContent. Everything else is reka-ui's TooltipContent. Defaults
// match toTooltipOptions in packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn TooltipContent.' },
  { prop: 'flow', type: 'boolean', def: 'true', note: 'Flow open, in flowStyle. false: the tooltip inflates from a small bulb at the trigger edge (bridge and momentum apply, no drips by default).' },
  { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from the tooltip's own center, spreads out with a lobed edge, overshoots, and settles. 'neck' runs out of the trigger through a thick neck.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: 'How the bloom starts: one droplet swells, or a few drops fuse.' },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'A small bulb and lumpy neck between the trigger and the tooltip. Not used by bloom.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot and wobble (bloom: the open overshoot and settle).' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The tooltip launches away from the trigger, stretching the neck until it snaps. Not used by bloom.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The text (and the arrow) fades in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true (0.4)', note: 'On open, the far edge (bloom: every edge) bulges and wobbles. true is a light 0.4; a number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'bloom: on (light); bulb: false', note: 'Bloom: a light splash of a few small drops that keep off the trigger. false turns it off; a number from 0 to 2 or the openDrip* knobs turn it up. With flow off, drops are off unless you turn them on.' },
  { prop: 'openDripAmount', type: 'number', def: '1 (bloom 0.3)', note: 'Drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1 (bloom 0.6)', note: 'Drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1 (bloom 0.6)', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and sloshes on close (off-centre, one or two lumps, staggered; re-rolled every open), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true (0.5)', note: 'On close, the near edge sloshes against the trigger (bloom: the inward pull and wobble before it shrinks to the center). true is a light 0.5; a number from 0 to 2 sets the strength.' },
  { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `'popover' is shadcn's inverted tooltip (foreground goo, background text). 'trigger' takes the trigger's background and text color. Any CSS color works, and the arrow follows.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopTooltipContent goo props" />
</template>

<script setup lang="ts">
// Goo props of GoopPopoverContent. Everything else is reka-ui's PopoverContent. Defaults
// match packages/vue/src/components/popover/GoopPopoverContent.vue.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn PopoverContent.' },
  { prop: 'flow', type: 'boolean', def: 'true', note: 'Flow open, in flowStyle. false: the panel inflates from a bulb at the trigger edge (bridge and momentum apply).' },
  { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from the panel's own center, spreads out with a lobed edge, overshoots, and splashes all around, keeping drops off the trigger. 'neck' runs out of the trigger through a thick neck and pinches off.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `How the bloom starts: one droplet swells, or a few drops fuse.` },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the trigger and the panel. Not used by bloom.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot and wobble (bloom: the open overshoot and settle).' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The panel launches away from the trigger, stretching the neck until it snaps. Not used by bloom.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The content fades in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true', note: 'On open, the far edge (bloom: every edge) bulges past rest, rebounds, and wobbles. A number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'true', note: 'On open, the far edge (bloom: every edge) bursts: globs, drops, and specks fling off, fall, and fade. A number from 0 to 2 sets the strength.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: `Burst drop count, 0 to 3, times the preset's count.` },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Burst drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung before they fall, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of big globs and specks, and how uneven the spray is, 0 to 1. 0 makes every drop alike.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and sloshes on close (off-centre, one or two lumps, staggered; re-rolled every open), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true', note: 'On close, the goo lags and the near edge sloshes against the trigger (bloom: the panel pulls in and wobbles before it shrinks to the center). A number from 0 to 2 sets the strength.' },
  { prop: 'surface', type: `'trigger' | 'popover' | string`, def: `'trigger'`, note: `The panel's color. 'trigger' takes the trigger's background and text color, falling back to the theme's primary when the trigger has none. 'popover' uses shadcn's popover tokens. Any CSS color also works.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopPopoverContent goo props" />
</template>

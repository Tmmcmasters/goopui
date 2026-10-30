<script setup lang="ts">
// Goo props of GoopDropdownMenuContent / GoopDropdownMenuSubContent. Everything else is
// reka-ui's DropdownMenuContent. Unset toggles inherit from the parent menu (submenus), then
// default to on. See GoopMenuProps in packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn DropdownMenu parts.' },
  { prop: 'flow', type: 'boolean', def: 'true', note: 'Flow open, in flowStyle. Submenus flow out of their row. false: the menu inflates from a bulb at the trigger edge.' },
  { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from the menu's own center, spreads out with a lobed edge, overshoots, and splashes all around, keeping drops off the trigger. 'neck' runs out of the trigger through a thick neck. Submenus inherit it.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: 'How the bloom starts: one droplet swells, or a few drops fuse.' },
  { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the trigger (or submenu row) and the panel. Not used by bloom.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot: panel wobble (bloom: the open overshoot and settle), highlight overshoot, grow-in.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: `The panel's launch (not used by bloom), and the highlight's stretch and neck while it travels.` },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
  { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, the far edge (bloom: every edge) overshoots, rebounds, and wobbles.' },
  { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, the far edge (bloom: every edge, drops kept off the trigger) bursts: globs, drops, and specks fling off and fall away.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Burst drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Burst drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and sloshes on close (off-centre, one or two lumps, staggered; re-rolled every open), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the goo lags and the near edge sloshes against the trigger (bloom: the panel pulls in and wobbles before it shrinks to the center).' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that slides between items and follows the keyboard. false gives shadcn's flat background.` },
  { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is selected, before the menu closes.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell (its neck while it slides, and a soft bulge as the pointer moves along an item) follows the pointer with a little lag. false, or the keyboard: centred.` },
  { prop: 'submenus', type: 'boolean', def: 'true', note: 'Submenus emerge from their row. false gives plain shadcn submenus.' },
  { prop: 'surface', type: `'trigger' | 'popover' | string`, def: `'trigger'`, note: `The panel's color. 'trigger' takes the trigger's background and text color, falling back to the theme's primary. 'popover' uses shadcn's popover tokens. Any CSS color works. Submenus reuse their parent's resolved colors.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopDropdownMenuContent goo props" />
</template>

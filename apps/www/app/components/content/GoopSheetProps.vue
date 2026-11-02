<script setup lang="ts">
// Props of GoopSheetContent on top of reka-ui's DialogContent. Defaults match
// packages/vue/src/components/sheet/GoopSheetContent.vue and toSheetOptions in goop-props.ts.
import type { PropRow } from '~/components/docs/PropsTable.vue'

const rows: PropRow[] = [
  { prop: 'side', type: `'top' | 'right' | 'bottom' | 'left'`, def: `'right'`, note: 'The screen edge the sheet comes in from. The goo blooms from the middle of it.' },
  { prop: 'showCloseButton', type: 'boolean', def: 'true', note: 'Show the X close button in the top-right corner, like shadcn.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders a plain shadcn SheetContent that slides in and out.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: 'How the bloom starts: one droplet swells at the edge, or a few drops fuse.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'The open overshoot past the inner edge and its jelly settle.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The content fades in once the goo has mostly spread, and out first on close.' },
  { prop: 'openSlosh', type: 'boolean | number', def: 'true', note: 'On open, the edges bulge past rest, rebound, and wobble. A number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: 'true', note: 'On open, the big splash: globs, drops, and specks fling off the inner edge and sides, fall, and fade. None go off-screen. A number from 0 to 2 sets the strength.' },
  { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung before they fall, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of big globs and specks, and how uneven the spray is, 0 to 1. 0 makes every drop alike.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and close (off-centre, one or two lumps, staggered), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: 'true', note: 'On close, the goo pulls in and wobbles before it shrinks back into the edge. A number from 0 to 2 sets the strength.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `app config, then 'canvas'`, note: 'How the goo is drawn. A sheet is a big surface, so it uses canvas unless you or the app config say otherwise.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopSheetContent props" />
</template>

<script setup lang="ts">
// Goo props of GoopDialogContent / GoopAlertDialogContent (GoopDialogProps in
// packages/vue/src/goop-props.ts). `kind="alert"` shows the alert dialog's lighter defaults
// (core ALERT_DIALOG_MOMENTUM / ALERT_DIALOG_SPLASH).
import type { PropRow } from '../docs/PropsTable.vue'

const props = withDefaults(defineProps<{ kind?: 'dialog' | 'alert' }>(), { kind: 'dialog' })
const alert = computed(() => props.kind === 'alert')

const rows = computed<PropRow[]>(() => [
  { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders a plain shadcn ${alert.value ? 'AlertDialogContent' : 'DialogContent'} and overlay.` },
  { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: 'How the bloom starts: one droplet swells, or a few drops fuse.' },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'The open overshoot past every side and its jelly settle.' },
  { prop: 'fade', type: 'boolean', def: 'true', note: 'The content fades in once the goo has mostly spread, and out first on close.' },
  { prop: 'openSlosh', type: 'boolean | number', def: alert.value ? '0.6' : 'true', note: 'On open, every edge bulges past rest, rebounds, and wobbles. A number from 0 to 2 sets the strength.' },
  { prop: 'openDrips', type: 'boolean | number', def: alert.value ? '1 (light knobs)' : 'true', note: 'On open, the big all-around splash: globs, drops, and specks fling off every side, fall, and fade. A number from 0 to 2 sets the strength.' },
  { prop: 'openDripAmount', type: 'number', def: alert.value ? '0.35' : '1', note: 'Splash drop count, 0 to 3.' },
  { prop: 'openDripSize', type: 'number', def: alert.value ? '0.75' : '1', note: 'Splash drop size, 0.3 to 2.5.' },
  { prop: 'openDripFling', type: 'number', def: alert.value ? '0.6' : '1', note: 'How far the drops are flung before they fall, 0 to 3.' },
  { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of big globs and specks, and how uneven the spray is, 0 to 1. 0 makes every drop alike.' },
  { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and close (off-centre, one or two lumps, staggered), 0 to 1. 0 is an even, centred bulge.' },
  { prop: 'closeSlosh', type: 'boolean | number', def: alert.value ? '0.7' : 'true', note: 'On close, the panel pulls in and wobbles before it shrinks to the center. A number from 0 to 2 sets the strength.' },
  { prop: 'overlay', type: 'boolean', def: 'false', note: `Opt-in goo overlay: the dimmed backdrop pours down over the page and drains off the bottom on close. false keeps shadcn's fading overlay.` },
  { prop: 'overlayDrips', type: 'boolean | number', def: 'true', note: `The goo overlay's leading edge runs ahead in drips. false is a straight edge, a number from 0 to 2 sets the strength. Only with overlay.` },
  { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The panel's color. 'popover' is the content's own shadcn background. 'trigger' takes the trigger's background and text color. Any CSS color also works.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier, for the panel and the overlay.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn, for the panel and the overlay.' },
])
</script>

<template>
  <DocsPropsTable :rows="rows" :caption="alert ? 'GoopAlertDialogContent goo props' : 'GoopDialogContent goo props'" />
</template>

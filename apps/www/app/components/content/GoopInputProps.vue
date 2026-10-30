<script setup lang="ts">
// Props of GoopInput / GoopTextarea (they share them). Effects are core's INPUT_EFFECTS;
// defaults match packages/core/src/input.ts (INPUT_DEFAULT_EFFECTS) and the vue components.
import type { PropRow } from '../docs/PropsTable.vue'

const fx = 'boolean | number'
const rows: PropRow[] = [
  { prop: 'modelValue', type: 'string | number', def: '', note: 'The value (v-model).' },
  { prop: 'defaultValue', type: 'string | number', def: '', note: 'The initial value when uncontrolled.' },
  { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the field, like shadcn.' },
  { prop: 'containerClass', type: 'string | array | object', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the goo layer. Set width or margins here.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Input or Textarea, with no wrapper.' },
  { prop: 'flow', type: fx, def: 'true', note: 'On focus, goo flows around the border from the click point (the left edge on keyboard focus). Off: the ring appears at once.' },
  { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
  { prop: 'ripple', type: fx, def: 'true', note: 'Each edit sends a small ripple along the ring from the point nearest the caret.' },
  { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while the field is focused.' },
  { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first. Off: it disappears at once.' },
  { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid, a small drip hangs off the bottom of the destructive ring.' },
  { prop: 'drips', type: fx, def: 'false', note: 'Resting drips: small drips hang under the ring while it shows. Off by default.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring thickness, flow and drain timing, wobble and ripple strength.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopInput and GoopTextarea props" />
</template>

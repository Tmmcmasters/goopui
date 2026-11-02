<script setup lang="ts">
// Props of GoopNumberField. Effects are core's NUMBER_FIELD_EFFECTS (the Input's ring effects
// plus squish and nudge); defaults match packages/core/src/number-field.ts and input.ts.
import type { PropRow } from '../docs/PropsTable.vue'

const fx = 'boolean | number'
const rows: PropRow[] = [
  { prop: 'modelValue', type: 'number | null', def: '', note: 'The value (v-model).' },
  { prop: 'defaultValue', type: 'number', def: '', note: 'The initial value when uncontrolled.' },
  { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn NumberField.' },
  { prop: 'squish', type: fx, def: 'true', note: 'Pressing + or - swells a goo dollop under it, squished low and wide; letting go springs it back with a small wobble.' },
  { prop: 'nudge', type: fx, def: 'true', note: 'Each step shoves the dollop toward the side you pressed and sends a ripple along the ring from that side.' },
  { prop: 'flow', type: fx, def: 'true', note: 'On focus the ring flows around the border from the click point (or the button you pressed).' },
  { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
  { prop: 'ripple', type: fx, def: 'true', note: 'Typing sends a ripple along the ring from the caret.' },
  { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while focused.' },
  { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first.' },
  { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid on the input, a small drip hangs off the destructive ring.' },
  { prop: 'drips', type: fx, def: 'false', note: 'Resting drips under the ring while it shows.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring and dollop size, squish depth, nudge distance.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopNumberField props" />
</template>

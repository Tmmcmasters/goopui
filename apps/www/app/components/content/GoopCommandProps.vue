<script setup lang="ts">
// Goo props of GoopCommand (its input and items read them). Everything else is reka-ui's
// ListboxRoot. Unset toggles default to on. See GoopCommandProps in packages/vue/src/goop-props.ts.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Command parts.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The active item is a goo blob that glides between items, following the arrow keys and the pointer. false gives shadcn's flat background.` },
  { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is chosen.' },
  { prop: 'ring', type: 'boolean', def: 'true', note: `The search input gets GoopInput's goo focus ring. A GoopCommandInput's own goo prop overrides it.` },
  { prop: 'wobble', type: 'boolean', def: 'true', note: `Jelly overshoot: the highlight's overshoot and grow-in, and the ring's idle wobble.` },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The highlight stretches and necks toward where it came from as it travels.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell follows the pointer with a little lag. From the keyboard it stays centred.` },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopCommand goo props" />
</template>

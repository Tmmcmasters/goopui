<script setup lang="ts">
// Goo props of GoopAccordion and GoopCollapsible (the roots; items, triggers and content follow
// them). See GoopAccordionProps in packages/vue/src/goop-props.ts and core ACCORDION_EFFECTS.
const rows = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Accordion / Collapsible.' },
  { prop: 'flood', type: 'boolean | number', def: 'true', note: 'The trigger row floods with goo from the click point on open and drains back into it on close. Off, the fill snaps.' },
  { prop: 'wobble', type: 'boolean | number', def: 'true', note: 'The crest of the flood front, and a jelly wobble of the row once it is full.' },
  { prop: 'droplets', type: 'boolean | number', def: 'true', note: `A few droplets splash off the row's top edge as it floods.` },
  { prop: 'jelly', type: 'boolean | number', def: 'true', note: 'The content opens on a jelly spring: overshoot, then settle.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]
</script>

<template>
  <DocsPropsTable :rows="rows" caption="GoopAccordion and GoopCollapsible goo props" />
</template>

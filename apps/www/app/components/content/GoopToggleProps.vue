<script setup lang="ts">
// Props of GoopToggle (`part="toggle"`) and GoopToggleGroup (`part="group"`). Effects are core's
// TOGGLE_EFFECTS / TOGGLE_GROUP_EFFECTS (all on by default); the rest matches the vue components.
import type { PropRow } from '../docs/PropsTable.vue'

const props = withDefaults(defineProps<{ part?: 'toggle' | 'group' }>(), { part: 'toggle' })

const fx = 'boolean | number'
const variant = `'default' | 'outline'`
const size = `'default' | 'sm' | 'lg'`
const effects: PropRow[] = [
  { prop: 'flood', type: fx, def: 'true', note: 'Pressing floods the item with goo from the press point (its center for keyboard presses); un-pressing drains it back there. Off: the fill snaps.' },
  { prop: 'wobble', type: fx, def: 'true', note: 'The crest of the flood front sloshing against the walls, and a jelly wobble once full.' },
  { prop: 'droplets', type: fx, def: 'true', note: 'A few droplets splash off the top edge as the front reaches it.' },
]
const engine: PropRow[] = [
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

const toggle: PropRow[] = [
  { prop: 'modelValue', type: 'boolean', def: '', note: 'The pressed state (v-model).' },
  { prop: 'defaultValue', type: 'boolean', def: 'false', note: 'The initial pressed state when uncontrolled.' },
  { prop: 'variant', type: variant, def: `'default'`, note: 'Same as shadcn.' },
  { prop: 'size', type: size, def: `'default'`, note: 'Same as shadcn.' },
  { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
  { prop: 'name, required', type: '', def: '', note: 'Passed to reka-ui.' },
  { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
  { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the button.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Toggle.' },
  ...effects,
  ...engine,
]

const group: PropRow[] = [
  { prop: 'type', type: `'single' | 'multiple'`, def: '', note: 'single: at most one pressed item, and the value is that item\'s. multiple: an array.' },
  { prop: 'modelValue', type: 'value | value[]', def: '', note: 'The pressed value(s) (v-model).' },
  { prop: 'defaultValue', type: 'value | value[]', def: '', note: 'The initial value when uncontrolled.' },
  { prop: 'variant', type: variant, def: '', note: 'Shared with every item.' },
  { prop: 'size', type: size, def: '', note: 'Shared with every item.' },
  { prop: 'spacing', type: 'number', def: '0', note: 'Gap between items in Tailwind spacing units. 0 joins them, like shadcn.' },
  { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: '', note: 'Arrow-key direction, via reka-ui.' },
  { prop: 'rovingFocus', type: 'boolean', def: 'true', note: 'Arrow keys move focus between items.' },
  { prop: 'loop', type: 'boolean', def: 'true', note: 'Arrow keys wrap around.' },
  { prop: 'dir', type: `'ltr' | 'rtl'`, def: '', note: 'Reading direction.' },
  { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables every item.' },
  { prop: 'name, required', type: '', def: '', note: 'Passed to reka-ui.' },
  { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
  { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ToggleGroup.' },
  ...effects,
  { prop: 'flow', type: fx, def: 'true', note: 'Single mode: the old item drains toward the new one, its goo stretches out on a neck, pinches off, travels over the items between and floods the new item from that side.' },
  { prop: 'merge', type: fx, def: 'true', note: 'Neighbouring pressed items join through goo bridges across their seam, and tear apart when one is un-pressed.' },
  ...engine,
]

const rows = computed(() => (props.part === 'group' ? group : toggle))
</script>

<template>
  <DocsPropsTable :rows="rows" :caption="part === 'group' ? 'GoopToggleGroup props' : 'GoopToggle props'" />
</template>

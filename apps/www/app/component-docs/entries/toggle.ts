import { choice, color, effect, preset, speed } from '../controls'
import { defineComponentDoc, type PropRow } from '../types'

const fx = 'boolean | number'
const variant = `'default' | 'outline'`
const size = `'default' | 'sm' | 'lg'`
const effects: PropRow[] = [
  { prop: 'flood', type: fx, def: 'true', note: 'Pressing floods the item with goo from the press point (its center for keyboard presses); un-pressing drains it back there. Off: the fill snaps.' },
  { prop: 'wobble', type: fx, def: 'true', note: 'The crest of the flood front sloshing against the walls, and a jelly wobble once full.' },
  { prop: 'droplets', type: fx, def: 'true', note: 'A few droplets splash off the top edge as the front reaches it.' },
]
const engine: PropRow[] = [
  { prop: 'textFollow', type: 'boolean', def: 'true', note: "The label's color follows the goo's edge. false flips it all at once." },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

export default defineComponentDoc({
  slug: 'toggle',
  title: 'Toggle',
  category: 'Actions',
  component: 'GoopToggle',
  code: `<script setup lang="ts">
const bold = ref(false)
</script>

<template>
  <GoopToggle v-model="bold" aria-label="Toggle bold"{{main}}>
    <span class="font-bold">B</span> Bold
  </GoopToggle>
</template>`,
  controls: [
    preset(),
    color({ cssVar: '--accent', description: 'Sets --accent, the token a pressed toggle fills with.' }),
    choice('variant', ['default', 'outline'], 'default'),
    choice('size', ['default', 'sm', 'lg'], 'default'),
    speed(),
    effect('flood'),
    effect('wobble'),
    effect('droplets'),
  ],
  reactCode: `import { GoopToggle } from '@goopui/react'
import { useState } from 'react'

export function Bold() {
  const [bold, setBold] = useState(false)
  return (
    <GoopToggle pressed={bold} onPressedChange={setBold} aria-label="Toggle bold"{{main}}>
      <span className="font-bold">B</span> Bold
    </GoopToggle>
  )
}`,
  reactTables: {
    main: {
      caption: 'GoopToggle props',
      rows: [
        { prop: 'pressed', type: 'boolean', def: '', note: 'The controlled pressed state. Pair it with onPressedChange.' },
        { prop: 'defaultPressed', type: 'boolean', def: 'false', note: 'The initial pressed state when uncontrolled.' },
        { prop: 'onPressedChange', type: '(pressed: boolean) => void', def: '', note: 'Called when the state changes.' },
        { prop: 'variant', type: variant, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'size', type: size, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Render the child element instead, via Radix.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the button.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Toggle.' },
        { prop: 'goopRef', type: 'Ref<ToggleHandle>', def: '', note: 'The live engine handle (null before mount or with goo off). ref is the button.' },
        ...effects,
        ...engine,
      ],
    },
    group: {
      caption: 'GoopToggleGroup props',
      rows: [
        { prop: 'type', type: `'single' | 'multiple'`, def: '', note: "Required. single: at most one pressed item, and the value is that item's. multiple: an array." },
        { prop: 'value', type: 'string | string[]', def: '', note: 'The controlled value(s). Pair it with onValueChange.' },
        { prop: 'defaultValue', type: 'string | string[]', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'onValueChange', type: '(value) => void', def: '', note: 'Called when the pressed items change.' },
        { prop: 'variant', type: variant, def: '', note: 'Shared with every item.' },
        { prop: 'size', type: size, def: '', note: 'Shared with every item.' },
        { prop: 'spacing', type: 'number', def: '0', note: 'Gap between items in Tailwind spacing units. 0 joins them, like shadcn/ui.' },
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Layout and arrow-key direction.' },
        { prop: 'rovingFocus', type: 'boolean', def: 'true', note: 'Arrow keys move focus between items.' },
        { prop: 'loop', type: 'boolean', def: 'true', note: 'Arrow keys wrap around.' },
        { prop: 'dir', type: `'ltr' | 'rtl'`, def: '', note: 'Reading direction.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables every item.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Passed to Radix.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ToggleGroup.' },
        { prop: 'goopRef', type: 'Ref<ToggleHandle>', def: '', note: 'The live engine handle (null before mount or with goo off). ref is the root.' },
        ...effects,
        { prop: 'flow', type: fx, def: 'true', note: 'Single mode: the old item drains toward the new one, its goo stretches out on a neck, pinches off, travels over the items between and floods the new item from that side.' },
        { prop: 'merge', type: fx, def: 'true', note: 'Neighbouring pressed items join through goo bridges across their seam, and tear apart when one is un-pressed.' },
        ...engine,
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopToggle props',
      rows: [
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
      ],
    },
    group: {
      caption: 'GoopToggleGroup props',
      rows: [
        { prop: 'type', type: `'single' | 'multiple'`, def: '', note: "single: at most one pressed item, and the value is that item's. multiple: an array." },
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
      ],
    },
  },
})

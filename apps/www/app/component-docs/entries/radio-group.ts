import { color, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'radio-group',
  title: 'Radio Group',
  category: 'Forms',
  component: 'GoopRadioGroup',
  code: `<script setup lang="ts">
const plan = ref('pro')
</script>

<template>
  <GoopRadioGroup v-model="plan"{{main}}>
    <label class="flex items-center gap-2 text-sm">
      <GoopRadioGroupItem value="free" /> Free
    </label>
    <label class="flex items-center gap-2 text-sm">
      <GoopRadioGroupItem value="pro" /> Pro
    </label>
  </GoopRadioGroup>
</template>`,
  controls: [
    preset(),
    color(),
    speed(),
    effect('bridge'),
    effect('splat'),
    effect('droplets'),
  ],
  reactCode: `import { GoopRadioGroup, GoopRadioGroupItem } from '@goopui/react'
import { useState } from 'react'

export function Plan() {
  const [plan, setPlan] = useState('pro')
  return (
    <GoopRadioGroup value={plan} onValueChange={setPlan}{{main}}>
      <label className="flex items-center gap-2 text-sm">
        <GoopRadioGroupItem value="free" /> Free
      </label>
      <label className="flex items-center gap-2 text-sm">
        <GoopRadioGroupItem value="pro" /> Pro
      </label>
    </GoopRadioGroup>
  )
}`,
  reactTables: {
    main: {
      caption: 'GoopRadioGroup props',
      rows: [
        { prop: 'value', type: 'string', def: '', note: 'The controlled value. Pair it with onValueChange.' },
        { prop: 'defaultValue', type: 'string', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'onValueChange', type: '(value: string) => void', def: '', note: 'Called when the selection changes.' },
        { prop: 'orientation', type: `'vertical' | 'horizontal'`, def: '', note: 'Passed to Radix. It sets arrow-key direction.' },
        { prop: 'dir', type: `'ltr' | 'rtl'`, def: '', note: 'Reading direction.' },
        { prop: 'loop', type: 'boolean', def: 'true', note: 'Arrow keys wrap around.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables every item.' },
        { prop: 'name, required, asChild', type: '', def: '', note: 'Passed to Radix.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root. The default is grid w-full gap-2.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Radio Group.' },
        { prop: 'goopRef', type: 'Ref<RadioGroupHandle>', def: '', note: 'The live engine handle (null before mount or with goo off). ref is the root element.' },
        { prop: 'bridge', type: fx, def: 'true', note: 'The blob stretches from the old item to the new one on a neck that snaps.' },
        { prop: 'splat', type: fx, def: 'true', note: 'The blob lands in the new item with a splat and a wobble.' },
        { prop: 'droplets', type: fx, def: 'true', note: 'A few droplets fly off on landing.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
    item: {
      caption: 'GoopRadioGroupItem props',
      rows: [
        { prop: 'value', type: 'string', def: '', note: "This item's value." },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, required, asChild', type: '', def: '', note: 'Passed to Radix.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the item. Set the size here.' },
        { prop: 'children', type: 'ReactNode', def: '', note: 'Replaces the dot.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopRadioGroup props',
      rows: [
        { prop: 'modelValue', type: 'string | number | boolean | object', def: '', note: 'The controlled value (v-model).' },
        { prop: 'defaultValue', type: 'same', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'orientation', type: `'vertical' | 'horizontal'`, def: '', note: 'Passed to reka-ui. It sets arrow-key direction.' },
        { prop: 'dir', type: `'ltr' | 'rtl'`, def: '', note: 'Reading direction.' },
        { prop: 'loop', type: 'boolean', def: 'true', note: 'Arrow keys wrap around.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: 'Disables every item.' },
        { prop: 'name, required', type: '', def: '', note: 'Passed to reka-ui.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root. The default is grid gap-2 w-full.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Radio Group.' },
        { prop: 'bridge', type: fx, def: 'true', note: 'The blob stretches from the old item to the new one on a neck that snaps.' },
        { prop: 'splat', type: fx, def: 'true', note: 'The blob lands in the new item with a splat and a wobble.' },
        { prop: 'droplets', type: fx, def: 'true', note: 'A few droplets fly off on landing.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
    item: {
      caption: 'GoopRadioGroupItem props',
      rows: [
        { prop: 'value', type: 'string | number | boolean | object', def: '', note: "This item's value." },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, name, required', type: '', def: '', note: 'Passed to reka-ui.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the item. Set the size here.' },
      ],
    },
  },
})

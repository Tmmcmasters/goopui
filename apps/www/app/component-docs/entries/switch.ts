import { choice, color, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'switch',
  title: 'Switch',
  category: 'Forms',
  component: 'GoopSwitch',
  code: `<script setup lang="ts">
const airplane = ref(true)
</script>

<template>
  <GoopSwitch v-model="airplane"{{main}} />
</template>`,
  reactCode: `import { GoopSwitch } from '@goopui/react'
import { useState } from 'react'

export function AirplaneMode() {
  const [airplane, setAirplane] = useState(true)
  return <GoopSwitch checked={airplane} onCheckedChange={setAirplane}{{main}} />
}`,
  controls: [
    preset(),
    color(),
    choice('size', ['default', 'sm'], 'default'),
    speed(),
    effect('stretch'),
    effect('bridge'),
    effect('splat'),
    effect('droplets'),
    effect('squish', { advanced: true }),
    effect('wave', { advanced: true }),
    effect('fill', { advanced: true, type: 'boolean' }),
  ],
  reactTables: {
    main: {
      caption: 'GoopSwitch props',
      rows: [
        { prop: 'checked', type: 'boolean', def: '', note: 'The controlled state. Pair it with onCheckedChange.' },
        { prop: 'defaultChecked', type: 'boolean', def: 'false', note: 'The initial state when uncontrolled.' },
        { prop: 'onCheckedChange', type: '(checked: boolean) => void', def: '', note: 'Called when the state changes.' },
        { prop: 'size', type: `'default' | 'sm'`, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, name, value, required, asChild', type: '', def: '', note: 'Passed to Radix. name and value make it submit with a form.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the track.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Switch.' },
        { prop: 'goopRef', type: 'Ref<SwitchHandle>', def: '', note: 'The live engine handle (null before mount or with goo off).' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopSwitch props',
      rows: [
        { prop: 'modelValue', type: 'boolean', def: '', note: 'The controlled state (v-model).' },
        { prop: 'defaultValue', type: 'boolean', def: 'false', note: 'The initial state when uncontrolled.' },
        { prop: 'size', type: `'default' | 'sm'`, def: `'default'`, note: 'Same as shadcn.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, name, value, required', type: '', def: '', note: 'Passed to reka-ui. name and value make it submit with a form.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the track.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Switch.' },
        { prop: 'stretch', type: fx, def: 'true', note: 'The thumb leaves slowly, because the goo sticks, then speeds up, leans, and trails a teardrop tail.' },
        { prop: 'bridge', type: fx, def: 'true', note: 'A blob stays stuck at the start, joined by a neck that thins and snaps.' },
        { prop: 'squish', type: fx, def: 'true', note: 'The wobble after it lands.' },
        { prop: 'splat', type: fx, def: 'true', note: 'The thumb hits the far wall and flattens like a water balloon, then rebounds.' },
        { prop: 'droplets', type: fx, def: 'true', note: 'A few drops fly off the wall on impact and fall back in.' },
        { prop: 'wave', type: fx, def: 'true', note: 'The new colour floods the track from the wall on impact, instead of switching at once.' },
        { prop: 'fill', type: 'boolean', def: 'true', note: 'The primary colour is goo, not a flat background.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

import { color, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'checkbox',
  title: 'Checkbox',
  category: 'Forms',
  component: 'GoopCheckbox',
  code: `<script setup lang="ts">
const terms = ref(false)
</script>

<template>
  <label class="flex items-center gap-2 text-sm">
    <GoopCheckbox v-model="terms"{{main}} />
    Accept terms and conditions
  </label>
</template>`,
  controls: [
    preset(),
    color(),
    speed(),
    effect('fill'),
    effect('splat'),
    effect('droplets'),
  ],
  tables: {
    main: {
      caption: 'GoopCheckbox props',
      rows: [
        { prop: 'modelValue', type: `boolean | 'indeterminate'`, def: '', note: 'The controlled state (v-model).' },
        { prop: 'defaultValue', type: `boolean | 'indeterminate'`, def: 'false', note: 'The initial state when uncontrolled.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, name, value, required', type: '', def: '', note: 'Passed to reka-ui. name and value make it submit with a form.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the box.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Checkbox.' },
        { prop: 'fill', type: fx, def: 'true', note: 'The check fills the box with goo instead of a flat colour.' },
        { prop: 'splat', type: fx, def: 'true', note: 'The goo splats into the box on check and wobbles to rest.' },
        { prop: 'droplets', type: fx, def: 'true', note: 'A few droplets fly off on impact and fall back.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

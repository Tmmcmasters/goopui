import { color, effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'slider',
  title: 'Slider',
  category: 'Forms',
  component: 'GoopSlider',
  code: `<script setup lang="ts">
const volume = ref([50])
</script>

<template>
  <GoopSlider v-model="volume" :max="100" :step="1"{{main}} />
</template>`,
  controls: [preset(), color(), speed(), effect('jelly'), effect('slosh'), effect('stretch'), effect('splat')],
  tables: {
    main: {
      caption: 'GoopSlider props',
      rows: [
        { prop: 'modelValue', type: 'number[]', def: '', note: 'One number per thumb (v-model).' },
        { prop: 'defaultValue', type: 'number[]', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'min, max, step', type: 'number', def: '0, 100, 1', note: 'Same as reka-ui.' },
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'The goo follows it.' },
        { prop: 'dir', type: `'ltr' | 'rtl'`, def: '', note: 'Reading direction.' },
        { prop: 'inverted', type: 'boolean', def: 'false', note: 'Fill from the other end.' },
        { prop: 'minStepsBetweenThumbs', type: 'number', def: '', note: 'For range sliders.' },
        { prop: 'thumbAlignment', type: `'contain' | 'overflow'`, def: '', note: 'Passed to reka-ui.' },
        { prop: 'disabled, name, required', type: '', def: '', note: 'Same as reka-ui.' },
        { prop: 'as, asChild', type: '', def: '', note: 'Render a different element.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Slider.' },
        { prop: 'jelly', type: fx, def: 'true', note: 'The thumb lags on a spring, overshoots, and wobbles to rest.' },
        { prop: 'slosh', type: fx, def: 'true', note: "The fill's surface piles up, sloshes back, and waves." },
        { prop: 'stretch', type: fx, def: 'true', note: 'The thumb stretches along the slider with speed.' },
        { prop: 'splat', type: fx, def: 'true', note: 'A jumping thumb lands with a small splat.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: `'playful'`, note: 'The feel. Falls back to the app config, then --goop-preset.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

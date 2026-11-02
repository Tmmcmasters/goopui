import { color, effect, num, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'progress',
  title: 'Progress',
  category: 'Feedback',
  component: 'GoopProgress',
  code: `<script setup lang="ts">
const value = ref(35)
</script>

<template>
  <GoopProgress :model-value="value"{{main}} />
</template>`,
  controls: [
    preset(),
    color(),
    speed(),
    effect('slosh'),
    effect('drips'),
    effect('wobble'),
    num('seed', 0, 20, 1, 0, { advanced: true, description: "Varies drip timing and sizes, so two bars don't drip in step." }),
  ],
  tables: {
    main: {
      caption: 'GoopProgress props',
      rows: [
        { prop: 'modelValue', type: 'number | null', def: '0', note: 'The value (v-model). null is indeterminate.' },
        { prop: 'max', type: 'number', def: '100', note: 'The value that means full.' },
        { prop: 'getValueLabel, getValueText', type: '(value, max) => string', def: '', note: 'Passed to reka-ui, for the ARIA value text.' },
        { prop: 'as, asChild', type: '', def: '', note: 'Render a different element.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Progress.' },
        { prop: 'slosh', type: fx, def: 'true', note: 'The top surface waves, piles up toward the front, and sloshes back.' },
        { prop: 'drips', type: fx, def: 'true', note: "Drops form on the front's underside now and then and fall." },
        { prop: 'wobble', type: fx, def: 'true', note: 'The front bulges and wobbles when the value changes.' },
        { prop: 'seed', type: 'number', def: '0', note: "Varies drip timing and sizes, so two bars don't drip in step." },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: `'playful'`, note: 'The feel. Falls back to the app config, then --goop-preset.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

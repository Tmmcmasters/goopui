import { choice, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'toaster',
  title: 'Toaster',
  category: 'Feedback',
  component: 'GoopToaster',
  replay: { action: 'click', label: 'Show a toast' },
  code: `<script setup lang="ts">
import { toast } from 'vue-sonner'
</script>

<template>
  <GoopToaster{{main}} />
  <GoopButton @click="toast('Event has been created')">Show toast</GoopButton>
</template>`,
  controls: [
    preset(),
    speed(),
    strength('dropIn'),
    strength('merge'),
    strength('drips'),
    choice('position', ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'], 'bottom-right', { advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopToaster goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders exactly shadcn's Sonner.` },
        { prop: 'dropIn', type: fx, def: 'true', note: 'New toasts drop in as a blob, overshoot, and slosh.' },
        { prop: 'merge', type: fx, def: 'true', note: 'Stacked toasts merge with goo necks that stretch and snap as the stack expands.' },
        { prop: 'drips', type: fx, def: 'true', note: `Leaving toasts drip off. Swipe-out flings the goo the swipe's way.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: `'playful'`, note: 'The feel. Falls back to the app config, then --goop-preset.' },
        { prop: 'position', type: `'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'`, def: `'bottom-right'`, note: `vue-sonner's Toaster prop: where the stack sits.` },
      ],
    },
  },
})

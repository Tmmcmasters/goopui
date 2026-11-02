import { choice, effect, num, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'hover-card',
  title: 'Hover Card',
  category: 'Overlays',
  component: 'GoopHoverCard',
  code: `<GoopHoverCard :open-delay="200">
  <GoopHoverCardTrigger href="https://nuxt.com" class="text-sm font-medium underline underline-offset-4">
    @nuxt
  </GoopHoverCardTrigger>
  <GoopHoverCardContent{{content}}>
    <p class="text-sm font-semibold">@nuxt</p>
    <p class="text-sm">The intuitive Vue framework, created and maintained by the Nuxt team.</p>
  </GoopHoverCardContent>
</GoopHoverCard>`,
  controls: [
    preset({ part: 'content' }),
    speed({ part: 'content' }),
    choice('bloomFrom', ['trigger', 'center'], 'trigger', { part: 'content' }),
    choice('surface', ['popover', 'trigger'], 'popover', { part: 'content', type: `'popover' | 'trigger' | string` }),
    strength('openSlosh', { part: 'content' }),
    strength('openDrips', { part: 'content' }),
    strength('closeSlosh', { part: 'content' }),
    choice('flowStyle', ['bloom', 'neck'], 'bloom', { part: 'content', advanced: true }),
    choice('bloomStart', ['single', 'merge'], 'single', { part: 'content', advanced: true }),
    effect('wobble', { part: 'content', type: 'boolean', advanced: true }),
    effect('fade', { part: 'content', type: 'boolean', advanced: true }),
    num('openDripAmount', 0, 3, 0.05, 1, { part: 'content', unit: '×', advanced: true }),
    num('sloshVariety', 0, 1, 0.05, 1, { part: 'content', advanced: true }),
  ],
  tables: {
    content: {
      caption: 'GoopHoverCardContent goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn HoverCardContent.' },
        { prop: 'flow', type: 'boolean', def: 'true', note: 'The card opens in flowStyle. false: it inflates from a bulb at the trigger edge.' },
        { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from a point and spreads with a lobed edge, overshoots, then splashes. 'neck' runs out of the trigger through a thick neck.` },
        { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `'single': one droplet swells. 'merge': a few drops fuse.` },
        { prop: 'bloomFrom', type: `'trigger' | 'center'`, def: `'trigger'`, note: `Where the bloom starts. 'trigger': the card's edge facing its trigger. 'center': the card's own center, like Popover. Close shrinks back to the same spot.` },
        { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the trigger and the card. Not used by bloom.' },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'The open overshoot and settle.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The launch away from the trigger. Not used by bloom.' },
        { prop: 'fade', type: 'boolean', def: 'true', note: 'The content fades in once the goo settles.' },
        { prop: 'openSlosh', type: 'boolean | number', def: 'true', note: 'On open, every edge bulges past rest, rebounds, and wobbles. A number from 0 to 2 sets the strength.' },
        { prop: 'openDrips', type: 'boolean | number', def: 'true', note: 'On open, drops splash off all around, kept off the trigger. A number from 0 to 2 sets the strength.' },
        { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
        { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
        { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
        { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1.' },
        { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges, 0 to 1. 0 is an even, centred bulge.' },
        { prop: 'closeSlosh', type: 'boolean | number', def: 'true', note: 'On close, the card pulls in and wobbles before it shrinks back.' },
        { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The card's color. 'popover' uses shadcn's popover tokens. 'trigger' takes the trigger's colors. Any CSS color works.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

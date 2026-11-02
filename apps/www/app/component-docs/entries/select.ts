import { choice, effect, num, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'select',
  title: 'Select',
  category: 'Forms',
  component: 'GoopSelect',
  replay: { action: 'click', label: 'Open again' },
  code: `<GoopSelect v-model="fruit">
  <GoopSelectTrigger class="w-44">
    <GoopSelectValue placeholder="Pick a fruit" />
  </GoopSelectTrigger>
  <GoopSelectContent{{content}}>
    <GoopSelectItem v-for="f in fruits" :key="f" :value="f">{{ f }}</GoopSelectItem>
  </GoopSelectContent>
</GoopSelect>`,
  controls: [
    preset({ part: 'content' }),
    speed({ part: 'content' }),
    choice('flowStyle', ['bloom', 'neck'], 'bloom', { part: 'content' }),
    choice('surface', ['popover', 'trigger'], 'popover', { part: 'content', type: `'popover' | 'trigger' | string` }),
    effect('highlight', { part: 'content', type: 'boolean' }),
    effect('plop', { part: 'content', type: 'boolean' }),
    effect('openDrips', { part: 'content', type: 'boolean' }),
    effect('openSlosh', { part: 'content', type: 'boolean' }),
    choice('bloomFrom', ['auto', 'selected', 'center'], 'auto', { part: 'content', advanced: true }),
    effect('wobble', { part: 'content', type: 'boolean', advanced: true }),
    effect('pop', { part: 'content', type: 'boolean', advanced: true }),
    effect('followPointer', { part: 'content', type: 'boolean', advanced: true }),
    num('openDripAmount', 0, 3, 0.05, 1, { part: 'content', unit: '×', advanced: true }),
  ],
  tables: {
    content: {
      caption: 'GoopSelectContent goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn SelectContent.' },
        { prop: 'flow', type: 'boolean', def: 'true', note: 'The list opens in flowStyle. false: it inflates from a bulb at the trigger edge.' },
        { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from a point and spreads in every direction with a lobed edge, overshoots, then splashes. 'neck' runs out of the trigger through a thick neck.` },
        { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `'single': one droplet swells. 'merge': a few drops fuse.` },
        { prop: 'bloomFrom', type: `'auto' | 'selected' | 'center'`, def: `'auto'`, note: `Where the bloom starts. 'auto': the selected item for an item-aligned list, the list's center for a popper. Close shrinks back to the same spot.` },
        { prop: 'bridge', type: 'boolean', def: 'true', note: `The bulb and lumpy neck between the trigger and the list. Not used by bloom.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot: the open overshoot and settle, the highlight overshoot, and the plop wobble.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: `The panel's launch (not used by bloom), and the highlight's stretch and neck while it travels.` },
        { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
        { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, the edges (bloom: every edge) overshoot, rebound, and wobble.' },
        { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, the edges splash: globs, drops, and specks fling off and fall away, kept off the trigger.' },
        { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
        { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
        { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
        { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1. 0 makes every drop alike.' },
        { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and close (off-centre, one or two lumps, staggered), 0 to 1. 0 is an even, centred bulge.' },
        { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the list pulls in and wobbles before it shrinks back.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that slides between items and follows the keyboard. false gives shadcn's flat background.` },
        { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is chosen, before the list closes.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell (its neck while it slides, a soft bulge as the pointer moves along an item) follows the pointer with a little lag. Off, or from the keyboard, it stays centred.` },
        { prop: 'plop', type: 'boolean', def: 'true', note: `The chosen item's check mark plops in: falls in small, squashes as it lands, and jiggles back to round.` },
        { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The list's color. 'popover' uses shadcn's popover tokens. 'trigger' takes the trigger's background and text color. Any CSS color works.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

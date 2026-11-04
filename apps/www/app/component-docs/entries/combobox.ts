import { effect, num, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'combobox',
  title: 'Combobox',
  category: 'Forms',
  component: 'GoopCombobox',
  replay: { action: 'click', label: 'Open again' },
  code: `<GoopCombobox v-model="framework" by="value">
  <GoopComboboxAnchor class="relative w-56">
    <GoopComboboxInput class="pr-8" placeholder="Select framework..." :display-value="(v) => v?.label ?? ''" />
    <GoopComboboxTrigger class="absolute inset-y-0 right-0" aria-label="Show frameworks" />
  </GoopComboboxAnchor>
  <GoopComboboxList class="w-(--reka-combobox-trigger-width)"{{list}}>
    <GoopComboboxEmpty>No framework found.</GoopComboboxEmpty>
    <GoopComboboxGroup>
      <GoopComboboxItem v-for="f in frameworks" :key="f.value" :value="f">
        {{ f.label }}
        <GoopComboboxItemIndicator />
      </GoopComboboxItem>
    </GoopComboboxGroup>
  </GoopComboboxList>
</GoopCombobox>`,
  controls: [
    preset({ part: 'list' }),
    speed({ part: 'list' }),
    effect('highlight', { part: 'list', type: 'boolean' }),
    effect('pop', { part: 'list', type: 'boolean' }),
    effect('plop', { part: 'list', type: 'boolean' }),
    effect('openDrips', { part: 'list', type: 'boolean' }),
    effect('openSlosh', { part: 'list', type: 'boolean' }),
    effect('closeSlosh', { part: 'list', type: 'boolean' }),
    effect('wobble', { part: 'list', type: 'boolean', advanced: true }),
    effect('momentum', { part: 'list', type: 'boolean', advanced: true }),
    effect('followPointer', { part: 'list', type: 'boolean', advanced: true }),
    num('openDripAmount', 0, 3, 0.05, 1, { part: 'list', unit: '×', advanced: true }),
  ],
  tables: {
    list: {
      caption: 'GoopComboboxList goo props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ComboboxList.' },
        { prop: 'flow', type: 'boolean', def: 'true', note: 'The list opens in flowStyle. false: it inflates from a bulb at the input edge.' },
        { prop: 'flowStyle', type: `'bloom' | 'neck'`, def: `'bloom'`, note: `'bloom' pools from the list's own center, spreads with a lobed edge, overshoots, then splashes. 'neck' runs out of the input through a thick neck.` },
        { prop: 'bloomStart', type: `'single' | 'merge'`, def: `'single'`, note: `'single': one droplet swells. 'merge': a few drops fuse.` },
        { prop: 'bridge', type: 'boolean', def: 'true', note: 'The bulb and lumpy neck between the input and the list. Not used by bloom.' },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot: the open overshoot and settle, the highlight overshoot, and the plop wobble.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: `The panel's launch (not used by bloom), and the highlight's stretch and neck while it travels.` },
        { prop: 'fade', type: 'boolean', def: 'true', note: 'The items fade in once the goo settles.' },
        { prop: 'openSlosh', type: 'boolean', def: 'true', note: 'On open, every edge overshoots, rebounds, and wobbles.' },
        { prop: 'openDrips', type: 'boolean', def: 'true', note: 'On open, the edges splash: globs, drops, and specks fling off and fall away, kept off the input.' },
        { prop: 'openDripAmount', type: 'number', def: '1', note: 'Splash drop count, 0 to 3.' },
        { prop: 'openDripSize', type: 'number', def: '1', note: 'Splash drop size, 0.3 to 2.5.' },
        { prop: 'openDripFling', type: 'number', def: '1', note: 'How far the drops are flung, 0 to 3.' },
        { prop: 'openDripVariety', type: 'number', def: '0.7', note: 'Mix of globs and specks, 0 to 1. 0 makes every drop alike.' },
        { prop: 'sloshVariety', type: 'number', def: '1', note: 'How differently each side bulges on open and close, 0 to 1. 0 is an even, centred bulge.' },
        { prop: 'closeSlosh', type: 'boolean', def: 'true', note: 'On close, the list pulls in and wobbles before it shrinks back.' },
        { prop: 'highlight', type: 'boolean', def: 'true', note: `The item highlight is a goo blob that glides between items with the keys and the pointer, and shrinks out when typing hides its item. false gives shadcn's flat background.` },
        { prop: 'pop', type: 'boolean', def: 'true', note: 'The highlight squishes when an item is chosen, before the list closes.' },
        { prop: 'followPointer', type: 'boolean', def: 'true', note: `The highlight's swell follows the pointer with a little lag. Off, or from the keyboard, it stays centred.` },
        { prop: 'plop', type: 'boolean', def: 'true', note: `The chosen item's check mark plops in: falls in small, squashes as it lands, and jiggles back to round.` },
        { prop: 'surface', type: `'popover' | 'trigger' | string`, def: `'popover'`, note: `The list's color. 'popover' uses shadcn's popover tokens. Any CSS color works.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

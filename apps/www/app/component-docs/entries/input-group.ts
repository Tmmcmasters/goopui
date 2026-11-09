import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const ring = [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn InputGroup, with no wrapper.' },
  { prop: 'flow', type: fx, def: 'true', note: 'When a field inside takes focus, goo flows around the group from the click point. Off: the ring appears at once.' },
  { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
  { prop: 'ripple', type: fx, def: 'true', note: `Each edit sends a small ripple along the ring from the point nearest the field's caret.` },
  { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while a field is focused.' },
  { prop: 'drain', type: fx, def: 'true', note: `When focus leaves the group's fields the ring drains away, top first.` },
  { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid on any part, a small drip hangs off the bottom of the destructive ring.' },
  { prop: 'drips', type: fx, def: 'false', note: 'Resting drips under the ring while it shows. Off by default.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel, as GoopInput.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
]

const code = (container: string, bind: string) => `<GoopInputGroup ${container}="max-w-sm"{{main}}>
  <GoopInputGroupInput ${bind} placeholder="Search..." />
  <GoopInputGroupAddon>
    <SearchIcon />
  </GoopInputGroupAddon>
  <GoopInputGroupAddon align="inline-end">12 results</GoopInputGroupAddon>
</GoopInputGroup>`

export default defineComponentDoc({
  slug: 'input-group',
  title: 'Input Group',
  category: 'Forms',
  component: 'GoopInputGroup',
  code: code('container-class', 'v-model="query"'),
  reactCode: code('containerClassName', 'value={query} onChange={(e) => setQuery(e.target.value)}'),
  controls: [
    preset(),
    speed(),
    effect('flow'),
    effect('ripple'),
    effect('wobble'),
    effect('drain'),
    effect('drips', { default: false, label: 'Resting drips' }),
    effect('close', { advanced: true }),
    effect('drip', { advanced: true, label: 'Invalid drip' }),
  ],
  tables: {
    main: {
      caption: 'GoopInputGroup props',
      rows: [
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the group, like shadcn. Other attributes go to the group too.' },
        { prop: 'containerClass', type: 'string | array | object', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the goo layer. Set width or margins here.' },
        ...ring,
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopInputGroup props',
      rows: [
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the group, like shadcn/ui. Other props go to the group too.' },
        { prop: 'containerClassName', type: 'string', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the goo layer. Set width or margins here.' },
        { prop: 'ref', type: 'Ref<HTMLDivElement>', def: '', note: 'The group element.' },
        { prop: 'goopRef', type: 'Ref<InputHandle>', def: '', note: 'The live ring handle (null before mount or with goo off).' },
        ...ring,
      ],
    },
  },
})

import { preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'kbd',
  title: 'Kbd',
  category: 'Feedback',
  component: 'GoopKbd',
  code: `<GoopKbdGroup>
  <GoopKbd :keys="['Meta']"{{main}}>⌘</GoopKbd>
  <GoopKbd :keys="['Meta', 'K']"{{main}}>K</GoopKbd>
</GoopKbdGroup>`,
  reactCode: `<GoopKbdGroup>
  <GoopKbd keys={['Meta']}{{main}}>⌘</GoopKbd>
  <GoopKbd keys={['Meta', 'K']}{{main}}>K</GoopKbd>
</GoopKbdGroup>`,
  reactTables: {
    main: {
      caption: 'GoopKbd props',
      rows: [
        { prop: 'keys', type: 'string[]', def: '[]', note: `Keyboard keys that press it, e.g. ['Meta', 'K']: every key held = pressed. KeyboardEvent.key names, plus 'Cmd' / '⌘', 'Ctrl', 'Option' / '⌥', 'Shift' / '⇧', 'Esc'. Without it, only a click presses it.` },
        { prop: 'press', type: 'boolean | number', def: 'true', note: 'The squish: it sinks into its base, bulges out a little, and springs back with a small jelly rebound. A number scales it.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders a plain shadcn Kbd (pointer-events-none).` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the kbd.' },
        { prop: 'goopRef', type: 'Ref<KbdHandle>', def: '', note: 'The live squish handle: tap() presses and releases it. null before mount or with the squish off. ref is the kbd element.' },
      ],
    },
  },
  controls: [preset(), speed(), strength('press')],
  tables: {
    main: {
      caption: 'GoopKbd props',
      rows: [
        { prop: 'keys', type: 'string[]', def: '[]', note: `Keyboard keys that press it, e.g. ['Meta', 'K']: every key held = pressed. KeyboardEvent.key names, plus 'Cmd' / '⌘', 'Ctrl', 'Option' / '⌥', 'Shift' / '⇧', 'Esc'. Without it, only a click presses it.` },
        { prop: 'press', type: 'boolean | number', def: 'true', note: 'The squish: it sinks into its base, bulges out a little, and springs back with a small jelly rebound. A number scales it.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: `Master switch. false renders a plain shadcn Kbd (pointer-events-none).` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the kbd.' },
      ],
    },
  },
})

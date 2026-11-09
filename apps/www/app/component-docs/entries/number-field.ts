import { color, effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'number-field',
  title: 'Number Field',
  category: 'Forms',
  component: 'GoopNumberField',
  code: `<GoopNumberField v-model="qty" :min="0" :max="20"{{main}}>
  <GoopNumberFieldContent>
    <GoopNumberFieldDecrement />
    <GoopNumberFieldInput />
    <GoopNumberFieldIncrement />
  </GoopNumberFieldContent>
</GoopNumberField>`,
  reactCode: `<GoopNumberField value={qty} onValueChange={setQty} min={0} max={20}{{main}}>
  <GoopNumberFieldContent>
    <GoopNumberFieldDecrement />
    <GoopNumberFieldInput />
    <GoopNumberFieldIncrement />
  </GoopNumberFieldContent>
</GoopNumberField>`,
  controls: [
    preset(),
    speed(),
    color({ cssVar: '--ring', description: 'Sets --ring, the token the focus ring is drawn with.' }),
    strength('squish'),
    strength('nudge'),
    effect('flow'),
    effect('ripple'),
    effect('wobble'),
    effect('drain'),
    effect('close', { advanced: true }),
    effect('drip', { advanced: true, label: 'Invalid drip' }),
    effect('drips', { default: false, label: 'Resting drips', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopNumberField props',
      rows: [
        { prop: 'modelValue', type: 'number | null', def: '', note: 'The value (v-model).' },
        { prop: 'defaultValue', type: 'number', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn NumberField.' },
        { prop: 'squish', type: fx, def: 'true', note: 'Pressing + or - swells a goo dollop under it, squished low and wide; letting go springs it back with a small wobble.' },
        { prop: 'nudge', type: fx, def: 'true', note: 'Each step shoves the dollop toward the side you pressed and sends a ripple along the ring from that side.' },
        { prop: 'flow', type: fx, def: 'true', note: 'On focus the ring flows around the border from the click point (or the button you pressed).' },
        { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
        { prop: 'ripple', type: fx, def: 'true', note: 'Typing sends a ripple along the ring from the caret.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while focused.' },
        { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first.' },
        { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid on the input, a small drip hangs off the destructive ring.' },
        { prop: 'drips', type: fx, def: 'false', note: 'Resting drips under the ring while it shows.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring and dollop size, squish depth, nudge distance.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopNumberField props',
      rows: [
        { prop: 'value', type: 'number | null', def: '', note: 'The controlled value. Pair it with onValueChange.' },
        { prop: 'defaultValue', type: 'number', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'onValueChange', type: '(value: number | undefined) => void', def: '', note: 'Called with each new value (undefined when emptied).' },
        { prop: 'min, max', type: 'number', def: '', note: 'The range. The steppers disable at the ends, and typed values are clamped.' },
        { prop: 'step', type: 'number', def: '1', note: 'Step size for the buttons and the arrow keys (Page Up / Down step by 10).' },
        { prop: 'formatOptions', type: 'Intl.NumberFormatOptions', def: '', note: 'How the value is shown: currency, percent, units, decimals.' },
        { prop: 'locale', type: 'string', def: `'en-US'`, note: 'Locale for formatting and parsing. Fixed by default, so the server and the browser print the same text.' },
        { prop: 'disabled', type: 'boolean', def: 'false', note: '' },
        { prop: 'id, name', type: 'string', def: '', note: 'Go on the input (for a <label htmlFor> and forms).' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain number field.' },
        { prop: 'squish', type: fx, def: 'true', note: 'Pressing + or - swells a goo dollop under it, squished low and wide; letting go springs it back with a small wobble.' },
        { prop: 'nudge', type: fx, def: 'true', note: 'Each step shoves the dollop toward the side you pressed and sends a ripple along the ring from that side.' },
        { prop: 'flow, close, ripple, wobble, drain, drip, drips', type: fx, def: 'true (drips false)', note: `The focus ring's effects, as on GoopInput.` },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring and dollop size, squish depth, nudge distance.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
        { prop: 'goopRef', type: 'Ref<NumberFieldHandle>', def: '', note: 'On GoopNumberFieldContent: the live engine handle (null before mount or with goo off).' },
      ],
    },
  },
})

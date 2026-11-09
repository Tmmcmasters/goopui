import { color, effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'input-otp',
  title: 'Input OTP',
  category: 'Forms',
  component: 'GoopInputOTP',
  code: `<GoopInputOTP v-model="code" aria-label="Verification code"{{main}}>
  <GoopInputOTPGroup>
    <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i - 1" />
  </GoopInputOTPGroup>
  <GoopInputOTPSeparator />
  <GoopInputOTPGroup>
    <GoopInputOTPSlot v-for="i in 3" :key="i" :index="i + 2" />
  </GoopInputOTPGroup>
</GoopInputOTP>`,
  reactCode: `<GoopInputOTP maxLength={6} value={code} onChange={setCode} aria-label="Verification code"{{main}}>
  <GoopInputOTPGroup>
    <GoopInputOTPSlot index={0} />
    <GoopInputOTPSlot index={1} />
    <GoopInputOTPSlot index={2} />
  </GoopInputOTPGroup>
  <GoopInputOTPSeparator />
  <GoopInputOTPGroup>
    <GoopInputOTPSlot index={3} />
    <GoopInputOTPSlot index={4} />
    <GoopInputOTPSlot index={5} />
  </GoopInputOTPGroup>
</GoopInputOTP>`,
  controls: [
    preset(),
    speed(),
    color({ cssVar: '--ring', description: 'Sets --ring, the token the cell goo is drawn with.' }),
    strength('flow'),
    strength('pulse'),
    effect('flood'),
    effect('wobble'),
  ],
  tables: {
    main: {
      caption: 'GoopInputOTP props',
      rows: [
        { prop: 'modelValue', type: 'string[]', def: '', note: 'The code, one entry per cell (v-model).' },
        { prop: 'defaultValue', type: 'string[]', def: '', note: 'The initial code when uncontrolled.' },
        { prop: 'otp', type: 'boolean', def: 'true', note: 'autocomplete="one-time-code", so phones offer the code from a text message.' },
        { prop: 'type', type: `'text' | 'number'`, def: `'text'`, note: 'number accepts digits only.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn cells.' },
        { prop: 'flow', type: fx, def: 'true', note: 'When focus moves to another cell, the goo gathers, necks out and flows into it.' },
        { prop: 'pulse', type: fx, def: 'true', note: 'A digit landing in a cell plops a small, low dollop of goo into it.' },
        { prop: 'flood', type: fx, def: 'true', note: 'Focusing from outside floods the cell from where you clicked; leaving drains it. Off: it snaps.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The crest of the flood front and a small jelly wobble once the cell is full.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: flood and flow timing, pulse size, wobble strength.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopInputOTP props',
      rows: [
        { prop: 'maxLength', type: 'number', def: '', note: `The number of slots (input-otp's required prop).` },
        { prop: 'value', type: 'string', def: '', note: 'The controlled code. Pair it with onChange.' },
        { prop: 'defaultValue', type: 'string', def: '', note: 'The initial code when uncontrolled.' },
        { prop: 'onChange', type: '(value: string) => void', def: '', note: 'Called with the code as it changes.' },
        { prop: 'onComplete', type: '(value: string) => void', def: '', note: 'Called when every slot is filled.' },
        { prop: 'pattern', type: 'string', def: '', note: 'A regex the code must match, e.g. REGEXP_ONLY_DIGITS (exported too).' },
        { prop: 'disabled, inputMode, autoFocus, ...', type: '', def: '', note: `Everything else goes to input-otp's hidden <input>, like shadcn.` },
        { prop: 'className, containerClassName', type: 'string', def: '', note: 'Merged onto the input and the container, like shadcn.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn slots.' },
        { prop: 'flow', type: fx, def: 'true', note: 'When the active slot moves, the goo gathers, necks out and flows into the next one.' },
        { prop: 'pulse', type: fx, def: 'true', note: 'A character landing in a slot plops a small, low dollop of goo into it.' },
        { prop: 'flood', type: fx, def: 'true', note: 'Focusing from outside floods the slot from where you clicked; leaving drains it. Off: it snaps.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The crest of the flood front and a small jelly wobble once the slot is full.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: flood and flow timing, pulse size, wobble strength.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
        { prop: 'goopRef', type: 'Ref<InputOTPHandle>', def: '', note: 'The live engine handle (null before mount or with goo off).' },
      ],
    },
  },
})

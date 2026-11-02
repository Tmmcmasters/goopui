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
})

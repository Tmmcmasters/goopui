import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'input',
  title: 'Input',
  category: 'Forms',
  component: 'GoopInput',
  code: `<GoopInput v-model="email" type="email" placeholder="you@example.com"{{main}} />`,
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
  reactCode: `import { GoopInput } from '@goopui/react'
import { useState } from 'react'

export function Email() {
  const [email, setEmail] = useState('')
  return <GoopInput value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com"{{main}} />
}`,
  reactTables: {
    main: {
      caption: 'GoopInput and GoopTextarea props',
      rows: [
        { prop: 'value, defaultValue, onChange', type: '', def: '', note: 'The native field props, as in shadcn/ui: it is a plain <input> or <textarea>.' },
        { prop: 'type, placeholder, disabled, aria-invalid, ...', type: '', def: '', note: 'Every other prop goes to the field.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the field, like shadcn/ui.' },
        { prop: 'containerClassName', type: 'string', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the goo layer. Set width or margins here.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Input or Textarea, with no wrapper.' },
        { prop: 'ref', type: 'Ref<HTMLInputElement | HTMLTextAreaElement>', def: '', note: 'The field element, as in shadcn/ui.' },
        { prop: 'goopRef', type: 'Ref<InputHandle>', def: '', note: 'The live engine handle (null before mount or with goo off).' },
        { prop: 'flow', type: fx, def: 'true', note: 'On focus, goo flows around the border from the click point (the left edge on keyboard focus). Off: the ring appears at once.' },
        { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
        { prop: 'ripple', type: fx, def: 'true', note: 'Each edit sends a small ripple along the ring from the point nearest the caret.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while the field is focused.' },
        { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first. Off: it disappears at once.' },
        { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid, a small drip hangs off the bottom of the destructive ring.' },
        { prop: 'drips', type: fx, def: 'false', note: 'Resting drips: small drips hang under the ring while it shows. Off by default.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring thickness, flow and drain timing, wobble and ripple strength.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopInput and GoopTextarea props',
      rows: [
        { prop: 'modelValue', type: 'string | number', def: '', note: 'The value (v-model).' },
        { prop: 'defaultValue', type: 'string | number', def: '', note: 'The initial value when uncontrolled.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the field, like shadcn.' },
        { prop: 'containerClass', type: 'string | array | object', def: `'relative w-full min-w-0'`, note: 'Classes for the wrapper that holds the goo layer. Set width or margins here.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Input or Textarea, with no wrapper.' },
        { prop: 'flow', type: fx, def: 'true', note: 'On focus, goo flows around the border from the click point (the left edge on keyboard focus). Off: the ring appears at once.' },
        { prop: 'close', type: fx, def: 'true', note: 'The wobble where the two flow fronts meet and close the ring.' },
        { prop: 'ripple', type: fx, def: 'true', note: 'Each edit sends a small ripple along the ring from the point nearest the caret.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The closed ring wobbles gently while the field is focused.' },
        { prop: 'drain', type: fx, def: 'true', note: 'On blur the ring drains away, top first. Off: it disappears at once.' },
        { prop: 'drip', type: fx, def: 'true', note: 'With aria-invalid, a small drip hangs off the bottom of the destructive ring.' },
        { prop: 'drips', type: fx, def: 'false', note: 'Resting drips: small drips hang under the ring while it shows. Off by default.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: ring thickness, flow and drain timing, wobble and ripple strength.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

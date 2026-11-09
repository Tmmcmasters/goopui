import { effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const goo = [
  { prop: 'goo', type: 'boolean', def: 'true', note: "Master switch for the error's drip. The controls inside keep their own goo either way (set goo on them)." },
  { prop: 'drip', type: fx, def: 'true', note: 'When the error appears, a small drop of the destructive colour falls from under the control into the message and spreads flat. A number scales the drop.' },
  { prop: 'reveal', type: fx, def: 'true', note: 'The message unrolls top-down right behind the drop. Off: it just shows.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: drop size and how long the drip takes.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the drop is drawn.' },
]

export default defineComponentDoc({
  slug: 'field',
  title: 'Field',
  category: 'Forms',
  component: 'GoopField',
  code: `<GoopField :data-invalid="!!error"{{main}}>
  <GoopFieldLabel for="email">Email</GoopFieldLabel>
  <GoopInput id="email" v-model="email" type="email" :aria-invalid="!!error" />
  <GoopFieldDescription>We'll never share it.</GoopFieldDescription>
  <GoopFieldError :errors="error ? [error] : []" />
</GoopField>`,
  reactCode: `<GoopField data-invalid={!!error}{{main}}>
  <GoopFieldLabel htmlFor="email">Email</GoopFieldLabel>
  <GoopInput id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" aria-invalid={!!error} />
  <GoopFieldDescription>We'll never share it.</GoopFieldDescription>
  <GoopFieldError errors={error ? [error] : []} />
</GoopField>`,
  controls: [preset(), speed(), strength('drip'), effect('reveal')],
  tables: {
    main: {
      caption: 'GoopField props (GoopFieldError takes the same goo props; its own win)',
      rows: [
        { prop: 'orientation', type: `'vertical' | 'horizontal' | 'responsive'`, def: `'vertical'`, note: "shadcn's layouts. responsive switches to horizontal inside a GoopFieldGroup that is at least md wide." },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the field, like shadcn.' },
        ...goo,
      ],
    },
  },
  reactTables: {
    main: {
      caption: 'GoopField props (GoopFieldError takes the same goo props; its own win)',
      rows: [
        { prop: 'orientation', type: `'vertical' | 'horizontal' | 'responsive'`, def: `'vertical'`, note: "shadcn/ui's layouts. responsive switches to horizontal inside a GoopFieldGroup that is at least md wide." },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the field, like shadcn/ui.' },
        ...goo,
      ],
    },
  },
})

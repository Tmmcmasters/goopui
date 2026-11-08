import { choice, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'badge',
  title: 'Badge',
  category: 'Feedback',
  component: 'GoopBadge',
  code: `<GoopBadge as-child{{main}}>
  <a href="/changelog">Link</a>
</GoopBadge>`,
  reactCode: `<GoopBadge asChild{{main}}>
  <a href="/changelog">Link</a>
</GoopBadge>`,
  controls: [
    preset(),
    choice('variant', ['default', 'secondary', 'destructive', 'outline'], 'default'),
    speed(),
    strength('swell'),
  ],
  reactTables: {
    main: {
      caption: 'GoopBadge props',
      rows: [
        { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link'`, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Render the single child (a link, a button) with the badge classes, via Radix Slot.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
        { prop: 'swell', type: fx, def: 'true', note: 'A link or button badge swells ~1px on hover with a soft overshoot. A number scales it. A plain badge never moves.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopBadge props',
      rows: [
        { prop: 'variant', type: `'default' | 'secondary' | 'destructive' | 'outline'`, def: `'default'`, note: 'Same as shadcn.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'swell', type: fx, def: 'true', note: 'A link or button badge swells ~1px on hover with a soft overshoot. A number scales it. A plain badge never moves.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

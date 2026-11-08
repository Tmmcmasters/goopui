import { choice, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'alert',
  title: 'Alert',
  category: 'Feedback',
  component: 'GoopAlert',
  replay: { action: 'remount', label: 'Play again' },
  code: `<GoopAlert{{main}}>
  <CircleCheckIcon />
  <GoopAlertTitle>Success! Your changes have been saved</GoopAlertTitle>
  <GoopAlertDescription>This is an alert with icon, title and description.</GoopAlertDescription>
</GoopAlert>`,
  controls: [
    preset(),
    choice('variant', ['default', 'destructive'], 'default'),
    speed(),
    strength('bloom'),
    strength('wobble'),
  ],
  tables: {
    main: {
      caption: 'GoopAlert props',
      rows: [
        { prop: 'variant', type: `'default' | 'destructive'`, def: `'default'`, note: 'Same as shadcn.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn Alert.' },
        { prop: 'bloom', type: fx, def: 'true', note: 'When it mounts or appears, the body blooms out of its top edge in a low, wide mound, overshoots a couple of px and settles. A number scales it.' },
        { prop: 'wobble', type: fx, def: 'true', note: 'The icon wobbles once, gently, as it arrives. A number scales it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

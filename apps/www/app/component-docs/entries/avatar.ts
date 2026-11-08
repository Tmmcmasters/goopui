import { preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'avatar',
  title: 'Avatar',
  category: 'Layout',
  component: 'GoopAvatar',
  replay: { action: 'remount', label: 'Settle again' },
  code: `<GoopAvatar class="size-10"{{main}}>
  <GoopAvatarImage src="/tim.png" alt="Tim McMasters" />
  <GoopAvatarFallback>TM</GoopAvatarFallback>
</GoopAvatar>`,
  reactCode: `<GoopAvatar className="size-10"{{main}}>
  <GoopAvatarImage src="/tim.png" alt="Tim McMasters" />
  <GoopAvatarFallback>TM</GoopAvatarFallback>
</GoopAvatar>`,
  controls: [preset(), speed(), strength('settle')],
  reactTables: {
    main: {
      caption: 'GoopAvatar props',
      rows: [
        { prop: 'size', type: `'default' | 'sm' | 'lg'`, def: `'default'`, note: 'Same as shadcn/ui.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Passed to Radix Avatar.' },
        { prop: 'settle', type: fx, def: 'true', note: "The image or fallback plops in with a soft overshoot when it appears. A number scales it. false: shadcn's Avatar." },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopAvatar props',
      rows: [
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'settle', type: fx, def: 'true', note: "The image or fallback plops in with a soft overshoot when it appears. A number scales it. false: shadcn's Avatar." },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

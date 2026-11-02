import { preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'skeleton',
  title: 'Skeleton',
  category: 'Feedback',
  component: 'GoopSkeleton',
  code: `<div class="flex items-center gap-4">
  <GoopSkeleton class="size-12 rounded-full"{{main}} />
  <div class="grid flex-1 gap-2">
    <GoopSkeleton class="h-4 w-full"{{main}} />
    <GoopSkeleton class="h-4 w-4/5"{{main}} />
  </div>
</div>`,
  controls: [preset(), speed(), strength('shimmer')],
  tables: {
    main: {
      caption: 'GoopSkeleton props',
      rows: [
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root. Size and shape it with classes, like shadcn.' },
        { prop: 'shimmer', type: fx, def: 'true', note: "A low mound of lighter goo drifts across. A number scales its brightness. false: shadcn's pulse." },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

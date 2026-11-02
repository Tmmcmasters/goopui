import { choice, color, effect, flag, num, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'spinner',
  title: 'Spinner',
  category: 'Feedback',
  component: 'GoopSpinner',
  code: `<GoopSpinner class="size-12"{{main}} />`,
  controls: [
    choice('variant', ['orbit', 'comet', 'ring', 'dots', 'pulse'], 'orbit'),
    preset(),
    color({ cssVar: 'color', description: 'The spinner is currentColor, like a lucide icon.' }),
    num('blobs', 3, 6, 1, 4),
    speed(),
    flag('drips'),
    effect('slosh', { type: 'boolean', advanced: true }),
    effect('grab', { type: 'boolean', advanced: true }),
    effect('pop', { type: 'boolean', advanced: true }),
    effect('interactive', { type: 'boolean', advanced: true }),
  ],
  tables: {
    main: {
      caption: 'GoopSpinner props',
      rows: [
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root, like shadcn. Set the size here.' },
        { prop: 'variant', type: `'orbit' | 'comet' | 'ring' | 'dots' | 'pulse'`, def: `'orbit'`, note: 'The shape.' },
        { prop: 'blobs', type: 'number', def: '4', note: 'Number of blobs, 3 to 6. Used by orbit and pulse.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed multiplier. 1 is about 1.15s per turn on playful.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'drips', type: 'boolean', def: 'false', note: 'Drips hang off the bottom and fall away as it turns. orbit only.' },
        { prop: 'interactive', type: 'boolean', def: 'true', note: 'Master switch for slosh, grab, and pop.' },
        { prop: 'slosh', type: 'boolean', def: 'true', note: 'Pointer movement sloshes the goo.' },
        { prop: 'grab', type: 'boolean', def: 'true', note: 'Press and drag pulls lumps out.' },
        { prop: 'pop', type: 'boolean', def: 'true', note: 'Click or tap squishes it, then it swells back.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

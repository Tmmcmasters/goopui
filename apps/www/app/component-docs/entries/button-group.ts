import { choice, effect, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const seamsNote =
  "Each button keeps its own goo body, cut clean at the joined edges: nothing crosses onto a neighbour and the seam never opens, while the outer edges bulge, drip and splash. false lets every button's goo spill freely."
const pressNote =
  "Opt-in. The pressed button squishes as a whole (label included): shorter across the group, longer along it. Off by default, since each button's own goo already squishes. A number scales it."
const tugNote =
  'Opt-in. Its neighbours are pulled toward it as whole elements, less the further away they are. Off by default. A number scales it.'

export default defineComponentDoc({
  slug: 'button-group',
  title: 'Button Group',
  category: 'Actions',
  component: 'GoopButtonGroup',
  code: `<GoopButtonGroup{{main}}>
  <GoopButton variant="outline">Archive</GoopButton>
  <GoopButton variant="outline">Report</GoopButton>
  <GoopButton variant="outline">Snooze</GoopButton>
</GoopButtonGroup>`,
  reactCode: `<GoopButtonGroup{{main}}>
  <GoopButton variant="outline">Archive</GoopButton>
  <GoopButton variant="outline">Report</GoopButton>
  <GoopButton variant="outline">Snooze</GoopButton>
</GoopButtonGroup>`,
  reactTables: {
    main: {
      caption: 'GoopButtonGroup props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Same as shadcn/ui.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the group.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ButtonGroup, and its GoopButtons render as plain shadcn Buttons too (unless one sets goo itself).' },
        { prop: 'seams', type: fx, def: 'true', note: seamsNote },
        { prop: 'press', type: fx, def: 'false', note: pressNote },
        { prop: 'tug', type: fx, def: 'false', note: tugNote },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed of the press / tug flex.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel of the press / tug flex. Each button takes its own preset prop.' },
        { prop: 'goopRef', type: 'Ref<ButtonGroupHandle>', def: '', note: 'The live group handle (null before mount or with goo off). ref is the group div.' },
      ],
    },
  },
  controls: [
    preset(),
    choice('orientation', ['horizontal', 'vertical'], 'horizontal'),
    effect('seams', { description: 'Cut each button’s goo clean at the joined edges.' }),
    strength('press', { default: 0, description: 'Opt-in whole-button squish on press.' }),
    strength('tug', { default: 0, description: 'Opt-in: neighbours pulled toward the pressed button.' }),
    speed(),
  ],
  tables: {
    main: {
      caption: 'GoopButtonGroup props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Same as shadcn.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the group.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ButtonGroup, and its GoopButtons render as plain shadcn Buttons too (unless one sets goo itself).' },
        { prop: 'seams', type: fx, def: 'true', note: seamsNote },
        { prop: 'press', type: fx, def: 'false', note: pressNote },
        { prop: 'tug', type: fx, def: 'false', note: tugNote },
        { prop: 'speed', type: 'number', def: '1', note: 'Speed of the press / tug flex.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel of the press / tug flex. Each button takes its own preset prop.' },
      ],
    },
  },
})

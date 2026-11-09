import { choice, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

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
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ButtonGroup.' },
        { prop: 'press', type: fx, def: 'true', note: 'The pressed button squishes: a little shorter across the group, a little longer along it. A number scales it.' },
        { prop: 'tug', type: fx, def: 'true', note: 'Its neighbours are pulled toward it and share some of the squish, less the further away they are. A number scales it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'goopRef', type: 'Ref<ButtonGroupHandle>', def: '', note: 'The live group handle (null before mount or with goo off). ref is the group div.' },
      ],
    },
  },
  controls: [preset(), choice('orientation', ['horizontal', 'vertical'], 'horizontal'), speed(), strength('press'), strength('tug')],
  tables: {
    main: {
      caption: 'GoopButtonGroup props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Same as shadcn.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the group.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ButtonGroup.' },
        { prop: 'press', type: fx, def: 'true', note: 'The pressed button squishes: a little shorter across the group, a little longer along it. A number scales it.' },
        { prop: 'tug', type: fx, def: 'true', note: 'Its neighbours are pulled toward it and share some of the squish, less the further away they are. A number scales it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

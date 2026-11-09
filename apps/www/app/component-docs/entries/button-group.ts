import { choice, effect, preset, speed, strength } from '../controls'
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
        { prop: 'highlight', type: fx, def: 'true', note: "The hover and keyboard-focus background is one goo blob behind the buttons that slides between them (on touch it shows only while pressed). false gives shadcn's own hover backgrounds." },
        { prop: 'wobble', type: fx, def: 'true', note: 'The blob lands with a soft jelly overshoot. false: it settles without one.' },
        { prop: 'momentum', type: fx, def: 'true', note: 'The blob stretches while it travels and trails a low mound behind it.' },
        { prop: 'followPointer', type: fx, def: 'true', note: 'A low, wide swell of the blob sits under the pointer. false: centred.' },
        { prop: 'bulge', type: fx, def: 'true', note: "On press, the goo under the button swells a few px past its edges as a low, wide mound, then settles with a jelly rebound. A number scales it." },
        { prop: 'ripple', type: fx, def: 'true', note: 'On press, two soft lumps of goo leave the button and travel into its neighbours, thinning away. A number scales it.' },
        { prop: 'press', type: fx, def: 'true', note: 'The pressed button squishes: a little shorter across the group, a little longer along it. A number scales it.' },
        { prop: 'tug', type: fx, def: 'true', note: 'Its neighbours are pulled toward it and share some of the squish, less the further away they are. A number scales it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'goopRef', type: 'Ref<ButtonGroupHandle>', def: '', note: 'The live group handle: press(index), release(), light(index) (null before mount or with goo off). ref is the group div.' },
      ],
    },
  },
  controls: [
    preset(),
    choice('orientation', ['horizontal', 'vertical'], 'horizontal'),
    speed(),
    effect('highlight', { type: 'boolean | number' }),
    effect('wobble', { type: 'boolean | number' }),
    effect('momentum', { type: 'boolean | number' }),
    effect('followPointer', { type: 'boolean | number' }),
    strength('bulge'),
    strength('ripple'),
    strength('press'),
    strength('tug'),
  ],
  tables: {
    main: {
      caption: 'GoopButtonGroup props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Same as shadcn.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the group.' },
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ButtonGroup.' },
        { prop: 'highlight', type: fx, def: 'true', note: "The hover and keyboard-focus background is one goo blob behind the buttons that slides between them (on touch it shows only while pressed). false gives shadcn's own hover backgrounds." },
        { prop: 'wobble', type: fx, def: 'true', note: 'The blob lands with a soft jelly overshoot. false: it settles without one.' },
        { prop: 'momentum', type: fx, def: 'true', note: 'The blob stretches while it travels and trails a low mound behind it.' },
        { prop: 'followPointer', type: fx, def: 'true', note: 'A low, wide swell of the blob sits under the pointer. false: centred.' },
        { prop: 'bulge', type: fx, def: 'true', note: "On press, the goo under the button swells a few px past its edges as a low, wide mound, then settles with a jelly rebound. A number scales it." },
        { prop: 'ripple', type: fx, def: 'true', note: 'On press, two soft lumps of goo leave the button and travel into its neighbours, thinning away. A number scales it.' },
        { prop: 'press', type: fx, def: 'true', note: 'The pressed button squishes: a little shorter across the group, a little longer along it. A number scales it.' },
        { prop: 'tug', type: fx, def: 'true', note: 'Its neighbours are pulled toward it and share some of the squish, less the further away they are. A number scales it.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

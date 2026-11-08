import { flag, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'card',
  title: 'Card',
  category: 'Layout',
  component: 'GoopCard',
  code: `<GoopCard class="w-full max-w-sm"{{main}}>
  <GoopCardHeader>
    <GoopCardTitle>Project Apollo</GoopCardTitle>
    <GoopCardDescription>Three tasks due this week.</GoopCardDescription>
    <GoopCardAction>
      <GoopBadge variant="outline">Live</GoopBadge>
    </GoopCardAction>
  </GoopCardHeader>
  <GoopCardContent>...</GoopCardContent>
  <GoopCardFooter class="gap-2">
    <GoopButton size="sm">Open</GoopButton>
    <GoopButton size="sm" variant="outline">Later</GoopButton>
  </GoopCardFooter>
</GoopCard>`,
  reactCode: `<GoopCard className="w-full max-w-sm"{{main}}>
  <GoopCardHeader>
    <GoopCardTitle>Project Apollo</GoopCardTitle>
    <GoopCardDescription>Three tasks due this week.</GoopCardDescription>
    <GoopCardAction>
      <GoopBadge variant="outline">Live</GoopBadge>
    </GoopCardAction>
  </GoopCardHeader>
  <GoopCardContent>...</GoopCardContent>
  <GoopCardFooter className="gap-2">
    <GoopButton size="sm">Open</GoopButton>
    <GoopButton size="sm" variant="outline">Later</GoopButton>
  </GoopCardFooter>
</GoopCard>`,
  controls: [flag('goo'), preset(), speed(), strength('swell')],
  reactTables: {
    main: {
      caption: 'GoopCard props',
      rows: [
        { prop: 'size', type: `'default' | 'sm'`, def: `'default'`, note: "Same as shadcn/ui: 'sm' tightens the spacing." },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
        { prop: 'goo', type: 'boolean', def: 'false', note: 'Turns the edge swell on. Off: a plain shadcn Card.' },
        { prop: 'swell', type: fx, def: 'true', note: 'With goo on, the edge nearest the pointer swells toward it in a low, wide mound. A number scales its height.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
        { prop: 'goopRef', type: 'Ref<CardHandle>', def: '', note: 'The live card handle (null before mount or with goo off). ref is the card div.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopCard props',
      rows: [
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
        { prop: 'goo', type: 'boolean', def: 'false', note: 'Turns the edge swell on. Off: a plain shadcn Card.' },
        { prop: 'swell', type: fx, def: 'true', note: 'With goo on, the edge nearest the pointer swells toward it in a low, wide mound. A number scales its height.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel.' },
      ],
    },
  },
})

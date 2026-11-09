import { choice, preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const rows = (cls: { prop: string; type: string }) => [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders a plain shadcn ScrollArea.' },
  {
    prop: 'stretch',
    type: fx,
    def: 'true',
    note: 'The thumb stretches with the scroll speed: a short tail trailing behind it, a touch thinner across. A number scales it.',
  },
  {
    prop: 'jelly',
    type: fx,
    def: 'true',
    note: 'Scrolling past an end (wheel, trackpad or touch) squashes the thumb against it; it springs back with a small jelly wobble. A number scales it.',
  },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: how far it stretches and squashes, and how much it wobbles.' },
  { prop: 'type', type: `'hover' | 'scroll' | 'auto' | 'always'`, def: `'hover'`, note: 'When the scrollbar shows (passed to the primitive).' },
  { ...cls, def: '', note: 'Merged onto the root. Give it a height.' },
]

export default defineComponentDoc({
  slug: 'scroll-area',
  title: 'Scroll Area',
  category: 'Layout',
  component: 'GoopScrollArea',
  code: `<GoopScrollArea{{main}} class="h-72 w-48 rounded-md border">
  <div class="p-4">
    <h4 class="mb-4 text-sm leading-none font-medium">Tags</h4>
    <template v-for="tag in tags" :key="tag">
      <div class="text-sm">{{ tag }}</div>
      <GoopSeparator class="my-2" />
    </template>
  </div>
</GoopScrollArea>`,
  reactCode: `<GoopScrollArea{{main}} className="h-72 w-48 rounded-md border">
  <div className="p-4">
    <h4 className="mb-4 text-sm leading-none font-medium">Tags</h4>
    {tags.map((tag) => (
      <Fragment key={tag}>
        <div className="text-sm">{tag}</div>
        <GoopSeparator className="my-2" />
      </Fragment>
    ))}
  </div>
</GoopScrollArea>`,
  controls: [preset(), speed({ max: 3 }), strength('stretch'), strength('jelly'), choice('type', ['hover', 'always'], 'hover')],
  reactTables: { main: { caption: 'GoopScrollArea props', rows: rows({ prop: 'className', type: 'string' }) } },
  tables: { main: { caption: 'GoopScrollArea props', rows: rows({ prop: 'class', type: 'string | array | object' }) } },
})

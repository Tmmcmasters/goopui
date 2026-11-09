import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'aspect-ratio',
  title: 'Aspect Ratio',
  category: 'Layout',
  component: 'GoopAspectRatio',
  code: `<div class="w-full max-w-sm">
  <GoopAspectRatio :ratio="16 / 9" class="rounded-lg bg-muted">
    <img src="/photo.jpg" alt="Photo" class="size-full rounded-lg object-cover" />
  </GoopAspectRatio>
</div>`,
  reactCode: `<div className="w-full max-w-sm">
  <GoopAspectRatio ratio={16 / 9} className="rounded-lg bg-muted">
    <img src="/photo.jpg" alt="Photo" className="size-full rounded-lg object-cover" />
  </GoopAspectRatio>
</div>`,
  controls: [],
  reactTables: {
    main: {
      caption: 'GoopAspectRatio props',
      rows: [
        { prop: 'ratio', type: 'number', def: '1', note: 'Width divided by height, e.g. 16 / 9.' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Passed to Radix AspectRatio.' },
        { prop: 'className', type: 'string', def: '', note: 'Set on the ratio box.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopAspectRatio props',
      rows: [
        { prop: 'ratio', type: 'number', def: '1', note: 'Width divided by height, e.g. 16 / 9.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Set on the ratio box.' },
      ],
    },
  },
})

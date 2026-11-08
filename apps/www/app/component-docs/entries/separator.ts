import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'separator',
  title: 'Separator',
  category: 'Layout',
  component: 'GoopSeparator',
  code: `<GoopSeparator class="my-4" />
<div class="flex h-5 items-center gap-4">
  <span>Blog</span>
  <GoopSeparator orientation="vertical" />
  <span>Docs</span>
</div>`,
  reactCode: `<GoopSeparator className="my-4" />
<div className="flex h-5 items-center gap-4">
  <span>Blog</span>
  <GoopSeparator orientation="vertical" />
  <span>Docs</span>
</div>`,
  controls: [],
  reactTables: {
    main: {
      caption: 'GoopSeparator props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Which way the line runs.' },
        { prop: 'decorative', type: 'boolean', def: 'true', note: 'Hidden from assistive tech. false gives it role="separator".' },
        { prop: 'asChild', type: 'boolean', def: 'false', note: 'Passed to Radix Separator.' },
        { prop: 'className', type: 'string', def: '', note: 'Merged onto the root.' },
      ],
    },
  },
  tables: {
    main: {
      caption: 'GoopSeparator props',
      rows: [
        { prop: 'orientation', type: `'horizontal' | 'vertical'`, def: `'horizontal'`, note: 'Which way the line runs.' },
        { prop: 'decorative', type: 'boolean', def: 'true', note: 'Hidden from assistive tech. false gives it role="separator".' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
      ],
    },
  },
})

import { preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

const rows = (cls: { prop: string; type: string }) => [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn handles.' },
  {
    prop: 'bulge',
    type: fx,
    def: 'true',
    note: 'While you drag, the grip is a goo bead that swells a little and bulges toward the drag in a low, wide mound. Without a grip the mound rises on the line under the pointer. A number scales it.',
  },
  { prop: 'wobble', type: fx, def: 'true', note: 'On release the bead wobbles back like jelly. Off: it eases back. A number scales the wobble.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: how much the bead swells and bulges, and how loose the wobble is.' },
  { ...cls, def: '', note: 'Merged onto the group.' },
]

export default defineComponentDoc({
  slug: 'resizable',
  title: 'Resizable',
  category: 'Layout',
  component: 'GoopResizablePanelGroup',
  code: `<GoopResizablePanelGroup{{main}} direction="horizontal" class="max-w-md rounded-lg border">
  <GoopResizablePanel :default-size="50">
    <div class="flex h-[200px] items-center justify-center p-6">
      <span class="font-semibold">One</span>
    </div>
  </GoopResizablePanel>
  <GoopResizableHandle with-handle />
  <GoopResizablePanel :default-size="50">
    <div class="flex h-[200px] items-center justify-center p-6">
      <span class="font-semibold">Two</span>
    </div>
  </GoopResizablePanel>
</GoopResizablePanelGroup>`,
  reactCode: `<GoopResizablePanelGroup{{main}} orientation="horizontal" className="max-w-md rounded-lg border">
  <GoopResizablePanel defaultSize="50%">
    <div className="flex h-[200px] items-center justify-center p-6">
      <span className="font-semibold">One</span>
    </div>
  </GoopResizablePanel>
  <GoopResizableHandle withHandle />
  <GoopResizablePanel defaultSize="50%">
    <div className="flex h-[200px] items-center justify-center p-6">
      <span className="font-semibold">Two</span>
    </div>
  </GoopResizablePanel>
</GoopResizablePanelGroup>`,
  controls: [preset(), speed({ max: 3 }), strength('bulge'), strength('wobble')],
  reactTables: {
    main: { caption: 'GoopResizablePanelGroup props (its handles inherit them)', rows: rows({ prop: 'className', type: 'string' }) },
  },
  tables: {
    main: { caption: 'GoopResizablePanelGroup props (its handles inherit them)', rows: rows({ prop: 'class', type: 'string | array | object' }) },
  },
})

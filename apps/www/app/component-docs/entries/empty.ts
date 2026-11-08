import { preset, speed, strength } from '../controls'
import { defineComponentDoc } from '../types'

const fx = 'boolean | number'

export default defineComponentDoc({
  slug: 'empty',
  title: 'Empty',
  category: 'Feedback',
  component: 'GoopEmpty',
  code: `<GoopEmpty{{main}}>
  <GoopEmptyHeader>
    <GoopEmptyMedia variant="icon">
      <FolderIcon />
    </GoopEmptyMedia>
    <GoopEmptyTitle>No Projects Yet</GoopEmptyTitle>
    <GoopEmptyDescription>
      You haven't created any projects yet. Get started by creating your first project.
    </GoopEmptyDescription>
  </GoopEmptyHeader>
  <GoopEmptyContent>
    <GoopButton>Create Project</GoopButton>
  </GoopEmptyContent>
</GoopEmpty>`,
  controls: [preset(), speed({ max: 4 }), strength('puddle'), strength('breathe')],
  tables: {
    main: {
      caption: 'GoopEmpty props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Empty parts.' },
        { prop: 'puddle', type: fx, def: 'true', note: `The media sits in a low, wide goo puddle of its own muted tone, whose middle rises to meet it. A number scales its depth.` },
        { prop: 'breathe', type: fx, def: 'true', note: 'The puddle breathes very slowly, about 1px. A number scales it. Still under reduced motion.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Breathing speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The feel: puddle size, lumpiness and breath.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
      ],
    },
  },
})

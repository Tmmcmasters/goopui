import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'label',
  title: 'Label',
  category: 'Forms',
  component: 'GoopLabel',
  code: `<GoopLabel for="email">Email</GoopLabel>
<GoopInput id="email" type="email" placeholder="you@example.com" />`,
  controls: [],
  tables: {
    main: {
      caption: 'GoopLabel props',
      rows: [
        { prop: 'for', type: 'string', def: '', note: 'The id of the control it labels.' },
        { prop: 'asChild, as', type: '', def: '', note: 'The element to render, via reka-ui.' },
        { prop: 'class', type: 'string | array | object', def: '', note: 'Merged onto the root.' },
      ],
    },
  },
})

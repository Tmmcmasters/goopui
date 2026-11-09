import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

export default defineComponentDoc({
  slug: 'pagination',
  title: 'Pagination',
  category: 'Navigation',
  component: 'GoopPagination',
  code: `<GoopPagination v-slot="{ page }" :items-per-page="10" :total="100" :default-page="2"{{main}}>
  <GoopPaginationContent v-slot="{ items }">
    <GoopPaginationPrevious />
    <template v-for="(item, index) in items" :key="index">
      <GoopPaginationItem v-if="item.type === 'page'" :value="item.value" :is-active="item.value === page">
        {{ item.value }}
      </GoopPaginationItem>
      <GoopPaginationEllipsis v-else :index="index" />
    </template>
    <GoopPaginationNext />
  </GoopPaginationContent>
</GoopPagination>`,
  reactCode: `const [page, setPage] = useState(2)

<GoopPagination{{main}}>
  <GoopPaginationContent>
    <GoopPaginationItem>
      <GoopPaginationPrevious href="#" onClick={() => setPage(Math.max(1, page - 1))} />
    </GoopPaginationItem>
    {[1, 2, 3, 4, 5].map((n) => (
      <GoopPaginationItem key={n}>
        <GoopPaginationLink href="#" isActive={n === page} onClick={() => setPage(n)}>
          {n}
        </GoopPaginationLink>
      </GoopPaginationItem>
    ))}
    <GoopPaginationItem>
      <GoopPaginationEllipsis />
    </GoopPaginationItem>
    <GoopPaginationItem>
      <GoopPaginationNext href="#" onClick={() => setPage(Math.min(10, page + 1))} />
    </GoopPaginationItem>
  </GoopPaginationContent>
</GoopPagination>`,
  reactTables: {
    main: {
      caption: 'GoopPagination props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Pagination parts.' },
        { prop: 'indicator', type: 'boolean', def: 'true', note: `The current page (the GoopPaginationLink with isActive) is a goo blob that slides between page numbers. false gives shadcn's outline button.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot when the blob lands.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
        { prop: 'press', type: 'boolean', def: 'true', note: 'Previous, Next, First and Last squish when pressed, like GoopButton.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
  controls: [
    preset(),
    speed(),
    effect('indicator', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    effect('momentum', { type: 'boolean' }),
    effect('press', { type: 'boolean' }),
  ],
  tables: {
    main: {
      caption: 'GoopPagination props',
      rows: [
        { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Pagination parts.' },
        { prop: 'indicator', type: 'boolean', def: 'true', note: `The current page is a goo blob that slides between page numbers. false gives shadcn's outline button.` },
        { prop: 'wobble', type: 'boolean', def: 'true', note: 'Jelly overshoot when the blob lands.' },
        { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
        { prop: 'press', type: 'boolean', def: 'true', note: 'First, Previous, Next and Last squish when pressed, like GoopButton.' },
        { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
        { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
        { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
      ],
    },
  },
})

import { effect, preset, speed } from '../controls'
import { defineComponentDoc } from '../types'

const rows = (cls: string, ref: string, handle: string) => [
  { prop: 'goo', type: 'boolean', def: 'true', note: 'Master switch. false renders plain shadcn Table parts.' },
  { prop: 'highlight', type: 'boolean', def: 'true', note: `The body rows' hover background is one goo blob that glides from row to row. false gives shadcn's flat hover fill.` },
  { prop: 'wobble', type: 'boolean', def: 'true', note: 'A soft jelly landing when the blob reaches a row.' },
  { prop: 'momentum', type: 'boolean', def: 'true', note: 'The blob stretches gently and trails a short tail while it travels.' },
  { prop: 'followPointer', type: 'boolean', def: 'true', note: 'A low, wide swell of the blob sits under the pointer.' },
  { prop: 'selected', type: 'boolean', def: 'false', note: 'When nothing is hovered the blob rests on the selected row (data-state="selected") and is its fill.' },
  { prop: 'speed', type: 'number', def: '1', note: 'Animation speed multiplier.' },
  { prop: 'preset', type: `'subtle' | 'playful' | 'wild'`, def: 'app config, then playful', note: 'The overall feel.' },
  { prop: 'renderer', type: `'svg' | 'canvas'`, def: `'svg'`, note: 'How the goo is drawn.' },
  { prop: cls, type: 'string', def: '', note: 'Merged onto the <table>, like shadcn.' },
  ...(ref ? [{ prop: 'ref', type: ref, def: '', note: 'The <table> element, as in shadcn/ui.' }] : []),
  { prop: handle.split(':')[0]!, type: handle.split(':')[1]!, def: '', note: 'The live row highlight handle (null before mount or with the blob off).' },
]

const body = (cls: string, colspan: string) => `  <GoopTableCaption>A list of your recent invoices.</GoopTableCaption>
  <GoopTableHeader>
    <GoopTableRow>
      <GoopTableHead ${cls}="w-[100px]">Invoice</GoopTableHead>
      <GoopTableHead>Status</GoopTableHead>
      <GoopTableHead>Method</GoopTableHead>
      <GoopTableHead ${cls}="text-right">Amount</GoopTableHead>
    </GoopTableRow>
  </GoopTableHeader>
  <GoopTableBody>
    <GoopTableRow>
      <GoopTableCell ${cls}="font-medium">INV001</GoopTableCell>
      <GoopTableCell>Paid</GoopTableCell>
      <GoopTableCell>Credit Card</GoopTableCell>
      <GoopTableCell ${cls}="text-right">$250.00</GoopTableCell>
    </GoopTableRow>
    <!-- ...more rows -->
  </GoopTableBody>
  <GoopTableFooter>
    <GoopTableRow>
      <GoopTableCell ${colspan}>Total</GoopTableCell>
      <GoopTableCell ${cls}="text-right">$1,750.00</GoopTableCell>
    </GoopTableRow>
  </GoopTableFooter>`

export default defineComponentDoc({
  slug: 'table',
  title: 'Table',
  category: 'Layout',
  component: 'GoopTable',
  code: `<GoopTable{{main}}>
${body('class', ':colspan="3"')}
</GoopTable>`,
  reactCode: `<GoopTable{{main}}>
${body('className', 'colSpan={3}').replace('<!-- ...more rows -->', '{/* ...more rows */}')}
</GoopTable>`,
  controls: [
    preset(),
    speed(),
    effect('highlight', { type: 'boolean' }),
    effect('wobble', { type: 'boolean' }),
    effect('momentum', { type: 'boolean' }),
    effect('followPointer', { type: 'boolean' }),
  ],
  tables: { main: { caption: 'GoopTable props', rows: rows('class', '', 'handle:TableHighlightHandle | null (exposed)') } },
  reactTables: { main: { caption: 'GoopTable props', rows: rows('className', 'Ref<HTMLTableElement>', 'goopRef:Ref<TableHighlightHandle>') } },
})

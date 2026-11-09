/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for Table, Item and Input Group and their /react/docs/components tiles. Each
// set mirrors its Vue twin (components/content/Demo{Table,Item,InputGroup}.vue,
// components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them in sync.
import {
  GoopAvatar,
  GoopAvatarFallback,
  GoopButton,
  GoopInputGroup,
  GoopInputGroupAddon,
  GoopInputGroupButton,
  GoopInputGroupInput,
  GoopInputGroupText,
  GoopInputGroupTextarea,
  GoopItem,
  GoopItemActions,
  GoopItemContent,
  GoopItemDescription,
  GoopItemGroup,
  GoopItemMedia,
  GoopItemTitle,
  GoopTable,
  GoopTableBody,
  GoopTableCaption,
  GoopTableCell,
  GoopTableFooter,
  GoopTableHead,
  GoopTableHeader,
  GoopTableRow,
} from '@goopui/react'
import { useState, type MouseEvent } from 'react'

type Pg = Record<string, Record<string, unknown>>

// The site's SiteIcon.vue strokes.
const PATHS = {
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
} as const

function Icon({ name, size = 16, className }: { name: keyof typeof PATHS; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'shrink-0'}
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  )
}

const prevent = (e: MouseEvent) => e.preventDefault()

// ---- Table (DemoTable.vue) ---------------------------------------------------------------------

const INVOICES = [
  { invoice: 'INV001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
  { invoice: 'INV002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
  { invoice: 'INV003', status: 'Unpaid', method: 'Bank Transfer', amount: '$350.00' },
  { invoice: 'INV004', status: 'Paid', method: 'Credit Card', amount: '$450.00' },
  { invoice: 'INV005', status: 'Paid', method: 'PayPal', amount: '$550.00' },
]

export function TableDemo({ set, pg }: { set: string; pg: Pg }) {
  const [picked, setPicked] = useState('INV002')
  if (set === 'selected')
    return (
      <GoopTable className="w-full max-w-xl" selected>
        <GoopTableHeader>
          <GoopTableRow>
            <GoopTableHead className="w-[100px]">Invoice</GoopTableHead>
            <GoopTableHead>Status</GoopTableHead>
            <GoopTableHead className="text-right">Amount</GoopTableHead>
          </GoopTableRow>
        </GoopTableHeader>
        <GoopTableBody>
          {INVOICES.slice(0, 4).map((row) => (
            <GoopTableRow
              key={row.invoice}
              data-state={picked === row.invoice ? 'selected' : undefined}
              className="cursor-pointer"
              onClick={() => setPicked(row.invoice)}
            >
              <GoopTableCell className="font-medium">{row.invoice}</GoopTableCell>
              <GoopTableCell>{row.status}</GoopTableCell>
              <GoopTableCell className="text-right">{row.amount}</GoopTableCell>
            </GoopTableRow>
          ))}
        </GoopTableBody>
      </GoopTable>
    )
  return (
    <GoopTable className="w-full max-w-xl" {...pg.main}>
      <GoopTableCaption>A list of your recent invoices.</GoopTableCaption>
      <GoopTableHeader>
        <GoopTableRow>
          <GoopTableHead className="w-[100px]">Invoice</GoopTableHead>
          <GoopTableHead>Status</GoopTableHead>
          <GoopTableHead>Method</GoopTableHead>
          <GoopTableHead className="text-right">Amount</GoopTableHead>
        </GoopTableRow>
      </GoopTableHeader>
      <GoopTableBody>
        {INVOICES.map((row) => (
          <GoopTableRow key={row.invoice}>
            <GoopTableCell className="font-medium">{row.invoice}</GoopTableCell>
            <GoopTableCell>{row.status}</GoopTableCell>
            <GoopTableCell>{row.method}</GoopTableCell>
            <GoopTableCell className="text-right">{row.amount}</GoopTableCell>
          </GoopTableRow>
        ))}
      </GoopTableBody>
      <GoopTableFooter>
        <GoopTableRow>
          <GoopTableCell colSpan={3}>Total</GoopTableCell>
          <GoopTableCell className="text-right">$1,750.00</GoopTableCell>
        </GoopTableRow>
      </GoopTableFooter>
    </GoopTable>
  )
}

// ---- Item (DemoItem.vue) -----------------------------------------------------------------------

const PEOPLE = [
  { name: 'Ada Lovelace', email: 'ada@example.com', initials: 'AL' },
  { name: 'Grace Hopper', email: 'grace@example.com', initials: 'GH' },
  { name: 'Alan Turing', email: 'alan@example.com', initials: 'AT' },
]

export function ItemDemo({ set, pg }: { set: string; pg: Pg }) {
  if (set === 'variants')
    return (
      <div className="flex w-full max-w-md flex-col gap-4">
        <GoopItem variant="outline">
          <GoopItemContent>
            <GoopItemTitle>Basic Item</GoopItemTitle>
            <GoopItemDescription>A simple item with title and description.</GoopItemDescription>
          </GoopItemContent>
          <GoopItemActions>
            <GoopButton variant="outline" size="sm">
              Action
            </GoopButton>
          </GoopItemActions>
        </GoopItem>
        <GoopItem variant="muted" asChild size="sm">
          <a href="#" onClick={prevent}>
            <GoopItemMedia variant="icon">
              <Icon name="circleCheck" />
            </GoopItemMedia>
            <GoopItemContent>
              <GoopItemTitle>Your profile has been verified.</GoopItemTitle>
            </GoopItemContent>
            <GoopItemActions>
              <Icon name="arrowRight" />
            </GoopItemActions>
          </a>
        </GoopItem>
      </div>
    )
  return (
    <GoopItemGroup className="w-full max-w-sm gap-1" {...pg.main}>
      {PEOPLE.map((p) => (
        <GoopItem key={p.email} asChild size="sm">
          <a href="#" onClick={prevent}>
            <GoopItemMedia>
              <GoopAvatar className="size-8">
                <GoopAvatarFallback className="text-xs">{p.initials}</GoopAvatarFallback>
              </GoopAvatar>
            </GoopItemMedia>
            <GoopItemContent className="gap-0.5">
              <GoopItemTitle>{p.name}</GoopItemTitle>
              <GoopItemDescription>{p.email}</GoopItemDescription>
            </GoopItemContent>
            <GoopItemActions>
              <Icon name="arrowRight" className="shrink-0 text-muted-foreground" />
            </GoopItemActions>
          </a>
        </GoopItem>
      ))}
    </GoopItemGroup>
  )
}

// ---- Input Group (DemoInputGroup.vue) ----------------------------------------------------------

export function InputGroupDemo({ set, pg }: { set: string; pg: Pg }) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  if (set === 'button')
    return (
      <GoopInputGroup containerClassName="max-w-sm">
        <GoopInputGroupInput defaultValue="https://goop.timmcmasters.work" readOnly aria-label="Link" />
        <GoopInputGroupAddon align="inline-end">
          <GoopInputGroupButton size="icon-xs" aria-label="Copy">
            <Icon name="copy" />
          </GoopInputGroupButton>
        </GoopInputGroupAddon>
      </GoopInputGroup>
    )
  if (set === 'textarea')
    return (
      <GoopInputGroup containerClassName="max-w-sm">
        <GoopInputGroupTextarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ask, search or chat..." aria-label="Message" />
        <GoopInputGroupAddon align="block-end">
          <GoopInputGroupText>{message.length}/280</GoopInputGroupText>
          <GoopInputGroupButton variant="default" size="xs" className="ml-auto">
            Send
          </GoopInputGroupButton>
        </GoopInputGroupAddon>
      </GoopInputGroup>
    )
  return (
    <GoopInputGroup containerClassName="max-w-sm" {...pg.main}>
      <GoopInputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." aria-label="Search" />
      <GoopInputGroupAddon>
        <Icon name="search" />
      </GoopInputGroupAddon>
      <GoopInputGroupAddon align="inline-end">12 results</GoopInputGroupAddon>
    </GoopInputGroup>
  )
}

// ---- Tiles (ComponentTile.vue) -----------------------------------------------------------------

/** The /react/docs/components tile of Table, Item or Input Group, or null. */
export function DisplayTile({ slug }: { slug: string }) {
  switch (slug) {
    case 'table':
      return (
        <GoopTable className="w-36 text-[10px]">
          <GoopTableBody>
            {['INV001', 'INV002', 'INV003'].map((id, i) => (
              <GoopTableRow key={id} data-state={i === 1 ? 'selected' : undefined}>
                <GoopTableCell className="px-1.5 py-1 font-medium">{id}</GoopTableCell>
                <GoopTableCell className="px-1.5 py-1 text-right">${(i + 2) * 50}</GoopTableCell>
              </GoopTableRow>
            ))}
          </GoopTableBody>
        </GoopTable>
      )
    case 'item':
      return (
        <GoopItem variant="outline" size="xs" className="w-36">
          <GoopItemMedia variant="icon">
            <Icon name="circleCheck" size={12} />
          </GoopItemMedia>
          <GoopItemContent>
            <GoopItemTitle className="text-[11px]">Verified</GoopItemTitle>
          </GoopItemContent>
        </GoopItem>
      )
    case 'input-group':
      return (
        <GoopInputGroup containerClassName="w-36" className="h-8">
          <GoopInputGroupInput placeholder="Search" aria-label="Search" className="text-xs" />
          <GoopInputGroupAddon>
            <Icon name="search" size={14} />
          </GoopInputGroupAddon>
        </GoopInputGroup>
      )
    default:
      return null
  }
}

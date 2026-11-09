/** @jsxRuntime automatic */
/** @jsxImportSource react */
// React previews for the simple batch (Alert, Kbd, Breadcrumb, Empty, Button Group,
// Pagination, Accordion / Collapsible) and their /react/docs/components tiles. Each set mirrors
// its Vue twin (components/content/Demo{Alert,Kbd,Breadcrumb,Empty,ButtonGroup,Pagination,
// Accordion}.vue, components/docs/ComponentTile.vue) so the two pages compare 1:1; keep them
// in sync.
import {
  GoopAccordion,
  GoopAccordionContent,
  GoopAccordionItem,
  GoopAccordionTrigger,
  GoopAlert,
  GoopAlertDescription,
  GoopAlertTitle,
  GoopBreadcrumb,
  GoopBreadcrumbEllipsis,
  GoopBreadcrumbItem,
  GoopBreadcrumbLink,
  GoopBreadcrumbList,
  GoopBreadcrumbPage,
  GoopBreadcrumbSeparator,
  GoopButton,
  GoopButtonGroup,
  GoopButtonGroupSeparator,
  GoopButtonGroupText,
  GoopCollapsible,
  GoopCollapsibleContent,
  GoopCollapsibleTrigger,
  GoopEmpty,
  GoopEmptyContent,
  GoopEmptyDescription,
  GoopEmptyHeader,
  GoopEmptyMedia,
  GoopEmptyTitle,
  GoopKbd,
  GoopKbdGroup,
  GoopPagination,
  GoopPaginationContent,
  GoopPaginationEllipsis,
  GoopPaginationFirst,
  GoopPaginationItem,
  GoopPaginationLast,
  GoopPaginationLink,
  GoopPaginationNext,
  GoopPaginationPrevious,
} from '@goopui/react'
import { Fragment, useState, type MouseEvent } from 'react'

type Pg = Record<string, Record<string, unknown>>

// ---- Icons (the site's SiteIcon.vue set, same strokes) ----------------------------------------

const PATHS = {
  circleCheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  circleAlert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
} as const

function Icon({ name, size = 16 }: { name: keyof typeof PATHS; size?: number }) {
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
      className="shrink-0"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  )
}

const stop = (e: MouseEvent) => e.preventDefault()

// ---- Alert (DemoAlert.vue) ------------------------------------------------------------------

export function AlertDemo({ set, pg }: { set: string; pg: Pg }) {
  const main = pg.main ?? {}
  const [replay, setReplay] = useState(0)
  switch (set) {
    case 'destructive':
      return (
        <div className="alert-demo w-full max-w-md">
          <GoopAlert variant="destructive">
            <Icon name="circleAlert" />
            <GoopAlertTitle>Unable to process your payment.</GoopAlertTitle>
            <GoopAlertDescription>
              <p>Please verify your billing information and try again.</p>
            </GoopAlertDescription>
          </GoopAlert>
        </div>
      )
    case 'plain':
      return (
        <div className="grid w-full max-w-md gap-3">
          <div className="flex justify-end">
            <GoopButton size="xs" variant="outline" onClick={() => setReplay((n) => n + 1)}>
              Play again
            </GoopButton>
          </div>
          <GoopAlert key={`w${replay}`} preset="wild">
            <Icon name="info" />
            <GoopAlertTitle>preset="wild"</GoopAlertTitle>
          </GoopAlert>
          <GoopAlert key={`b${replay}`} bloom={false}>
            <Icon name="info" />
            <GoopAlertTitle>bloom={'{false}'} (the icon still wobbles)</GoopAlertTitle>
          </GoopAlert>
          <GoopAlert key={`g${replay}`} goo={false}>
            <Icon name="info" />
            <GoopAlertTitle>goo={'{false}'} (plain shadcn)</GoopAlertTitle>
          </GoopAlert>
        </div>
      )
    default:
      return (
        <GoopAlert className="max-w-md" {...main}>
          <Icon name={main.variant === 'destructive' ? 'circleAlert' : 'circleCheck'} />
          <GoopAlertTitle>Success! Your changes have been saved</GoopAlertTitle>
          <GoopAlertDescription>This is an alert with icon, title and description.</GoopAlertDescription>
        </GoopAlert>
      )
  }
}

// ---- Kbd (DemoKbd.vue) ----------------------------------------------------------------------

export function KbdDemo({ set, pg }: { set: string; pg: Pg }) {
  const main = pg.main ?? {}
  if (set === 'text')
    return (
      <p className="text-sm text-muted-foreground">
        Use{' '}
        <GoopKbdGroup>
          <GoopKbd keys={['Control', 'B']}>Ctrl + B</GoopKbd>
          <GoopKbd keys={['Control', 'K']}>Ctrl + K</GoopKbd>
        </GoopKbdGroup>{' '}
        to open the command palette
      </p>
    )
  return (
    <div className="flex flex-col items-center gap-4">
      <GoopKbdGroup>
        <GoopKbd keys={['Meta']} {...main}>⌘</GoopKbd>
        <GoopKbd keys={['Meta', 'K']} {...main}>K</GoopKbd>
      </GoopKbdGroup>
      <GoopKbdGroup>
        <GoopKbd keys={['Shift']} {...main}>⇧</GoopKbd>
        <GoopKbd keys={['Alt']} {...main}>⌥</GoopKbd>
        <GoopKbd keys={['Control']} {...main}>⌃</GoopKbd>
        <GoopKbd keys={['Escape']} {...main}>Esc</GoopKbd>
      </GoopKbdGroup>
    </div>
  )
}

// ---- Breadcrumb (DemoBreadcrumb.vue) --------------------------------------------------------

export function BreadcrumbDemo({ set, pg }: { set: string; pg: Pg }) {
  const main = pg.main ?? {}
  const link = (label: string) => (
    <GoopBreadcrumbLink href="#" onClick={stop}>
      {label}
    </GoopBreadcrumbLink>
  )
  return (
    <div className="breadcrumb-demo">
      {set === 'slash' ? (
        <GoopBreadcrumb>
          <GoopBreadcrumbList>
            {['Home', 'Docs', 'Components'].map((label) => (
              <Fragment key={label}>
                <GoopBreadcrumbItem>{link(label)}</GoopBreadcrumbItem>
                <GoopBreadcrumbSeparator>/</GoopBreadcrumbSeparator>
              </Fragment>
            ))}
            <GoopBreadcrumbItem>
              <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
            </GoopBreadcrumbItem>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      ) : (
        <GoopBreadcrumb {...main}>
          <GoopBreadcrumbList>
            <GoopBreadcrumbItem>{link('Home')}</GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem>
              <GoopBreadcrumbEllipsis />
            </GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem>{link('Components')}</GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem>
              <GoopBreadcrumbPage>Breadcrumb</GoopBreadcrumbPage>
            </GoopBreadcrumbItem>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      )}
    </div>
  )
}

// ---- Empty (DemoEmpty.vue) ------------------------------------------------------------------

export function EmptyDemo({ set, pg }: { set: string; pg: Pg }) {
  if (set === 'media')
    return (
      <GoopEmpty className="empty-demo p-2">
        <GoopEmptyHeader>
          <GoopEmptyMedia>
            <Icon name="inbox" size={28} />
          </GoopEmptyMedia>
          <GoopEmptyTitle>Inbox zero</GoopEmptyTitle>
          <GoopEmptyDescription>Nothing to read. Enjoy the quiet.</GoopEmptyDescription>
        </GoopEmptyHeader>
      </GoopEmpty>
    )
  return (
    <GoopEmpty className="empty-demo p-2" {...pg.main}>
      <GoopEmptyHeader>
        <GoopEmptyMedia variant="icon">
          <Icon name="folder" />
        </GoopEmptyMedia>
        <GoopEmptyTitle>No Projects Yet</GoopEmptyTitle>
        <GoopEmptyDescription>You haven't created any projects yet. Get started by creating your first project.</GoopEmptyDescription>
      </GoopEmptyHeader>
      <GoopEmptyContent>
        <GoopButton>Create Project</GoopButton>
      </GoopEmptyContent>
    </GoopEmpty>
  )
}

// ---- Button Group (DemoButtonGroup.vue) -----------------------------------------------------

export function ButtonGroupDemo({ set, pg }: { set: string; pg: Pg }) {
  switch (set) {
    case 'vertical':
      return (
        <GoopButtonGroup orientation="vertical">
          <GoopButton variant="outline" size="icon" aria-label="Increase">
            <Icon name="plus" />
          </GoopButton>
          <GoopButton variant="outline" size="icon" aria-label="Decrease">
            <Icon name="minus" />
          </GoopButton>
        </GoopButtonGroup>
      )
    case 'variants':
      return (
        <div className="flex flex-col items-center gap-4">
          {(['default', 'outline', 'secondary', 'ghost'] as const).map((variant) => (
            <GoopButtonGroup key={variant} aria-label={`${variant} group`}>
              <GoopButton variant={variant}>Bold</GoopButton>
              <GoopButton variant={variant}>Italic</GoopButton>
              <GoopButton variant={variant}>Underline</GoopButton>
            </GoopButtonGroup>
          ))}
          <GoopButtonGroup aria-label="Zoom">
            <GoopButton variant="outline" size="icon" aria-label="Zoom out">
              <Icon name="minus" />
            </GoopButton>
            <GoopButton variant="outline" size="icon" aria-label="Zoom in">
              <Icon name="plus" />
            </GoopButton>
          </GoopButtonGroup>
        </div>
      )
    case 'separator':
      return (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <GoopButtonGroup>
            <GoopButton variant="secondary">Copy</GoopButton>
            <GoopButtonGroupSeparator />
            <GoopButton variant="secondary">Paste</GoopButton>
          </GoopButtonGroup>
          <GoopButtonGroup>
            <GoopButtonGroupText>https://</GoopButtonGroupText>
            <GoopButton variant="outline">goop.dev</GoopButton>
          </GoopButtonGroup>
        </div>
      )
    default:
      return (
        <GoopButtonGroup {...pg.main}>
          <GoopButton variant="outline">Archive</GoopButton>
          <GoopButton variant="outline">Report</GoopButton>
          <GoopButton variant="outline">Snooze</GoopButton>
        </GoopButtonGroup>
      )
  }
}

// ---- Pagination (DemoPagination.vue) --------------------------------------------------------
// shadcn/ui React's Pagination has no page state: the demo keeps it, and builds the same page
// window as reka-ui's PaginationList does for the Vue preview (siblingCount 2, no edges: five
// pages around the current one, so no ellipsis shows at these sizes).

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i)

/** reka-ui's page window without edges (`getRange(page, total, 2, false)`). */
function pageItems(page: number, total: number): (number | 'ellipsis')[] {
  const sib = 2
  const count = sib * 2 + 1
  if (total < count) return range(1, total)
  if (page <= sib + 1) return range(1, count)
  if (total - page <= sib) return range(total - count + 1, total)
  return range(Math.max(page - sib, 1), Math.min(page + sib, total))
}

function PagerDemo({ total, start, edges = false, ellipsis = true, props = {} }: { total: number; start: number; edges?: boolean; ellipsis?: boolean; props?: Record<string, unknown> }) {
  const [page, setPage] = useState(start)
  const go = (n: number) => (e: MouseEvent) => {
    e.preventDefault()
    setPage(Math.min(total, Math.max(1, n)))
  }
  const items = pageItems(page, total)
  return (
    <GoopPagination {...props}>
      <GoopPaginationContent>
        {edges && (
          <GoopPaginationItem>
            <GoopPaginationFirst href="#" onClick={go(1)} />
          </GoopPaginationItem>
        )}
        <GoopPaginationItem>
          <GoopPaginationPrevious href="#" onClick={go(page - 1)} />
        </GoopPaginationItem>
        {items.map((item, i) =>
          item === 'ellipsis' ? (
            ellipsis && (
              <GoopPaginationItem key={`e${i}`}>
                <GoopPaginationEllipsis />
              </GoopPaginationItem>
            )
          ) : (
            <GoopPaginationItem key={item}>
              <GoopPaginationLink href="#" isActive={item === page} onClick={go(item)}>
                {item}
              </GoopPaginationLink>
            </GoopPaginationItem>
          ),
        )}
        <GoopPaginationItem>
          <GoopPaginationNext href="#" onClick={go(page + 1)} />
        </GoopPaginationItem>
        {edges && (
          <GoopPaginationItem>
            <GoopPaginationLast href="#" onClick={go(total)} />
          </GoopPaginationItem>
        )}
      </GoopPaginationContent>
    </GoopPagination>
  )
}

const PAGINATION_VARIANTS = [{ preset: 'wild' }, { wobble: false, momentum: false }, { goo: false }] as const

export function PaginationDemo({ set, pg }: { set: string; pg: Pg }) {
  switch (set) {
    case 'edges':
      return <PagerDemo total={5} start={1} edges ellipsis={false} />
    case 'plain':
      return (
        <div className="grid gap-4">
          {PAGINATION_VARIANTS.map((v, i) => (
            <PagerDemo key={i} total={5} start={1} ellipsis={false} props={v} />
          ))}
        </div>
      )
    default:
      return <PagerDemo total={10} start={2} props={pg.main} />
  }
}

// ---- Accordion / Collapsible (DemoAccordion.vue) --------------------------------------------

const FAQ = [
  { value: 'what', title: 'What is goopUI?', body: 'shadcn/ui components with gooey, dripping motion. Same API, more slime.' },
  { value: 'motion', title: 'Does it respect reduced motion?', body: 'Yes. The open row becomes a still fill and the content opens plainly.' },
  { value: 'off', title: 'Can I turn the goo off?', body: 'Every effect has its own prop, and goo={false} renders plain shadcn.' },
]

const faq = FAQ.map((i) => (
  <GoopAccordionItem key={i.value} value={i.value}>
    <GoopAccordionTrigger>{i.title}</GoopAccordionTrigger>
    <GoopAccordionContent>{i.body}</GoopAccordionContent>
  </GoopAccordionItem>
))

function CollapsibleDemo() {
  const [open, setOpen] = useState(false)
  return (
    <GoopCollapsible open={open} onOpenChange={setOpen} className="flex w-full max-w-sm flex-col gap-2">
      <div className="flex items-center justify-between gap-4 px-1">
        <span className="text-sm font-medium">3 starred repositories</span>
        <GoopCollapsibleTrigger asChild>
          <GoopButton variant="outline" size="sm">
            {open ? 'Hide' : 'Show'}
          </GoopButton>
        </GoopCollapsibleTrigger>
      </div>
      <div className="rounded-md border px-4 py-2 font-mono text-sm">goopui/core</div>
      <GoopCollapsibleContent className="flex flex-col gap-2">
        <div className="rounded-md border px-4 py-2 font-mono text-sm">goopui/react</div>
        <div className="rounded-md border px-4 py-2 font-mono text-sm">goopui/vue</div>
      </GoopCollapsibleContent>
    </GoopCollapsible>
  )
}

export function AccordionDemo({ set, pg }: { set: string; pg: Pg }) {
  switch (set) {
    case 'multiple':
      return (
        <GoopAccordion type="multiple" preset="wild" droplets={2} className="w-full max-w-md">
          {faq}
        </GoopAccordion>
      )
    case 'collapsible':
      return <CollapsibleDemo />
    default:
      return (
        <GoopAccordion type="single" collapsible defaultValue="what" className="w-full max-w-md" {...pg.main}>
          {faq}
        </GoopAccordion>
      )
  }
}

// ---- Tiles (ComponentTile.vue) --------------------------------------------------------------

/** The /react/docs/components tile of a simple-batch component, or null. */
export function SimpleTile({ slug }: { slug: string }) {
  switch (slug) {
    case 'alert':
      return (
        <GoopAlert className="w-40 border-border px-2 py-1.5 text-[10px] *:[svg:not([class*=size-])]:size-3">
          <Icon name="circleCheck" />
          <GoopAlertTitle>Saved</GoopAlertTitle>
          <GoopAlertDescription className="text-[10px]">Your changes are live.</GoopAlertDescription>
        </GoopAlert>
      )
    case 'kbd':
      return (
        <GoopKbdGroup>
          <GoopKbd>⌘</GoopKbd>
          <GoopKbd>K</GoopKbd>
        </GoopKbdGroup>
      )
    case 'breadcrumb':
      return (
        <GoopBreadcrumb className="text-[11px]">
          <GoopBreadcrumbList className="gap-1 text-[11px]">
            <GoopBreadcrumbItem>
              <GoopBreadcrumbLink asChild>
                <span>Home</span>
              </GoopBreadcrumbLink>
            </GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem>
              <GoopBreadcrumbLink asChild>
                <span>Docs</span>
              </GoopBreadcrumbLink>
            </GoopBreadcrumbItem>
            <GoopBreadcrumbSeparator />
            <GoopBreadcrumbItem>
              <GoopBreadcrumbPage>Here</GoopBreadcrumbPage>
            </GoopBreadcrumbItem>
          </GoopBreadcrumbList>
        </GoopBreadcrumb>
      )
    case 'button-group':
      return (
        <GoopButtonGroup>
          <GoopButton variant="outline" size="xs">Copy</GoopButton>
          <GoopButton variant="outline" size="xs">Cut</GoopButton>
          <GoopButton variant="outline" size="xs">Paste</GoopButton>
        </GoopButtonGroup>
      )
    case 'empty':
      return (
        <GoopEmpty className="gap-1 p-0">
          <GoopEmptyHeader className="gap-1">
            <GoopEmptyMedia variant="icon">
              <Icon name="folder" />
            </GoopEmptyMedia>
            <GoopEmptyTitle className="text-[11px]">No projects</GoopEmptyTitle>
          </GoopEmptyHeader>
        </GoopEmpty>
      )
    case 'pagination':
      return (
        <GoopPagination className="w-auto">
          <GoopPaginationContent>
            {[1, 2, 3].map((n) => (
              <GoopPaginationItem key={n}>
                <GoopPaginationLink isActive={n === 2} className="size-7 text-xs">
                  {n}
                </GoopPaginationLink>
              </GoopPaginationItem>
            ))}
          </GoopPaginationContent>
        </GoopPagination>
      )
    default:
      return null
  }
}

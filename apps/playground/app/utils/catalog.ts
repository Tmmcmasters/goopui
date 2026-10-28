export interface CatalogEntry {
  /** Route path, e.g. `/button`. */
  path: string
  /** Goop component name it will host. */
  goop: string
  /** The shadcn-vue original it mirrors, or null when there is none. */
  shadcn: string | null
  blurb: string
}

/** v0.1 components in build order (see HANDOFF.md). */
export const catalog: CatalogEntry[] = [
  { path: '/button', goop: 'GoopButton', shadcn: 'Button', blurb: 'Hover drips, press squish.' },
  { path: '/spinner', goop: 'GoopSpinner', shadcn: 'Spinner', blurb: 'Looping goo spinner.' },
  { path: '/switch', goop: 'GoopSwitch', shadcn: 'Switch', blurb: 'Thumb that stretches across the track.' },
  { path: '/popover', goop: 'GoopPopover', shadcn: 'Popover', blurb: 'Goo bridge from trigger to content.' },
  { path: '/dropdown', goop: 'GoopDropdown', shadcn: 'DropdownMenu', blurb: 'Goo bridge on open, crisp items.' },
  { path: '/tabs', goop: 'GoopTabs', shadcn: 'Tabs', blurb: 'Active-tab goo blob that slides with momentum.' },
  { path: '/tooltip', goop: 'GoopTooltip', shadcn: 'Tooltip', blurb: 'Tooltip oozes out of its trigger.' },
  { path: '/blob', goop: 'GoopBlob', shadcn: null, blurb: 'Background blobs. Perf stress test.' },
]

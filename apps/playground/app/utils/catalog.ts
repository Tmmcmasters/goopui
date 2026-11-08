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
  { path: '/checkbox', goop: 'GoopCheckbox', shadcn: 'Checkbox', blurb: 'A goo drop falls into the box and splats.' },
  { path: '/radio-group', goop: 'GoopRadioGroup', shadcn: 'RadioGroup', blurb: 'The dot is a goo blob that jumps between items.' },
  { path: '/popover', goop: 'GoopPopover', shadcn: 'Popover', blurb: 'Goo bridge from trigger to content.' },
  { path: '/dropdown', goop: 'GoopDropdown', shadcn: 'DropdownMenu', blurb: 'Goo bridge on open, crisp items.' },
  { path: '/select', goop: 'GoopSelect', shadcn: 'Select', blurb: 'List blooms out of the selected value; goo highlight, check plops in.' },
  { path: '/tabs', goop: 'GoopTabs', shadcn: 'Tabs', blurb: 'Active-tab goo blob that slides with momentum.' },
  { path: '/pagination', goop: 'GoopPagination', shadcn: 'Pagination', blurb: 'The current page is one goo blob that slides between page numbers; Prev/Next squish.' },
  { path: '/tooltip', goop: 'GoopTooltip', shadcn: 'Tooltip', blurb: 'Tooltip oozes out of its trigger.' },
  { path: '/slider', goop: 'GoopSlider', shadcn: 'Slider', blurb: 'Jelly goo thumb over a sloshing liquid fill.' },
  { path: '/progress', goop: 'GoopProgress', shadcn: 'Progress', blurb: 'Fills like liquid: wobbling goo front, slosh, drips.' },
  { path: '/dialog', goop: 'GoopDialog', shadcn: 'Dialog', blurb: 'Blooms from its own center with an all-around splash; the overlay pours down. AlertDialog: lighter splash.' },
  { path: '/sheet', goop: 'GoopSheet', shadcn: 'Sheet', blurb: 'Blooms from the middle of its screen edge, overshoots and splashes; shrinks back into the edge on close.' },
  { path: '/toast', goop: 'GoopToaster', shadcn: 'Sonner', blurb: 'Toasts drop in, merge in the stack, drip away.' },
  { path: '/drawer', goop: 'GoopDrawer', shadcn: 'Drawer', blurb: 'Drag, snap and fling a drawer whose goo edge lags, sloshes and splashes.' },
  { path: '/accordion', goop: 'GoopAccordion', shadcn: 'Accordion', blurb: 'Content pours out of the trigger like thick liquid and gets sucked back up. Collapsible too.' },
  { path: '/input', goop: 'GoopInput', shadcn: 'Input', blurb: 'Goo focus ring that flows in from the click, ripples as you type.' },
  { path: '/toggle', goop: 'GoopToggle', shadcn: 'Toggle', blurb: 'Pressing floods it with goo; groups flow and merge.' },
  { path: '/blob', goop: 'GoopBlob', shadcn: null, blurb: 'Background blobs. Perf stress test.' },
  { path: '/command', goop: 'GoopCommand', shadcn: 'Command', blurb: 'Goo highlight glides between items with keys and pointer; the search gets the goo ring; the dialog and Combobox list bloom open.' },
  { path: '/number-field', goop: 'GoopNumberField', shadcn: 'NumberField', blurb: 'Goo focus ring; +/- squish a dollop and nudge toward the pressed side.' },
  { path: '/input-otp', goop: 'GoopInputOTP', shadcn: 'PinInput', blurb: 'Focus goo flows from cell to cell as you type, with a pulse as each digit lands.' },
  { path: '/hover-card', goop: 'GoopHoverCard', shadcn: 'HoverCard', blurb: 'Card blooms out of the edge facing its link, splashes, shrinks back into it.' },
  { path: '/context-menu', goop: 'GoopContextMenu', shadcn: 'ContextMenu', blurb: 'Menu blooms out of the right-click point; goo highlight glides; submenus bloom from their item.' },
  { path: '/menubar', goop: 'GoopMenubar', shadcn: 'Menubar', blurb: 'One goo body flows between the triggers as you hover or arrow across; menus bloom open with the goo item highlight.' },
  { path: '/static-set', goop: 'GoopSkeleton, Badge, Card, Avatar', shadcn: 'Skeleton, Badge, Card, Avatar', blurb: 'Calm and cheap: skeleton goo shimmer, badge hover swell, card edge swell (opt-in), avatar settle. Separator and Label are plain ports.' },
  { path: '/navigation-menu', goop: 'GoopNavigationMenu', shadcn: 'NavigationMenu', blurb: 'One goo highlight flows between the items; the panel blooms from its trigger and jelly-slides to the next one.' },
  { path: '/skeleton-reveal', goop: 'GoopSkeletonReveal', shadcn: 'Skeleton', blurb: 'Loading goo: the skeleton blocks pool, a sheen flows through and bridges them; when the content lands each block melts into its element and drains away.' },
  { path: '/alert', goop: 'GoopAlert', shadcn: 'Alert', blurb: 'A soft goo entrance: the body blooms out of its top edge and settles; the icon wobbles once.' },
  { path: '/kbd', goop: 'GoopKbd', shadcn: 'Kbd', blurb: 'Press the matching key (or click it) and the key squishes into its base, then springs back.' },
  { path: '/breadcrumb', goop: 'GoopBreadcrumb', shadcn: 'Breadcrumb', blurb: 'The hover highlight is one goo blob that flows between the links.' },
  { path: '/sidebar', goop: 'GoopSidebar', shadcn: 'Sidebar', blurb: 'Dashboard sidebar: goo highlight glides between items, the edge sloshes as it collapses.' },
]

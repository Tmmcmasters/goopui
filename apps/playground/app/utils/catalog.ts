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
]

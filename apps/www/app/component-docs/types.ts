// Types for component docs metadata. One file per component in ./entries describes its
// live demo's Customize panel, Code tab and props tables. See ./README.md.
import type { PropRow } from '~/components/docs/PropsTable.vue'

export type { PropRow }

/** Sidebar and index groups, in display order. */
export const CATEGORIES = ['Actions', 'Forms', 'Overlays', 'Navigation', 'Feedback', 'Layout', 'Other'] as const
export type Category = (typeof CATEGORIES)[number]

/** Current control values, keyed by control id (`prop`, or `part.prop`). Absent = default. */
export type ControlValues = Record<string, unknown>

interface ControlBase {
  /** The component prop this control sets (camelCase). For `color`, a label-only key. */
  prop: string
  /** Which component part the prop belongs to (see `ComponentDoc.code`). Default 'main'. */
  part?: string
  /** Short label. Default: the prop name in words (`openSlosh` -> 'Open slosh'). */
  label?: string
  /** One sentence. Default: the matching props-table row's note. */
  description?: string
  /** Hidden behind "More" until opened, to keep the panel short. */
  advanced?: boolean
}

export interface SliderControl extends ControlBase {
  kind: 'slider'
  min: number
  max: number
  step: number
  /** The value the component uses when the prop is absent. May depend on other controls
   *  (e.g. the preset). Values equal to it are left out of the code. */
  default: number | ((values: ControlValues) => number)
  /** Suffix shown after the value: 'px', 's', '×'. */
  unit?: string
  /** Type for the props table when there's no row for it. Default 'number'. */
  type?: string
}

export interface SwitchControl extends ControlBase {
  kind: 'switch'
  default: boolean
  type?: string
}

export interface SegmentControl extends ControlBase {
  kind: 'segment'
  options: readonly string[]
  default: string
  type?: string
}

export interface ColorControl extends ControlBase {
  kind: 'color'
  /** CSS custom property it sets in the component's `style` (e.g. '--primary'). */
  cssVar: string
  /** Swatches after the theme default. */
  swatches?: readonly { label: string; value: string }[]
}

export type Control = SliderControl | SwitchControl | SegmentControl | ColorControl

export interface ComponentDoc {
  /** URL slug: /docs/components/<slug>. Also the `name` used in the markdown. */
  slug: string
  title: string
  category: Category
  /** Main export (e.g. 'GoopSwitch'). Must be in @goopui/vue's manifest. */
  component: string
  /**
   * Usage for the Code tab. `{{main}}` (or `{{root}}`, any part name) expands to the props
   * the reader changed for that part, kebab-cased, inline or one per line when long.
   */
  code: string
  controls: Control[]
  /** false: the props tables don't add the controls missing from `tables` (another table
   *  on the page covers them, like GoopButton's engine table). */
  controlsInTable?: boolean
  /** Props tables for `::component-props{name part}`, keyed by part. The first is the default. */
  tables?: Record<string, { caption: string; rows: PropRow[] }>
  /**
   * A replay button on the stage for one-shot effects. `remount` re-creates the demo;
   * `click` re-creates it and clicks its trigger (the first `[data-replay]`, else the first
   * button), which re-opens an overlay. `toggle` clicks that trigger in the live demo without
   * re-creating it (e.g. collapse / expand a sidebar).
   */
  replay?: { action: 'remount' | 'click' | 'toggle'; label?: string }
  /** Re-create the demo after each change (for props a component reads only on mount). */
  remount?: boolean
  /** The Drip / Slow-mo / Let it fly bar under the stage (GoopButton demos). */
  stageControls?: boolean
}

export const defineComponentDoc = (doc: ComponentDoc): ComponentDoc => doc

/** Id a control's value is stored under. */
export const controlId = (c: Control): string => (c.part && c.part !== 'main' ? `${c.part}.${c.prop}` : c.prop)

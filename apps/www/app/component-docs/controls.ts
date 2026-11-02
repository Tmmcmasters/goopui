// Control builders for component docs entries. Engine knobs take their label, range, step,
// unit and per-preset default from core's GOOP_VAR_META, so nothing is restated here.
import { GOOP_VAR_META, type GoopPreset } from '@goopui/core'
import { presetDefault, unitSuffix } from '~/utils/goopDocs'
import type { ColorControl, Control, ControlValues, SegmentControl, SliderControl, SwitchControl } from './types'

type Extra<T> = Partial<Omit<T, 'kind'>>

const presetOf = (v: ControlValues): GoopPreset => (v.preset as GoopPreset | undefined) ?? 'playful'

/** `preset`: subtle | playful | wild. */
export const preset = (o: Extra<SegmentControl> = {}): SegmentControl => ({
  kind: 'segment',
  prop: 'preset',
  options: ['subtle', 'playful', 'wild'],
  default: 'playful',
  type: `'subtle' | 'playful' | 'wild'`,
  description: 'The overall feel: every effect at once.',
  ...o,
})

/** `speed`: animation speed multiplier. */
export const speed = (o: Extra<SliderControl> = {}): SliderControl => ({
  kind: 'slider',
  prop: 'speed',
  min: 0.25,
  max: 2,
  step: 0.05,
  default: 1,
  unit: '×',
  description: 'Animation speed multiplier.',
  ...o,
})

/** An effect that is on by default: a switch that writes `:prop="false"` when turned off. */
export const effect = (prop: string, o: Extra<SwitchControl> = {}): SwitchControl => ({
  kind: 'switch',
  prop,
  default: true,
  type: 'boolean | number',
  ...o,
})

/** An opt-in boolean (off by default): writes `prop` when turned on. */
export const flag = (prop: string, o: Extra<SwitchControl> = {}): SwitchControl => ({
  kind: 'switch',
  prop,
  default: false,
  type: 'boolean',
  ...o,
})

/** An effect strength, 0 to 2 (1 is the preset's strength). */
export const strength = (prop: string, o: Extra<SliderControl> = {}): SliderControl => ({
  kind: 'slider',
  prop,
  min: 0,
  max: 2,
  step: 0.05,
  default: 1,
  unit: '×',
  type: 'boolean | number',
  ...o,
})

/** A plain numeric prop. */
export const num = (prop: string, min: number, max: number, step: number, def: number, o: Extra<SliderControl> = {}): SliderControl => ({
  kind: 'slider',
  prop,
  min,
  max,
  step,
  default: def,
  ...o,
})

/** A string-union prop. */
export const choice = (prop: string, options: readonly string[], def: string, o: Extra<SegmentControl> = {}): SegmentControl => ({
  kind: 'segment',
  prop,
  options,
  default: def,
  type: options.map((x) => `'${x}'`).join(' | '),
  ...o,
})

/** Calm swatches that read on both themes. */
export const SWATCHES = [
  { label: 'Slime', value: '#1fa64a' },
  { label: 'Coral', value: '#e5624f' },
  { label: 'Violet', value: '#7c5cff' },
  { label: 'Sky', value: '#2d8fd5' },
  { label: 'Amber', value: '#d9961a' },
] as const

/** A shadcn colour token on the component (default `--primary`), written as `style`. */
export const color = (o: Extra<ColorControl> = {}): ColorControl => ({
  kind: 'color',
  prop: 'color',
  cssVar: '--primary',
  label: 'Colour',
  description: 'Sets the shadcn colour token the goo reads.',
  swatches: SWATCHES,
  ...o,
})

/**
 * A GoopButton-style engine knob from GOOP_VAR_META: a slider for numbers, a switch for
 * on/off knobs, a segmented control for keywords. Its default follows the chosen preset.
 */
export function engine(option: string, o: Partial<Control> = {}): Control {
  const m = GOOP_VAR_META[option]
  if (!m) throw new Error(`[www] unknown engine option: ${option}`)
  const base = { prop: option, label: m.label, description: m.description }
  if (m.values) {
    return { kind: 'segment', ...base, options: m.values, default: String(m.default), type: m.values.map((x) => `'${x}'`).join(' | '), ...o } as SegmentControl
  }
  if (m.unit === 'on/off') {
    return { kind: 'switch', ...base, default: Number(m.default) > 0, type: 'boolean', ...o } as SwitchControl
  }
  return {
    kind: 'slider',
    ...base,
    min: m.min ?? 0,
    max: m.max ?? 1,
    step: m.step ?? 0.01,
    default: (v: ControlValues) => Number(presetDefault(m, presetOf(v))),
    unit: unitSuffix(m),
    ...o,
  } as SliderControl
}

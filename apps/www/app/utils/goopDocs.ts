// Docs metadata for the engine's knobs. The *list* of knobs always comes from
// @goopui/core (GOOP_DEFAULTS / GOOP_CSS_VARS / GOOP_LIMITS, GOOP_FINISH_*), so a knob
// added to core shows up in the vars table and the tuner automatically, under "More",
// with a placeholder description. This file only adds words, grouping, and slider ranges.
import {
  GOOP_CSS_VARS,
  GOOP_DEFAULTS,
  GOOP_FINISH_DEFAULTS,
  GOOP_FINISH_VARS,
  GOOP_LIMITS,
  type GoopFinish,
  type GoopTuning,
} from '@goopui/core'

export type TuningKey = keyof GoopTuning
export type FinishKey = Exclude<keyof GoopFinish, 'finish'>

/** Plain-language description per knob. Missing ones render a placeholder. */
export const TUNING_DOCS: Partial<Record<TuningKey, string>> = {
  blur: 'Blur radius of the goo filter, in px. Higher gives blobbier shapes, wider necks, and rounder corners. Keep it below the drip size or small drips disappear.',
  contrast: 'Alpha multiplier after the blur. Higher gives a crisper goo edge.',
  threshold: 'Blurred alpha level (0 to 1) that becomes the edge. Lower makes shapes bulge out and merge from further away. Higher gives tighter, thinner necks.',
  dripCount: 'Max drips per hover. Faster entries spawn more, in a tighter cluster ahead of the pointer.',
  dripLength: 'How far the bulb hangs below the edge before it detaches, in px.',
  dripSize: 'Bulb radius at full swell, in px (randomized a little).',
  viscosity: 'Global thickness. Above 1 is slower and less bouncy, like honey. Below 1 is quicker and springier.',
  fall: 'Average distance a detached drop falls before it fades out, in px.',
  gravity: 'Acceleration of detached drops, in px/s².',
  squish: 'How much the body compresses on press (0 to 0.4). 0 turns it off.',
  restingDrips: 'Static drips that always hang off the bottom edge. They stay in reduced-motion mode. In JS you can also pass positions, like [0.2, 0.7].',
  maxDrips: 'Cap on live drips for this element. Raise it for wide edges.',
  dripInterval: 'Average seconds between new drips while the pointer rests on the element. Movement and recent clicks shorten it.',
  reactivity: 'Scales every pointer reaction: entry impact, lean, wobble, drip sway, exit pull. 0 ignores pointer motion, 2 is very jelly.',
  clickMass: 'Goo added per click. Swells the body, speeds up dripping, and throws a drip. 0 turns it off.',
  massDecay: 'Seconds for click-added goo to drain back to rest.',
  inertia: 'How much the goo carries pointer momentum: drips swing and the mass shifts to the leading side. 0 turns it off.',
  flow: 'How far hanging drips creep along the edge toward the cursor. 0 turns it off.',
  scrollSlosh: 'Page scroll sloshes the goo: scroll fast and drips lag, then swing. Negative flips the direction. 0 turns it off.',
  tiltStrength: 'Device tilt shifts gravity sideways on phones. Only used with the tilt option, which needs a permission prompt on iOS.',
  splashThreshold: 'Entry speed that punches goo out the far side, in units of 1200 px/s (so 1 means 1200 px/s).',
  splashAmount: 'Particle multiplier for punch-through splashes. 0 turns them off.',
  oiliness: '0 is watery: a fast, loose spray of separate droplets. 1 is oily: slow clumps that stretch into strings before snapping.',
  shockwave: 'Strength of the click shockwave (a particle ring and an edge ripple). 0 turns it off.',
}

export const FINISH_DOCS: Record<FinishKey, string> = {
  oilIntensity: 'How strongly the oil film colors and the specular show (0 to 1).',
  oilScale: 'Size of the color bands. 2 makes them twice as large.',
  oilShift: 'Film thickness offset, in cycles. 0 to 1 rotates the band colors.',
  oilReact: 'How much the film follows the pointer (0 to 2). At 0 it drifts on its own and rides the goo; the goo itself still reacts.',
}

export interface KnobGroup {
  id: string
  label: string
  keys: TuningKey[]
}

/** Display groups. Keys core adds later land in "More" until they're filed here. */
const GROUPS: KnobGroup[] = [
  { id: 'shape', label: 'Shape', keys: ['blur', 'contrast', 'threshold'] },
  {
    id: 'drips',
    label: 'Drips',
    keys: ['dripSize', 'dripLength', 'dripCount', 'dripInterval', 'restingDrips', 'maxDrips', 'viscosity', 'fall', 'gravity'],
  },
  {
    id: 'touch',
    label: 'Touch',
    keys: ['reactivity', 'squish', 'clickMass', 'massDecay', 'inertia', 'flow', 'scrollSlosh', 'tiltStrength'],
  },
  { id: 'splash', label: 'Splash', keys: ['splashThreshold', 'splashAmount', 'oiliness', 'shockwave'] },
]

export function knobGroups(): KnobGroup[] {
  const all = Object.keys(GOOP_DEFAULTS) as TuningKey[]
  const filed = new Set(GROUPS.flatMap((g) => g.keys))
  const groups = GROUPS.map((g) => ({ ...g, keys: g.keys.filter((k) => k in GOOP_DEFAULTS) }))
  const rest = all.filter((k) => !filed.has(k))
  if (rest.length) groups.push({ id: 'more', label: 'More', keys: rest })
  return groups
}

export interface TuningRow {
  key: TuningKey
  name: string
  def: number
  range: readonly [number, number]
  desc: string
}

export function tuningRow(key: TuningKey): TuningRow {
  return {
    key,
    name: GOOP_CSS_VARS[key],
    def: GOOP_DEFAULTS[key],
    range: GOOP_LIMITS[key],
    desc: TUNING_DOCS[key] ?? 'Documentation coming soon. See packages/core/src/constants.ts.',
  }
}

export const FINISH_ROWS = (Object.keys(FINISH_DOCS) as FinishKey[]).map((key) => ({
  key,
  name: GOOP_FINISH_VARS[key],
  def: GOOP_FINISH_DEFAULTS[key],
  desc: FINISH_DOCS[key],
}))

/** Comfortable slider ranges for the tuner (the engine's clamps are much wider). */
export const SLIDER: Partial<Record<TuningKey | FinishKey, { min: number; max: number; step: number; unit?: string }>> = {
  blur: { min: 0, max: 12, step: 0.5, unit: 'px' },
  contrast: { min: 2, max: 60, step: 1 },
  threshold: { min: 0.1, max: 0.9, step: 0.01 },
  dripSize: { min: 2, max: 16, step: 0.5, unit: 'px' },
  dripLength: { min: 0, max: 40, step: 1, unit: 'px' },
  dripCount: { min: 0, max: 6, step: 1 },
  dripInterval: { min: 0.2, max: 3, step: 0.05, unit: 's' },
  restingDrips: { min: 0, max: 4, step: 1 },
  maxDrips: { min: 1, max: 24, step: 1 },
  viscosity: { min: 0.3, max: 3, step: 0.05 },
  fall: { min: 0, max: 120, step: 1, unit: 'px' },
  gravity: { min: 100, max: 3000, step: 50 },
  reactivity: { min: 0, max: 2, step: 0.05 },
  squish: { min: 0, max: 0.3, step: 0.01 },
  clickMass: { min: 0, max: 1.5, step: 0.05 },
  massDecay: { min: 0.2, max: 4, step: 0.1, unit: 's' },
  inertia: { min: 0, max: 3, step: 0.05 },
  flow: { min: 0, max: 2, step: 0.05 },
  scrollSlosh: { min: -2, max: 2, step: 0.1 },
  tiltStrength: { min: 0, max: 3, step: 0.1 },
  splashThreshold: { min: 0.2, max: 3, step: 0.05 },
  splashAmount: { min: 0, max: 3, step: 0.05 },
  oiliness: { min: 0, max: 1, step: 0.05 },
  shockwave: { min: 0, max: 3, step: 0.05 },
  oilIntensity: { min: 0, max: 1, step: 0.05 },
  oilScale: { min: 0.3, max: 3, step: 0.05 },
  oilShift: { min: 0, max: 1, step: 0.02 },
  oilReact: { min: 0, max: 2, step: 0.05 },
}

export function sliderFor(key: TuningKey | FinishKey) {
  const s = SLIDER[key]
  if (s) return s
  const [min, max] = key in GOOP_LIMITS ? GOOP_LIMITS[key as TuningKey] : [0, 1]
  return { min, max, step: (max - min) / 100 }
}

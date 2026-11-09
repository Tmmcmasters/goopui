// The ONE place where @goopui/core's options become Vue props.
//
// Every engine option is a typed prop, derived from core's own types and constants:
//   - every numeric tuning knob (keys of GOOP_DEFAULTS / GoopTuning), e.g. `:drip-size="9"`;
//   - the non-tuning engine options in ENGINE_OPTION_KEYS (preset, renderer, finish, ...);
//   - finish vars that core only reads from CSS (oil*), written to the host as `--goop-*`;
//   - `goop`: an escape hatch taking any GoopOptions object (lowest precedence of the props).
//
// Feature toggles: every key in FEATURE_KEYS also takes a boolean. `false` turns the feature
// off completely, `true` turns it on at the active preset's strength, a number tunes it.
// `undefined` (the prop is absent) leaves it to `--goop-*` CSS vars, then the preset, then
// core's default. So `<GoopButton :shockwave="false" taffy />` reads like a feature list.
//
// When core adds an option, the `Unhandled` check below fails typecheck until the option is
// listed here (as an engine option, a feature, or adapter-owned). New tuning knobs need no
// change at all: they come from GOOP_DEFAULTS and show up as props automatically.
import {
  ACCORDION_EFFECTS,
  type AccordionEffect,
  type AccordionOptions,
  GOOP_DEFAULTS,
  GOOP_PRESETS,
  GOOP_VAR_META,
  MENU_EFFECTS,
  SELECT_EFFECTS,
  PROGRESS_EFFECTS,
  SLIDER_EFFECTS,
  SWITCH_EFFECTS,
  TABS_EFFECTS,
  TABS_FEEL,
  MENUBAR_EFFECTS,
  MENUBAR_FEEL,
  type MenubarEffect,
  type MenubarHighlightOptions,
  PAGINATION_EFFECTS,
  PAGINATION_FEEL,
  type PaginationEffect,
  type PaginationIndicatorOptions,
  TOOLTIP_BLOOM_SPLASH,
  TOOLTIP_FEEL,
  TOOLTIP_MOMENTUM,
  ALERT_DIALOG_MOMENTUM,
  ALERT_DIALOG_SPLASH,
  DIALOG_FEEL,
  type BackdropOptions,
  type TabsEffect,
  type TabsIndicatorOptions,
  CHECKBOX_EFFECTS,
  RADIO_EFFECTS,
  INPUT_EFFECTS,
  type InputEffect,
  type InputOptions,
  TOGGLE_EFFECTS,
  TOGGLE_GROUP_EFFECTS,
  type ToggleEffect,
  type ToggleGroupEffect,
  type ToggleGroupOptions,
  type ToggleOptions,
  type CheckboxEffect,
  type CheckboxOptions,
  type RadioEffect,
  type RadioGroupOptions,
  TOASTER_EFFECTS,
  type SheetOptions,
  DRAWER_EFFECTS,
  type DrawerEffect,
  type DrawerOptions,
  type ToasterEffect,
  type ToasterOptions,
  type PageTransitionDirection,
  type PageTransitionOptions,
  type EmergeOptions,
  type EmergeBloomStart,
  type EmergeFlowStyle,
  type EmergeSurfaceColor,
  type MenuEffect,
  type MenuHighlightOptions,
  type SelectBloomFrom,
  type SelectEffect,
  type SelectPlopOptions,
  type ProgressEffect,
  type ProgressOptions,
  type SliderEffect,
  type SliderOptions,
  type GoopOptions,
  type GoopRendererOption,
  type SwitchEffect,
  type SwitchOptions,
  type GoopPreset,
  type GoopTuning,
  type GoopVarMeta,
  NUMBER_FIELD_EFFECTS,
  type NumberFieldEffect,
  type NumberFieldOptions,
  OTP_EFFECTS,
  type OtpEffect,
  type InputOTPOptions,
} from '@goopui/core'
import type { PropType } from 'vue'
import type { ContextMenuBloomFrom, HoverCardBloomFrom } from '@goopui/core'

// ---- keys --------------------------------------------------------------------------------

/** Tuning knobs, straight from core (each is a `--goop-*` var). */
export const GOOP_TUNING_KEYS = Object.keys(GOOP_DEFAULTS) as (keyof GoopTuning)[]

/** Engine options that are not numeric tuning knobs. */
export const ENGINE_OPTION_KEYS = [
  'preset',
  'renderer',
  'finish',
  'splash',
  'hitEffect',
  'drips',
  'interactive',
  'tilt',
  'reducedMotion',
  'seed',
  'timeScale',
  'escapeRenderer',
] as const satisfies readonly (keyof GoopOptions)[]

/** Features that can be switched on/off with a boolean. Tuning knobs where 0 = off, plus
 *  the boolean engine options. `drips`, `splash`, `tilt` are booleans in ENGINE_OPTION_KEYS. */
export const FEATURE_KEYS = [
  // core toggles (boolean | number in GoopOptions)
  'gloss',
  'taffy',
  'reach',
  'puddles',
  'labelRide',
  'keyboard',
  'idle',
  // numeric knobs where 0 disables the feature
  'shockwave',
  'splashAmount',
  'strands',
  'inertia',
  'squish',
  'clickGoop',
  'flowToCursor',
  'scrollSlosh',
  'pointerReaction',
] as const satisfies readonly (keyof GoopTuning)[]

/** Finish vars core reads only from CSS (not options). Props write them to the host style. */
export const CSS_VAR_KEYS = ['oilIntensity', 'oilBandSize', 'oilHueShift', 'oilFollowPointer'] as const

/** Options the component sets itself (from its own props / state), never exposed. */
/** `seams`: set by GoopButton inside a GoopButtonGroup (the group's `seams` prop drives it). */
type AdapterOwned = 'disabled' | 'cssVars' | 'random' | 'seams'
/** Old option names (GOOP_OPTION_RENAMES). Still accepted inside `goop`, with core's warning. */
type DeprecatedOption =
  | 'blur'
  | 'contrast'
  | 'threshold'
  | 'viscosity'
  | 'fall'
  | 'reactivity'
  | 'clickMass'
  | 'massDecay'
  | 'splashThreshold'
  | 'flow'
  | 'stringiness'

export type GoopEngineKey = keyof GoopTuning | (typeof ENGINE_OPTION_KEYS)[number]
export type GoopFeatureKey = (typeof FEATURE_KEYS)[number]
export type GoopCssVarKey = (typeof CSS_VAR_KEYS)[number]

/** Compile-time guard: fails when core grows an option this file doesn't handle yet. */
type Unhandled = Exclude<keyof GoopOptions, GoopEngineKey | AdapterOwned | DeprecatedOption>
const _allOptionsHandled: [Unhandled] extends [never] ? true : { unhandled: Unhandled } = true
void _allOptionsHandled

// ---- prop types --------------------------------------------------------------------------

type OptionValue<K extends GoopEngineKey> = K extends keyof GoopOptions ? GoopOptions[K] : never

/** Value type of each engine prop. Features also take a boolean; `splash` takes a boolean. */
export type GoopPropValue<K extends GoopEngineKey> = K extends GoopFeatureKey
  ? Exclude<OptionValue<K>, undefined> | boolean
  : K extends 'splash'
    ? Exclude<GoopOptions['splash'], undefined> | boolean
    : Exclude<OptionValue<K>, undefined>

type PropDef<T> = { type: PropType<T>; default: undefined }

export type GoopPropsDefinition = { [K in GoopEngineKey]: PropDef<GoopPropValue<K>> } & {
  [K in GoopCssVarKey]: PropDef<number>
} & {
  /** Escape hatch: any engine option. Explicit props win over it. */
  goop: PropDef<GoopOptions>
}

/** The resolved props object a component receives (all optional). */
export type GoopPropsInput = { [K in keyof GoopPropsDefinition]?: GoopPropsDefinition[K] extends PropDef<infer T> ? T : never }

// `default: undefined` matters: without it Vue casts an absent Boolean prop to `false`, which
// would switch features OFF instead of leaving them to CSS vars / the preset.
const def = (type: unknown): PropDef<never> => ({ type: type as PropType<never>, default: undefined })

const FEATURES = new Set<string>(FEATURE_KEYS)
/** Toggles core itself accepts as booleans (the first block of FEATURE_KEYS). */
const CORE_TOGGLES = new Set<string>(['gloss', 'taffy', 'reach', 'puddles', 'labelRide', 'keyboard', 'idle'])
const isCoreToggle = (key: string): boolean => CORE_TOGGLES.has(key)

const runtimeType = (key: GoopEngineKey): unknown => {
  if (FEATURES.has(key)) return [Boolean, Number]
  switch (key) {
    case 'restingDrips':
      return [Number, Array]
    case 'preset':
    case 'finish':
      return String
    case 'splash':
    case 'reducedMotion':
      return [Boolean, String]
    case 'renderer':
    case 'escapeRenderer':
      return [String, Function]
    case 'drips':
    case 'interactive':
    case 'tilt':
      return Boolean
    default:
      return Number
  }
}

/** Spread into a component's `defineProps({ ...goopProps, ... })`. */
export const goopProps = Object.freeze({
  ...Object.fromEntries([...GOOP_TUNING_KEYS, ...ENGINE_OPTION_KEYS].map((k) => [k, def(runtimeType(k))])),
  ...Object.fromEntries(CSS_VAR_KEYS.map((k) => [k, def(Number)])),
  goop: def(Object),
}) as unknown as GoopPropsDefinition

// ---- sound ---------------------------------------------------------------------------------

/**
 * `sound`: opt-in interaction sounds (Cuelume, an optional peer of @goopui/core). Not an
 * engine option: core's GoopOptions has no `sound` (the cue map and playback live in core's
 * sound module), so the Unhandled guards above are unaffected. `undefined` (absent) inherits
 * the nearest ancestor component's `sound`, then the app default (GoopPlugin / Nuxt
 * `goop.sound`), then off. Interactive components spread `goopSoundProp` (runtime props) or
 * add `GoopSoundProps` (type-based props, with `sound: undefined` in withDefaults).
 */
export const goopSoundProp = Object.freeze({
  sound: { type: Boolean as PropType<boolean | undefined>, default: undefined },
})

export interface GoopSoundProps {
  /** Interaction sounds for this component and its parts. Default: inherit (off). */
  sound?: boolean
}

// ---- props -> options ----------------------------------------------------------------------

const ENGINE_KEYS: readonly GoopEngineKey[] = [...GOOP_TUNING_KEYS, ...ENGINE_OPTION_KEYS]

/** Strength a `true` feature toggle turns on at: the preset's value, else core's default. */
function onStrength(key: GoopFeatureKey, preset: GoopPreset | undefined): number | true {
  // Core's own toggles already understand `true` (preset strength, bumped from 0).
  if (isCoreToggle(key)) return true
  const fromPreset = preset ? GOOP_PRESETS[preset]?.tuning[key] : undefined
  return fromPreset || GOOP_DEFAULTS[key] || 1
}

/**
 * Build engine options from props. Precedence (low -> high):
 * `base` (global defaults + component defaults) < `goop` escape hatch < explicit props.
 * Undefined props are skipped, so CSS vars and presets still apply to them.
 */
export function toGoopOptions(props: GoopPropsInput, base: GoopOptions = {}): GoopOptions {
  const out: Record<string, unknown> = { ...base, ...(props.goop ?? {}) }
  const preset = (props.preset ?? out.preset) as GoopPreset | undefined
  for (const key of ENGINE_KEYS) {
    const v = (props as Record<string, unknown>)[key]
    if (v === undefined) continue
    if (key === 'splash' && typeof v === 'boolean') {
      const mode = out.splash
      out.splash = v ? (mode && mode !== 'off' ? mode : 'near') : 'off'
    } else if (FEATURES.has(key) && typeof v === 'boolean') {
      out[key] = v ? onStrength(key as GoopFeatureKey, preset) : isCoreToggle(key) ? false : 0
    } else {
      out[key] = v
    }
  }
  return out as GoopOptions
}

/** Inline `--goop-*` style for the CSS-only vars (oil finish). */
export function toGoopStyle(props: GoopPropsInput): Record<string, string> {
  const style: Record<string, string> = {}
  for (const key of CSS_VAR_KEYS) {
    const v = props[key]
    const meta = GOOP_VAR_META[key]
    if (typeof v === 'number' && Number.isFinite(v) && meta) style[meta.name] = String(v)
  }
  return style
}

/**
 * The options to send to `handle.update()` so that a prop going back to `undefined` really
 * resets: core merges updates, so keys that disappeared are sent as `undefined`.
 */
export function diffOptions(prev: GoopOptions, next: GoopOptions): GoopOptions | null {
  const out: Record<string, unknown> = { ...next }
  let changed = false
  for (const k of Object.keys(prev)) {
    if (!(k in next)) {
      out[k] = undefined
      changed = true
    }
  }
  for (const k of Object.keys(next)) {
    if (!sameValue((prev as Record<string, unknown>)[k], (next as Record<string, unknown>)[k])) changed = true
  }
  return changed ? (out as GoopOptions) : null
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => sameValue(x, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return ka.length === kb.length && ka.every((k) => sameValue((a as never)[k], (b as never)[k]))
  }
  return false
}

// ---- metadata ------------------------------------------------------------------------------

/** Core's metadata for one prop (label, description, unit, range, group, cost, reduced
 *  motion), for docs pages and tuner UIs. Undefined for adapter-only props. */
export function goopPropMeta(key: string): GoopVarMeta | undefined {
  return GOOP_VAR_META[key]
}

/** Is `key` a feature toggle (accepts a boolean)? */
export const isGoopFeature = (key: string): key is GoopFeatureKey => FEATURES.has(key)

// ---- GoopSwitch ----------------------------------------------------------------------------
// The switch has its own small engine (core `attachSwitch`), so its props come from core's
// SWITCH_EFFECTS plus speed / preset / renderer. Same rules: `false` turns an effect off,
// `true` (or absent) is the preset's strength, a number scales it.

/** Switch options GoopSwitch sets itself (from v-model and app config). */
type SwitchAdapterOwned = 'checked' | 'reducedMotion'
export type GoopSwitchEngineKey = SwitchEffect | 'speed' | 'preset' | 'renderer'
type SwitchUnhandled = Exclude<keyof SwitchOptions, GoopSwitchEngineKey | SwitchAdapterOwned>
const _allSwitchOptionsHandled: [SwitchUnhandled] extends [never] ? true : { unhandled: SwitchUnhandled } = true
void _allSwitchOptionsHandled

export type GoopSwitchPropsDefinition = { [K in SwitchEffect]: PropDef<boolean | number> } & {
  speed: PropDef<number>
  preset: PropDef<GoopPreset>
  renderer: PropDef<GoopRendererOption>
}
export type GoopSwitchPropsInput = {
  [K in keyof GoopSwitchPropsDefinition]?: GoopSwitchPropsDefinition[K] extends PropDef<infer T> ? T : never
}

/** Props for a small effect engine (switch, checkbox, radio group, slider, progress): each
 *  effect takes a boolean or a multiplier, plus speed / preset / renderer. */
function effectEngineProps(effects: readonly string[]): Record<string, PropDef<never>> {
  return Object.freeze({
    ...Object.fromEntries(effects.map((k) => [k, def([Boolean, Number])])),
    speed: def(Number),
    preset: def(String),
    renderer: def([String, Function]),
  })
}

type EffectPropsDefinition<E extends string> = { [K in E]: PropDef<boolean | number> } & {
  speed: PropDef<number>
  preset: PropDef<GoopPreset>
  renderer: PropDef<GoopRendererOption>
}
type InputOf<D> = { [K in keyof D]?: D[K] extends PropDef<infer T> ? T : never }

/** Effect-engine options from props, over app config (`preset`, `renderer`, `reducedMotion`). */
function toEffectOptions<E extends string>(
  effects: readonly E[],
  props: InputOf<EffectPropsDefinition<E>>,
  config: GoopOptions,
): { [K in E]?: boolean | number } & { speed?: number; preset?: GoopPreset; renderer?: GoopRendererOption; reducedMotion?: boolean | 'auto' } {
  const out: Record<string, unknown> = {
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  if (props.speed !== undefined) out.speed = props.speed
  for (const k of effects) {
    const v = (props as Record<string, unknown>)[k]
    if (v !== undefined) out[k] = v
  }
  return out as never
}

/** Spread into `defineProps({ ...goopSwitchProps, ... })`. */
export const goopSwitchProps = effectEngineProps(SWITCH_EFFECTS) as unknown as GoopSwitchPropsDefinition

/** Switch options from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toSwitchOptions(props: GoopSwitchPropsInput, config: GoopOptions = {}): SwitchOptions {
  return toEffectOptions(SWITCH_EFFECTS, props, config)
}

// ---- GoopCheckbox --------------------------------------------------------------------------
// Core `attachCheckbox`: CHECKBOX_EFFECTS (fill, splat, droplets) plus speed / preset / renderer.

type CheckboxAdapterOwned = 'checked' | 'reducedMotion'
export type GoopCheckboxEngineKey = CheckboxEffect | 'speed' | 'preset' | 'renderer'
type CheckboxUnhandled = Exclude<keyof CheckboxOptions, GoopCheckboxEngineKey | CheckboxAdapterOwned>
const _allCheckboxOptionsHandled: [CheckboxUnhandled] extends [never] ? true : { unhandled: CheckboxUnhandled } = true
void _allCheckboxOptionsHandled

export type GoopCheckboxPropsDefinition = { [K in CheckboxEffect]: PropDef<boolean | number> } & {
  speed: PropDef<number>
  preset: PropDef<GoopPreset>
  renderer: PropDef<GoopRendererOption>
}
export type GoopCheckboxPropsInput = {
  [K in keyof GoopCheckboxPropsDefinition]?: GoopCheckboxPropsDefinition[K] extends PropDef<infer T> ? T : never
}
export const goopCheckboxProps = effectEngineProps(CHECKBOX_EFFECTS) as unknown as GoopCheckboxPropsDefinition

/** Checkbox options from props, over app config. */
export function toCheckboxOptions(props: GoopCheckboxPropsInput, config: GoopOptions = {}): CheckboxOptions {
  return toEffectOptions(CHECKBOX_EFFECTS, props, config)
}

// ---- GoopInput / GoopTextarea ---------------------------------------------------------------
// Core `attachInput`: INPUT_EFFECTS (flow, close, ripple, wobble, drain, drip, drips) plus speed /
// preset / renderer. `invalid` follows the field's aria-invalid (core watches it).

type InputAdapterOwned = 'invalid' | 'reducedMotion'
export type GoopInputEngineKey = InputEffect | 'speed' | 'preset' | 'renderer'
type InputUnhandled = Exclude<keyof InputOptions, GoopInputEngineKey | InputAdapterOwned>
const _allInputOptionsHandled: [InputUnhandled] extends [never] ? true : { unhandled: InputUnhandled } = true
void _allInputOptionsHandled

export type GoopInputPropsDefinition = EffectPropsDefinition<InputEffect>
export type GoopInputPropsInput = InputOf<GoopInputPropsDefinition>

/** Spread into `defineProps({ ...goopInputProps, ... })`. */
export const goopInputProps = effectEngineProps(INPUT_EFFECTS) as unknown as GoopInputPropsDefinition

/** Input / textarea options from props, over app config. */
export function toInputOptions(props: GoopInputPropsInput, config: GoopOptions = {}): InputOptions {
  return toEffectOptions(INPUT_EFFECTS, props, config)
}

// ---- GoopRadioGroup ------------------------------------------------------------------------
// Core `attachRadioGroup`: RADIO_EFFECTS (bridge, splat, droplets) plus speed / preset / renderer.

type RadioAdapterOwned = 'value' | 'item' | 'reducedMotion'
export type GoopRadioEngineKey = RadioEffect | 'speed' | 'preset' | 'renderer'
type RadioUnhandled = Exclude<keyof RadioGroupOptions, GoopRadioEngineKey | RadioAdapterOwned>
const _allRadioOptionsHandled: [RadioUnhandled] extends [never] ? true : { unhandled: RadioUnhandled } = true
void _allRadioOptionsHandled

export type GoopRadioPropsDefinition = { [K in RadioEffect]: PropDef<boolean | number> } & {
  speed: PropDef<number>
  preset: PropDef<GoopPreset>
  renderer: PropDef<GoopRendererOption>
}
export type GoopRadioPropsInput = {
  [K in keyof GoopRadioPropsDefinition]?: GoopRadioPropsDefinition[K] extends PropDef<infer T> ? T : never
}
export const goopRadioProps = effectEngineProps(RADIO_EFFECTS) as unknown as GoopRadioPropsDefinition

/** Radio group options from props, over app config. */
export function toRadioOptions(props: GoopRadioPropsInput, config: GoopOptions = {}): RadioGroupOptions {
  return toEffectOptions(RADIO_EFFECTS, props, config)
}

// ---- GoopToggle / GoopToggleGroup -----------------------------------------------------------
// Core `attachToggle`: TOGGLE_EFFECTS (flood, wobble, droplets) plus speed / preset / renderer.
// Core `attachToggleGroup` adds flow and merge (TOGGLE_GROUP_EFFECTS).

type ToggleAdapterOwned = 'pressed' | 'reducedMotion'
export type GoopToggleEngineKey = ToggleEffect | 'textFollow' | 'speed' | 'preset' | 'renderer'
type ToggleUnhandled = Exclude<keyof ToggleOptions, GoopToggleEngineKey | ToggleAdapterOwned>
const _allToggleOptionsHandled: [ToggleUnhandled] extends [never] ? true : { unhandled: ToggleUnhandled } = true
void _allToggleOptionsHandled

type ToggleGroupAdapterOwned = 'value' | 'item' | 'reducedMotion'
export type GoopToggleGroupEngineKey = ToggleGroupEffect | 'textFollow' | 'speed' | 'preset' | 'renderer'
type ToggleGroupUnhandled = Exclude<keyof ToggleGroupOptions, GoopToggleGroupEngineKey | ToggleGroupAdapterOwned>
const _allToggleGroupOptionsHandled: [ToggleGroupUnhandled] extends [never] ? true : { unhandled: ToggleGroupUnhandled } = true
void _allToggleGroupOptionsHandled

/** `textFollow`: the label's color follows the goo's edge (default on; `false` = the old
 *  all-at-once color flip). */
type TextFollowPropDefinition = { textFollow: PropDef<boolean> }
export type GoopTogglePropsDefinition = EffectPropsDefinition<ToggleEffect> & TextFollowPropDefinition
export type GoopTogglePropsInput = InputOf<GoopTogglePropsDefinition>
export type GoopToggleGroupPropsDefinition = EffectPropsDefinition<ToggleGroupEffect> & TextFollowPropDefinition
export type GoopToggleGroupPropsInput = InputOf<GoopToggleGroupPropsDefinition>

const textFollowProp = { textFollow: def(Boolean) }

/** Spread into `defineProps({ ...goopToggleProps, ... })`. */
export const goopToggleProps = Object.freeze({ ...effectEngineProps(TOGGLE_EFFECTS), ...textFollowProp }) as unknown as GoopTogglePropsDefinition
/** Spread into `defineProps({ ...goopToggleGroupProps, ... })`. */
export const goopToggleGroupProps = Object.freeze({ ...effectEngineProps(TOGGLE_GROUP_EFFECTS), ...textFollowProp }) as unknown as GoopToggleGroupPropsDefinition

/** Toggle options from props, over app config. */
export function toToggleOptions(props: GoopTogglePropsInput, config: GoopOptions = {}): ToggleOptions {
  const out: ToggleOptions = toEffectOptions(TOGGLE_EFFECTS, props, config)
  if (props.textFollow !== undefined) out.textFollow = props.textFollow
  return out
}

/** Toggle group options from props, over app config. */
export function toToggleGroupOptions(props: GoopToggleGroupPropsInput, config: GoopOptions = {}): ToggleGroupOptions {
  const out: ToggleGroupOptions = toEffectOptions(TOGGLE_GROUP_EFFECTS, props, config)
  if (props.textFollow !== undefined) out.textFollow = props.textFollow
  return out
}

// ---- GoopSlider ----------------------------------------------------------------------------
// Core `attachSlider`: SLIDER_EFFECTS (jelly, slosh, stretch, splat) + speed / preset / renderer.

/** Slider options GoopSlider sets itself (from its own props and app config). */
type SliderAdapterOwned = 'orientation' | 'reducedMotion' | 'thumbSelector' | 'rangeSelector' | 'trackSelector'
export type GoopSliderEngineKey = SliderEffect | 'speed' | 'preset' | 'renderer'
type SliderUnhandled = Exclude<keyof SliderOptions, GoopSliderEngineKey | SliderAdapterOwned>
const _allSliderOptionsHandled: [SliderUnhandled] extends [never] ? true : { unhandled: SliderUnhandled } = true
void _allSliderOptionsHandled

export type GoopSliderPropsDefinition = EffectPropsDefinition<SliderEffect>
export type GoopSliderPropsInput = InputOf<GoopSliderPropsDefinition>

/** Spread into `defineProps({ ...goopSliderProps, ... })`. */
export const goopSliderProps = effectEngineProps(SLIDER_EFFECTS) as unknown as GoopSliderPropsDefinition

/** Slider options from props, over app config. */
export function toSliderOptions(props: GoopSliderPropsInput, config: GoopOptions = {}): SliderOptions {
  return toEffectOptions(SLIDER_EFFECTS, props, config)
}

// ---- GoopProgress --------------------------------------------------------------------------
// Core `attachProgress`: PROGRESS_EFFECTS (slosh, drips, wobble) + speed / preset / renderer /
// seed. The value comes from v-model.

type ProgressAdapterOwned = 'value' | 'max' | 'reducedMotion'
export type GoopProgressEngineKey = ProgressEffect | 'speed' | 'preset' | 'renderer' | 'seed'
type ProgressUnhandled = Exclude<keyof ProgressOptions, GoopProgressEngineKey | ProgressAdapterOwned>
const _allProgressOptionsHandled: [ProgressUnhandled] extends [never] ? true : { unhandled: ProgressUnhandled } = true
void _allProgressOptionsHandled

export type GoopProgressPropsDefinition = EffectPropsDefinition<ProgressEffect> & { seed: PropDef<number> }
export type GoopProgressPropsInput = InputOf<GoopProgressPropsDefinition>

/** Spread into `defineProps({ ...goopProgressProps, ... })`. */
export const goopProgressProps = Object.freeze({
  ...effectEngineProps(PROGRESS_EFFECTS),
  seed: def(Number),
}) as unknown as GoopProgressPropsDefinition

/** Progress options from props, over app config (`seed` falls back to the app's). */
export function toProgressOptions(props: GoopProgressPropsInput, config: GoopOptions = {}): ProgressOptions {
  const out: ProgressOptions = toEffectOptions(PROGRESS_EFFECTS, props, config)
  const seed = props.seed ?? config.seed
  if (seed !== undefined) out.seed = seed
  return out
}

// ---- GoopDropdownMenu -----------------------------------------------------------------------
// The menu panel reuses core's emerge engine (same toggles as GoopPopoverContent) and adds
// core's MENU_EFFECTS: the goo highlight blob, the select pop, and goo submenus. Every toggle
// is a boolean; `undefined` (absent) means "inherit" (a submenu takes its parent menu's value),
// then on.

/** Emerge toggles shared with GoopPopoverContent. */
export const EMERGE_EFFECT_KEYS = ['bridge', 'wobble', 'momentum', 'fade', 'openSlosh', 'openDrips', 'closeSlosh'] as const
/** Numeric open-burst knobs (core EMERGE_DRIP_KNOBS), shared with GoopPopoverContent. */
export const EMERGE_DRIP_KEYS = ['openDripAmount', 'openDripSize', 'openDripFling', 'openDripVariety', 'sloshVariety'] as const
/** Every GoopDropdownMenuContent / SubContent engine prop. */
export const MENU_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  ...EMERGE_EFFECT_KEYS,
  ...EMERGE_DRIP_KEYS,
  ...MENU_EFFECTS,
  'followPointer',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopDropdownMenuContent / GoopDropdownMenuSubContent. */
export interface GoopMenuProps {
  /** Master switch. `false` renders plain shadcn DropdownMenu parts. */
  goo?: boolean
  /** Flow out of the trigger: goo bulges out of the trigger edge, runs across as a thick
   *  neck and swells into the menu, then pinches off; close sucks it back into the trigger.
   *  Default true; submenus inherit it (they flow out of their row). `false`: the menu
   *  inflates from a bulb at the trigger edge. */
  flow?: boolean
  /** How the flow opens: 'bloom' (default: the menu pools from its own center and spreads
   *  out in every direction with a lobed edge, overshoots, then splashes all around, keeping
   *  the drops off the trigger; close pulls in, wobbles and shrinks back to the center) or
   *  'neck' (out of the trigger through a thick neck). Submenus inherit it.
   *  Toggles under bloom: `wobble` (open overshoot + settle), `fade`, `openSlosh` (every edge),
   *  `openDrips` + `openDrip*` (the all-around splash), `closeSlosh` (the close's inward
   *  wobble). `bridge` and `momentum` (launch) only apply to 'neck' / `flow: false`. */
  flowStyle?: EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Bulb + lumpy neck between trigger (or submenu row) and panel (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot: panel wobble (bloom: the open overshoot and settle), highlight
   *  overshoot and grow-in. */
  wobble?: boolean
  /** Momentum: the panel's launch (not used by bloom), and the highlight's stretch + neck
   *  while it travels. */
  momentum?: boolean
  /** Content fades in once the goo settles. */
  fade?: boolean
  /** On open, the far edge (bloom: every edge) overshoots, rebounds and wobbles. */
  openSlosh?: boolean
  /** On open, the whole far edge bursts (bloom: every edge splashes, drops kept off the
   *  trigger): globs, drops and specks fling off and fall away. */
  openDrips?: boolean
  /** Burst drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close (off-centre, one or
   *  two lumps, staggered; re-rolled every open). Default 1; 0: an even, centred bulge. */
  sloshVariety?: number
  /** On close, the goo lags and the near edge sloshes against the trigger (bloom: the
   *  panel pulls in and wobbles before it shrinks to the center). */
  closeSlosh?: boolean
  /** Item highlight is a goo blob that slides between items (false: shadcn's flat bg). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is selected, before the menu closes. */
  pop?: boolean
  /** The highlight's swell (its neck while it slides, and a soft bulge as the pointer moves
   *  along an item) follows the pointer with a little lag (false, or keyboard: centred). */
  followPointer?: boolean
  /** Submenus emerge from their row (false: plain shadcn submenus). */
  submenus?: boolean
  /** Panel color: 'trigger' (default: the trigger's background and text color, falling back
   *  to the theme's primary when the trigger has none), 'popover' (shadcn's popover tokens),
   *  or any CSS color. Submenus that leave it unset reuse their parent menu's resolved colors. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every emerge / highlight option core grows must be handled here. */
// `surface` (the element) is the adapter's; `surfaceColor` comes from the `surface` prop.
type MenuAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'find' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type MenuUnhandled = Exclude<
  keyof EmergeOptions | keyof MenuHighlightOptions | MenuEffect,
  keyof GoopMenuProps | MenuAdapterOwned
>
const _allMenuOptionsHandled: [MenuUnhandled] extends [never] ? true : { unhandled: MenuUnhandled } = true
void _allMenuOptionsHandled
type MenuPropsListed = Exclude<keyof GoopMenuProps, (typeof MENU_PROP_KEYS)[number]>
const _allMenuPropsListed: [MenuPropsListed] extends [never] ? true : { unlisted: MenuPropsListed } = true
void _allMenuPropsListed

/** Fully resolved menu settings (no undefined toggles). */
export interface ResolvedMenuProps
  extends Required<Omit<GoopMenuProps, 'preset' | 'renderer' | (typeof EMERGE_DRIP_KEYS)[number]>>,
    Pick<GoopMenuProps, (typeof EMERGE_DRIP_KEYS)[number]> {
  preset?: GoopPreset
  renderer?: GoopRendererOption
}

const MENU_TOGGLES = ['goo', 'flow', ...EMERGE_EFFECT_KEYS, ...MENU_EFFECTS, 'followPointer'] as const

/** Resolve menu props over a parent menu's resolved settings (submenus) or the defaults. */
export function resolveMenuProps(props: GoopMenuProps, parent?: ResolvedMenuProps | null): ResolvedMenuProps {
  const out = { speed: props.speed ?? parent?.speed ?? 1 } as ResolvedMenuProps
  for (const k of MENU_TOGGLES) out[k] = props[k] ?? parent?.[k] ?? true
  for (const k of EMERGE_DRIP_KEYS) {
    const v = props[k] ?? parent?.[k]
    if (v !== undefined) out[k] = v
  }
  out.flowStyle = props.flowStyle ?? parent?.flowStyle ?? 'bloom'
  out.bloomStart = props.bloomStart ?? parent?.bloomStart ?? 'single'
  out.surface = props.surface ?? parent?.surface ?? 'trigger'
  out.preset = props.preset ?? parent?.preset
  out.renderer = props.renderer ?? parent?.renderer
  return out
}

/** Core options for the panel (emerge) and the highlight, over app config. */
export function toMenuOptions(
  menu: ResolvedMenuProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: MenuHighlightOptions | null } {
  const common = {
    speed: menu.speed,
    preset: menu.preset ?? config.preset,
    renderer: menu.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  return {
    emerge: {
      ...common,
      flow: menu.flow,
      flowStyle: menu.flowStyle,
      bloomStart: menu.bloomStart,
      bridge: menu.bridge,
      wobble: menu.wobble,
      momentum: menu.momentum,
      fade: menu.fade,
      openSlosh: menu.openSlosh,
      openDrips: menu.openDrips,
      closeSlosh: menu.closeSlosh,
      openDripAmount: menu.openDripAmount,
      openDripSize: menu.openDripSize,
      openDripFling: menu.openDripFling,
      openDripVariety: menu.openDripVariety,
      sloshVariety: menu.sloshVariety,
      surfaceColor: menu.surface,
    },
    highlight: menu.goo && menu.highlight ? { ...common, wobble: menu.wobble, momentum: menu.momentum, pop: menu.pop, followPointer: menu.followPointer } : null,
  }
}

// ---- GoopSelect -----------------------------------------------------------------------------
// The listbox reuses the dropdown's goo (emerge panel with the bloom open, menu highlight blob
// and select pop) and adds core's SELECT_EFFECTS `plop` (the check mark drops in when an item
// is chosen) and `bloomFrom` (an item-aligned list blooms out of the selected item).

/** Every GoopSelectContent engine prop. */
export const SELECT_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  'bloomFrom',
  ...EMERGE_EFFECT_KEYS,
  ...EMERGE_DRIP_KEYS,
  ...SELECT_EFFECTS,
  'followPointer',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopSelectContent. Same meaning as GoopDropdownMenuContent's, except as
 *  noted. Every toggle defaults on. */
export interface GoopSelectProps extends Omit<GoopMenuProps, 'submenus' | 'surface'> {
  /** Where the bloom starts: 'auto' (default: the selected item when `position` is
   *  'item-aligned', so the list grows out of the value you clicked; the list's own center
   *  for 'popper'), 'selected' or 'center'. Close shrinks back to the same spot. */
  bloomFrom?: SelectBloomFrom
  /** The chosen item's check mark plops in: falls in small, squashes flat as it lands and
   *  jiggles back to round (`wobble` off: one plain rebound). */
  plop?: boolean
  /** Panel color: 'popover' (default: shadcn's popover tokens; a select trigger is an
   *  outlined field, so its color is not the list's), 'trigger', or any CSS color. */
  surface?: EmergeSurfaceColor
}

/** Compile-time guards: every emerge / highlight / plop option and select effect core grows
 *  must be handled here. `bloomOrigin` is set by the adapter from `bloomFrom`. */
type SelectAdapterOwned = MenuAdapterOwned
type SelectUnhandled = Exclude<
  keyof EmergeOptions | keyof MenuHighlightOptions | keyof SelectPlopOptions | SelectEffect,
  keyof GoopSelectProps | SelectAdapterOwned
>
const _allSelectOptionsHandled: [SelectUnhandled] extends [never] ? true : { unhandled: SelectUnhandled } = true
void _allSelectOptionsHandled
type SelectPropsListed = Exclude<keyof GoopSelectProps, (typeof SELECT_PROP_KEYS)[number]>
const _allSelectPropsListed: [SelectPropsListed] extends [never] ? true : { unlisted: SelectPropsListed } = true
void _allSelectPropsListed

/** Fully resolved select settings (no undefined toggles). */
export interface ResolvedSelectProps
  extends Required<Omit<GoopSelectProps, 'preset' | 'renderer' | (typeof EMERGE_DRIP_KEYS)[number]>>,
    Pick<GoopSelectProps, (typeof EMERGE_DRIP_KEYS)[number]> {
  preset?: GoopPreset
  renderer?: GoopRendererOption
}

const SELECT_TOGGLES = ['goo', 'flow', ...EMERGE_EFFECT_KEYS, ...SELECT_EFFECTS, 'followPointer'] as const

/** Resolve select props over the defaults. */
export function resolveSelectProps(props: GoopSelectProps): ResolvedSelectProps {
  const out = { speed: props.speed ?? 1 } as ResolvedSelectProps
  for (const k of SELECT_TOGGLES) out[k] = props[k] ?? true
  for (const k of EMERGE_DRIP_KEYS) if (props[k] !== undefined) out[k] = props[k]
  out.flowStyle = props.flowStyle ?? 'bloom'
  out.bloomStart = props.bloomStart ?? 'single'
  out.bloomFrom = props.bloomFrom ?? 'auto'
  out.surface = props.surface ?? 'popover'
  out.preset = props.preset
  out.renderer = props.renderer
  return out
}

/** Core options for the listbox (emerge), the highlight blob and the check plop, over app
 *  config. `highlight` / `plop` are null when off. */
export function toSelectOptions(
  select: ResolvedSelectProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: MenuHighlightOptions | null; plop: SelectPlopOptions | null } {
  const { emerge, highlight } = toMenuOptions({ ...select, submenus: false }, config)
  return {
    emerge,
    highlight,
    plop:
      select.goo && select.plop
        ? { speed: select.speed, preset: select.preset ?? config.preset, wobble: select.wobble, reducedMotion: config.reducedMotion }
        : null,
  }
}

// ---- GoopTabs -------------------------------------------------------------------------------
// The active-tab indicator is core's menu highlight engine fed TABS_FEEL (`attachTabsIndicator`).
// Toggles come from core's TABS_EFFECTS; all default true.

/** Every GoopTabsList engine prop. */
export const TABS_PROP_KEYS = ['goo', ...TABS_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopTabsList. */
export interface GoopTabsProps {
  /** Master switch. `false` renders a plain shadcn TabsList / TabsTrigger. */
  goo?: boolean
  /** The active tab's background is a goo blob that slides between triggers (false: shadcn's flat bg). */
  indicator?: boolean
  /** Jelly overshoot when the blob lands. */
  wobble?: boolean
  /** Momentum: the blob stretches and necks to a trailing tail while it travels. */
  momentum?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

type TabsAdapterOwned = 'feel' | 'reducedMotion'
type TabsUnhandled = Exclude<keyof TabsIndicatorOptions | TabsEffect, keyof GoopTabsProps | TabsAdapterOwned>
const _allTabsOptionsHandled: [TabsUnhandled] extends [never] ? true : { unhandled: TabsUnhandled } = true
void _allTabsOptionsHandled
type TabsPropsListed = Exclude<keyof GoopTabsProps, (typeof TABS_PROP_KEYS)[number]>
const _allTabsPropsListed: [TabsPropsListed] extends [never] ? true : { unlisted: TabsPropsListed } = true
void _allTabsPropsListed

/** Indicator options for core over app config, or null when the goo indicator is off. */
export function toTabsOptions(props: GoopTabsProps, config: GoopOptions = {}): TabsIndicatorOptions | null {
  if (props.goo === false || props.indicator === false) return null
  return {
    feel: TABS_FEEL,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

// ---- GoopPagination -------------------------------------------------------------------------
// The current page is ONE goo blob (core `attachPaginationIndicator`: the Tabs indicator fed
// PAGINATION_FEEL) on GoopPaginationContent. First / Previous / Next / Last are ghost
// GoopButtons, so they press-squish. Every prop can sit on GoopPagination (all parts inherit
// it) or on a part (wins there). Toggles come from core's PAGINATION_EFFECTS; all default true.

/** Every GoopPagination engine prop. */
export const PAGINATION_PROP_KEYS = ['goo', ...PAGINATION_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopPagination (inherited by its parts) and GoopPaginationContent. */
export interface GoopPaginationProps {
  /** Master switch. `false` renders plain shadcn Pagination parts. */
  goo?: boolean
  /** The current page's background is a goo blob that slides between pages (false: shadcn's outline button). */
  indicator?: boolean
  /** Jelly overshoot when the blob lands. */
  wobble?: boolean
  /** Momentum: the blob stretches and necks to a trailing tail while it travels. */
  momentum?: boolean
  /** First / Previous / Next / Last squish when pressed (GoopButton's press squish). */
  press?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Engine props of the button parts (First / Previous / Next / Last). */
export type GoopPaginationButtonProps = Pick<GoopPaginationProps, 'goo' | 'press' | 'speed' | 'preset' | 'renderer'>
export const PAGINATION_BUTTON_PROP_KEYS = ['goo', 'press', 'speed', 'preset', 'renderer'] as const

type PaginationAdapterOwned = 'feel' | 'reducedMotion'
type PaginationUnhandled = Exclude<keyof PaginationIndicatorOptions | PaginationEffect, keyof GoopPaginationProps | PaginationAdapterOwned>
const _allPaginationOptionsHandled: [PaginationUnhandled] extends [never] ? true : { unhandled: PaginationUnhandled } = true
void _allPaginationOptionsHandled
type PaginationPropsListed = Exclude<keyof GoopPaginationProps, (typeof PAGINATION_PROP_KEYS)[number]>
const _allPaginationPropsListed: [PaginationPropsListed] extends [never] ? true : { unlisted: PaginationPropsListed } = true
void _allPaginationPropsListed
type PaginationButtonPropsListed = Exclude<keyof GoopPaginationButtonProps, (typeof PAGINATION_BUTTON_PROP_KEYS)[number]>
const _allPaginationButtonPropsListed: [PaginationButtonPropsListed] extends [never] ? true : { unlisted: PaginationButtonPropsListed } = true
void _allPaginationButtonPropsListed

/** A part's props over the root's: each prop the part sets wins, the rest are inherited. */
export function resolvePaginationProps(own: GoopPaginationProps, parent?: GoopPaginationProps | null): GoopPaginationProps {
  const out: GoopPaginationProps = {}
  for (const k of PAGINATION_PROP_KEYS) {
    const v = own[k] ?? parent?.[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** Blob options for core over app config, or null when the goo blob is off. */
export function toPaginationOptions(props: GoopPaginationProps, config: GoopOptions = {}): PaginationIndicatorOptions | null {
  if (props.goo === false || props.indicator === false) return null
  return {
    feel: PAGINATION_FEEL,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

/** GoopButton props for a button part (ghost GoopButton): `press: false` turns the squish off. */
export function toPaginationButtonProps(props: GoopPaginationButtonProps): GoopPropsInput & { goo?: boolean } {
  const out: GoopPropsInput & { goo?: boolean } = {}
  if (props.goo !== undefined) out.goo = props.goo
  if (props.press === false) out.squish = false
  if (props.preset !== undefined) out.preset = props.preset
  if (props.renderer !== undefined) out.renderer = props.renderer
  if (props.speed !== undefined) out.timeScale = props.speed
  return out
}

// ---- GoopTooltip ----------------------------------------------------------------------------
// The tooltip uses the popover's emerge engine fed TOOLTIP_FEEL (quick, small) and
// TOOLTIP_MOMENTUM (light slosh) as defaults. By default it blooms like the popover (from its
// own center, lobed spread, overshoot + wobble, shrinks back to center on close) with a light
// splash (TOOLTIP_BLOOM_SPLASH: a few small drops). `flow: false` keeps the original
// inflate-from-a-bulb emerge (no drips by default).

/** Every GoopTooltipContent engine prop. */
export const TOOLTIP_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  ...EMERGE_EFFECT_KEYS,
  ...EMERGE_DRIP_KEYS,
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopTooltipContent. */
export interface GoopTooltipProps {
  /** Master switch. `false` renders a plain shadcn TooltipContent. */
  goo?: boolean
  /** Flow open (default true): the goo opens in `flowStyle`. `false`: the tooltip inflates
   *  from a small bulb at the trigger edge (`bridge` / `momentum` apply). */
  flow?: boolean
  /** How the flow opens: 'bloom' (default: the tooltip pools from its own center, spreads
   *  out with an organic lobed edge, overshoots and settles; close shrinks it back to the
   *  center) or 'neck' (out of the trigger through a thick neck). */
  flowStyle?: EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Small bulb + lumpy neck between trigger and tooltip (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot and wobble (bloom: the open overshoot and settle). */
  wobble?: boolean
  /** Momentum launch away from the trigger that stretches and snaps the neck (not used by bloom). */
  momentum?: boolean
  /** Content (and the arrow) fades in once the goo settles. */
  fade?: boolean
  /** Open: the far edge (bloom: every edge) bulges and wobbles. `true` (light, 0.4), `false`
   *  or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open splash. Bloom: on by default, a few small drops all around that keep off the
   *  trigger (TOOLTIP_BLOOM_SPLASH); `false` turns it off, a 0..2 strength or the
   *  `openDrip*` knobs turn it up. Bulb emerge: off by default; `true` or 0..2 turns on drops
   *  off the far edge. */
  openDrips?: boolean | number
  /** Splash / burst drop count scale (0..3; default 1, bloom 0.3). */
  openDripAmount?: number
  /** Drop size scale (0.3..2.5; default 1, bloom 0.6). */
  openDripSize?: number
  /** How far drops are flung (0..3; default 1, bloom 0.6). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close (off-centre, one or
   *  two lumps, staggered; re-rolled every open). Default 1; 0: an even, centred bulge. */
  sloshVariety?: number
  /** Close: the near edge sloshes against the trigger (bloom: the inward pull-and-wobble
   *  before it shrinks to the center). `true` (light, 0.5), `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Tooltip color: 'popover' (default: shadcn's inverted tooltip, foreground goo with
   *  background text), 'trigger' (the trigger's background and text color, like
   *  GoopPopoverContent's default), or any CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

// `surface` (the element) is the adapter's; `surfaceColor` comes from the `surface` prop.
type TooltipAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type TooltipUnhandled = Exclude<keyof EmergeOptions, keyof GoopTooltipProps | TooltipAdapterOwned>
const _allTooltipOptionsHandled: [TooltipUnhandled] extends [never] ? true : { unhandled: TooltipUnhandled } = true
void _allTooltipOptionsHandled
type TooltipPropsListed = Exclude<keyof GoopTooltipProps, (typeof TOOLTIP_PROP_KEYS)[number]>
const _allTooltipPropsListed: [TooltipPropsListed] extends [never] ? true : { unlisted: TooltipPropsListed } = true
void _allTooltipPropsListed

/** Slosh toggle: `true` / absent = the tooltip's light default strength, else as given. */
const lightSlosh = (v: boolean | number | undefined, def: boolean | number): boolean | number =>
  v === undefined || v === true ? def : v

/** Emerge options for a tooltip over app config. */
export function toTooltipOptions(props: GoopTooltipProps, config: GoopOptions = {}): EmergeOptions {
  const M = TOOLTIP_MOMENTUM
  const flow = props.flow !== false
  const flowStyle = props.flowStyle ?? 'bloom'
  // Bloom: a light splash by default; the knobs only pick up its light defaults when the
  // splash strength is left to us.
  const S = flow && flowStyle === 'bloom' ? TOOLTIP_BLOOM_SPLASH : null
  return {
    feel: TOOLTIP_FEEL,
    flow,
    flowStyle,
    bloomStart: props.bloomStart ?? 'single',
    bridge: props.bridge !== false,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    fade: props.fade !== false,
    openSlosh: lightSlosh(props.openSlosh, M.openSlosh),
    // Bulb emerge: off unless asked for (`true` turns drips on at full strength). Bloom: on.
    openDrips: props.openDrips ?? S?.openDrips ?? M.openDrips,
    closeSlosh: lightSlosh(props.closeSlosh, M.closeSlosh),
    openDripAmount: props.openDripAmount ?? S?.openDripAmount,
    openDripSize: props.openDripSize ?? S?.openDripSize,
    openDripFling: props.openDripFling ?? S?.openDripFling,
    openDripVariety: props.openDripVariety,
    sloshVariety: props.sloshVariety,
    surfaceColor: props.surface ?? 'popover',
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

// ---- GoopDialog / GoopAlertDialog ------------------------------------------------------------
// The panel blooms with core's emerge engine in `detached` mode (no trigger: it pools from its
// own center, the overshoot and big all-around splash reach every side, close shrinks it back
// to the center), fed DIALOG_FEEL. The alert dialog is the serious one: a lighter splash and
// slosh (core ALERT_DIALOG_SPLASH / ALERT_DIALOG_MOMENTUM). The overlay pours down as a goo
// sheet with a drippy edge and drains off the bottom on close (core `attachBackdrop`).

/** Every GoopDialogContent / GoopAlertDialogContent engine prop. */
export const DIALOG_PROP_KEYS = [
  'goo',
  'bloomStart',
  'wobble',
  'fade',
  'openSlosh',
  'openDrips',
  'closeSlosh',
  ...EMERGE_DRIP_KEYS,
  'overlay',
  'overlayDrips',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopDialogContent / GoopAlertDialogContent. */
export interface GoopDialogProps {
  /** Master switch. `false` renders plain shadcn content and overlay. */
  goo?: boolean
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** The open overshoot past every side and its jelly settle. */
  wobble?: boolean
  /** Content fades in once the goo has mostly spread (and out first on close). */
  fade?: boolean
  /** Open: every edge bulges past rest, rebounds and wobbles. `true`, `false` or a 0..2
   *  strength (alert dialog: `true` is a light 0.6). */
  openSlosh?: boolean | number
  /** Open: the big all-around splash (globs, drops and specks fling off every side, fall and
   *  fade). `true`, `false` or 0..2 (alert dialog: a light splash by default). */
  openDrips?: boolean | number
  /** Splash drop count scale (0..3; default 1, alert dialog 0.35). */
  openDripAmount?: number
  /** Splash drop size scale (0.3..2.5; default 1, alert dialog 0.75). */
  openDripSize?: number
  /** How far splash drops are flung (0..3; default 1, alert dialog 0.6). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close (off-centre, one or
   *  two lumps, staggered; re-rolled every open). Default 1; 0: an even, centred bulge. */
  sloshVariety?: number
  /** Close: the panel pulls in and wobbles before it shrinks to the center. `true`, `false`
   *  or 0..2 (alert dialog: `true` is a light 0.7). */
  closeSlosh?: boolean | number
  /** Goo overlay (opt-in): the dimmed backdrop pours down over the page and drains off the bottom on
   *  close. Default `false`: shadcn's fading overlay. */
  overlay?: boolean
  /** The overlay's leading edge runs ahead in drips: `true`, `false` (a straight edge) or a
   *  0..2 strength. */
  overlayDrips?: boolean | number
  /** Panel color: 'popover' (default: the content's own shadcn background), 'trigger' (the
   *  trigger's background and text color), or any CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier (panel and overlay). */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory (panel and overlay). */
  renderer?: GoopRendererOption
}

// `detached` forces the bloom, so `flow` / `flowStyle` / `bridge` / `momentum` don't apply.
type DialogAdapterOwned =
  | 'anchor'
  | 'side'
  | 'ready'
  | 'surface'
  | 'surfaceColor'
  | 'feel'
  | 'reducedMotion'
  | 'detached'
  | 'bloomOrigin'
  | 'flow'
  | 'flowStyle'
  | 'bridge'
  | 'momentum'
type DialogUnhandled = Exclude<keyof EmergeOptions, keyof GoopDialogProps | DialogAdapterOwned>
const _allDialogOptionsHandled: [DialogUnhandled] extends [never] ? true : { unhandled: DialogUnhandled } = true
void _allDialogOptionsHandled
// Backdrop: `drips` comes from `overlayDrips`; speed / preset / renderer are shared.
type BackdropUnhandled = Exclude<keyof BackdropOptions, keyof GoopDialogProps | 'drips' | 'surface' | 'seed' | 'reducedMotion'>
const _allBackdropOptionsHandled: [BackdropUnhandled] extends [never] ? true : { unhandled: BackdropUnhandled } = true
void _allBackdropOptionsHandled
type DialogPropsListed = Exclude<keyof GoopDialogProps, (typeof DIALOG_PROP_KEYS)[number]>
const _allDialogPropsListed: [DialogPropsListed] extends [never] ? true : { unlisted: DialogPropsListed } = true
void _allDialogPropsListed

/** 'dialog' (the big splash) or 'alert' (the lighter one). */
export type GoopDialogKind = 'dialog' | 'alert'

/** Emerge options for a dialog panel over app config. */
export function toDialogOptions(props: GoopDialogProps, config: GoopOptions = {}, kind: GoopDialogKind = 'dialog'): EmergeOptions {
  const alert = kind === 'alert'
  const S = alert ? ALERT_DIALOG_SPLASH : null
  const M = alert ? ALERT_DIALOG_MOMENTUM : null
  // `true` / absent: the kind's default strength (alert: light).
  const strength = (v: boolean | number | undefined, def: boolean | number | undefined): boolean | number =>
    v === undefined || v === true ? (def ?? true) : v
  return {
    feel: DIALOG_FEEL,
    detached: true,
    bloomStart: props.bloomStart ?? 'single',
    wobble: props.wobble !== false,
    fade: props.fade !== false,
    openSlosh: strength(props.openSlosh, M?.openSlosh),
    openDrips: props.openDrips ?? S?.openDrips ?? true,
    closeSlosh: strength(props.closeSlosh, M?.closeSlosh),
    openDripAmount: props.openDripAmount ?? S?.openDripAmount,
    openDripSize: props.openDripSize ?? S?.openDripSize,
    openDripFling: props.openDripFling ?? S?.openDripFling,
    openDripVariety: props.openDripVariety,
    sloshVariety: props.sloshVariety,
    surfaceColor: props.surface ?? 'popover',
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

/** Backdrop options for the goo overlay over app config, or null when it is off. */
export function toBackdropOptions(
  props: Pick<GoopDialogProps, 'goo' | 'overlay' | 'overlayDrips' | 'speed' | 'preset' | 'renderer'>,
  config: GoopOptions = {},
): BackdropOptions | null {
  if (props.goo === false || props.overlay === false) return null
  return {
    drips: props.overlayDrips ?? true,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

// ---- GoopSheet ------------------------------------------------------------------------------
// The sheet blooms from the middle of its screen edge with core's emerge engine (`attachSheet`
// = detached bloom + edge origin + SHEET_FEEL): it spreads in lobes to fill the sheet,
// overshoots the inner edge and wobbles, splashes off the inner edge and sides (never
// off-screen), and on close shrinks back into the edge. Same toggles as the dialog's bloom. A
// sheet is a big surface, so it draws with the canvas renderer unless a prop or the app config
// says otherwise. `goo: false` is a plain shadcn Sheet.

/** Every GoopSheetContent engine prop. */
export const SHEET_PROP_KEYS = [
  'goo',
  'bloomStart',
  'wobble',
  'fade',
  'openSlosh',
  'openDrips',
  'closeSlosh',
  ...EMERGE_DRIP_KEYS,
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopSheetContent. */
export interface GoopSheetProps {
  /** Master switch. `false` renders a plain shadcn SheetContent (slide in / out). */
  goo?: boolean
  /** Bloom start: 'single' (default: one droplet swells at the edge) or 'merge' (a few drops
   *  fuse). */
  bloomStart?: EmergeBloomStart
  /** The open overshoot past the inner edge and its jelly settle. */
  wobble?: boolean
  /** Content fades in once the goo has mostly spread (and out first on close). */
  fade?: boolean
  /** Open: the edges bulge past rest, rebound and wobble. `true`, `false` or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open: the big splash (globs, drops and specks fling off the inner edge and sides, fall
   *  and fade; none off-screen). `true`, `false` or 0..2. */
  openDrips?: boolean | number
  /** Splash drop count scale (0..3; default 1). */
  openDripAmount?: number
  /** Splash drop size scale (0.3..2.5; default 1). */
  openDripSize?: number
  /** How far splash drops are flung (0..3; default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close (off-centre, one or
   *  two lumps, staggered; re-rolled every open). Default 1; 0: an even, centred bulge. */
  sloshVariety?: number
  /** Close: the goo pulls in and wobbles before it shrinks back into the edge. `true`,
   *  `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'canvas' (default for the sheet) | 'svg' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every sheet option core grows must be a prop (or adapter-owned). */
type SheetAdapterOwned = 'side' | 'surface' | 'feel' | 'reducedMotion'
type SheetUnhandled = Exclude<keyof SheetOptions, keyof GoopSheetProps | SheetAdapterOwned>
const _allSheetOptionsHandled: [SheetUnhandled] extends [never] ? true : { unhandled: SheetUnhandled } = true
void _allSheetOptionsHandled
type SheetPropsListed = Exclude<keyof GoopSheetProps, (typeof SHEET_PROP_KEYS)[number]>
const _allSheetPropsListed: [SheetPropsListed] extends [never] ? true : { unlisted: SheetPropsListed } = true
void _allSheetPropsListed

/** Sheet options over app config (renderer: prop, then config, then canvas). */
export function toSheetOptions(props: GoopSheetProps, config: GoopOptions = {}): SheetOptions {
  return {
    bloomStart: props.bloomStart ?? 'single',
    wobble: props.wobble !== false,
    fade: props.fade !== false,
    openSlosh: props.openSlosh ?? true,
    openDrips: props.openDrips ?? true,
    closeSlosh: props.closeSlosh ?? true,
    openDripAmount: props.openDripAmount,
    openDripSize: props.openDripSize,
    openDripFling: props.openDripFling,
    openDripVariety: props.openDripVariety,
    sloshVariety: props.sloshVariety,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer ?? 'canvas',
    reducedMotion: config.reducedMotion,
  }
}

// ---- GoopToaster ----------------------------------------------------------------------------
// The toaster's goo comes from core's `attachToaster`: TOASTER_EFFECTS (dropIn, merge, drips),
// each `true` (default), `false`, or a 0..2 strength, plus speed / preset. `goo: false` is a
// plain shadcn Sonner.

/** Every GoopToaster engine prop. */
export const TOASTER_PROP_KEYS = ['goo', ...TOASTER_EFFECTS, 'speed', 'preset'] as const

/** Engine props of GoopToaster (on top of vue-sonner's ToasterProps). */
export interface GoopToasterProps {
  /** Master switch. `false` renders a plain shadcn Sonner. */
  goo?: boolean
  /** New toasts drop in as a blob from the toaster edge, overshoot and slosh. `true`, `false` or 0..2. */
  dropIn?: boolean | number
  /** Stacked toasts merge with fat goo necks that stretch and snap as the stack expands. `true`, `false` or 0..2. */
  merge?: boolean | number
  /** Leaving toasts drip off; swipe-out flings the goo the swipe's way. `true`, `false` or 0..2. */
  drips?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
}

/** Compile-time guards: every toaster option core grows must be a prop (or adapter-owned). */
type ToasterAdapterOwned = 'reducedMotion'
type ToasterUnhandled = Exclude<keyof ToasterOptions | ToasterEffect, keyof GoopToasterProps | ToasterAdapterOwned>
const _allToasterOptionsHandled: [ToasterUnhandled] extends [never] ? true : { unhandled: ToasterUnhandled } = true
void _allToasterOptionsHandled
type ToasterPropsListed = Exclude<keyof GoopToasterProps, (typeof TOASTER_PROP_KEYS)[number]>
const _allToasterPropsListed: [ToasterPropsListed] extends [never] ? true : { unlisted: ToasterPropsListed } = true
void _allToasterPropsListed

/** Toaster options from props, over app config (`preset`, `reducedMotion`). */
export function toToasterOptions(props: GoopToasterProps, config: GoopOptions = {}): ToasterOptions {
  const out: ToasterOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.speed !== undefined) out.speed = props.speed
  for (const k of TOASTER_EFFECTS) if (props[k] !== undefined) out[k] = props[k]
  return out
}

// ---- GoopDrawerContent ----------------------------------------------------------------------
// Core's `createDrawer` drives the whole drawer (drag, snap points, springs) and its goo:
// DRAWER_EFFECTS (lag, slosh, rise, stretch, handle, splash), each `true` (default), `false`,
// or a 0..2 strength, plus goo / speed / preset / renderer. `goo: false` is a plain shadcn
// DrawerContent look. The drawer's behaviour options (direction, snap points, dismissible...)
// are GoopDrawer root props (vaul's API), passed through by the adapter.

/** Every GoopDrawerContent engine prop. */
export const DRAWER_PROP_KEYS = ['goo', ...DRAWER_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopDrawerContent. */
export interface GoopDrawerProps {
  /** Master switch. `false` renders a plain shadcn DrawerContent. */
  goo?: boolean
  /** The leading edge trails behind fast motion: a fast pull in stretches it out behind the panel. `true`, `false` or 0..2. */
  lag?: boolean | number
  /** The edge overshoots and wobbles when motion stops (release, snap points, landing). `true`, `false` or 0..2. */
  slosh?: boolean | number
  /** Opening lands with an extra jelly overshoot of the edge. `true`, `false` or 0..2. */
  rise?: boolean | number
  /** Dragging past full open pulls a globby bump toward the finger. `true`, `false` or 0..2. */
  stretch?: boolean | number
  /** The drag handle is a goo blob: swells, stretches along the drag, trails a droplet. `true`, `false` or 0..2. */
  handle?: boolean | number
  /** Fling-dismiss: a splash of drops tears off the leading edge, flies, falls and fades. `true`, `false` or 0..2. */
  splash?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'canvas' (default for this big surface) | 'svg' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every drawer option core grows must be a prop (or adapter-owned). */
type DrawerAdapterOwned =
  | 'reducedMotion'
  | 'grip'
  | 'surface'
  | 'overlay'
  | 'wrapper'
  // GoopDrawer root props (vaul's API), passed through by GoopDrawerContent:
  | 'direction'
  | 'snapPoints'
  | 'activeSnapPoint'
  | 'fadeFromIndex'
  | 'dismissible'
  | 'closeThreshold'
  | 'handleOnly'
  | 'scaleBackground'
  | 'setBackgroundColorOnScale'
type DrawerUnhandled = Exclude<keyof DrawerOptions | DrawerEffect, keyof GoopDrawerProps | DrawerAdapterOwned>
const _allDrawerOptionsHandled: [DrawerUnhandled] extends [never] ? true : { unhandled: DrawerUnhandled } = true
void _allDrawerOptionsHandled
type DrawerPropsListed = Exclude<keyof GoopDrawerProps, (typeof DRAWER_PROP_KEYS)[number]>
const _allDrawerPropsListed: [DrawerPropsListed] extends [never] ? true : { unlisted: DrawerPropsListed } = true
void _allDrawerPropsListed

/** Drawer options from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toDrawerOptions(props: GoopDrawerProps, config: GoopOptions = {}): DrawerOptions {
  const out: DrawerOptions = {
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer ?? 'canvas',
    reducedMotion: config.reducedMotion,
  }
  if (props.goo !== undefined) out.goo = props.goo
  if (props.speed !== undefined) out.speed = props.speed
  for (const k of DRAWER_EFFECTS) if (props[k] !== undefined) out[k] = props[k]
  return out
}

// ---- GoopAccordion / GoopCollapsible ----------------------------------------------------------
// Core `attachAccordion` on each item (and on the collapsible root): ACCORDION_EFFECTS (flood,
// wobble, droplets: GoopToggle's fill on the trigger row; jelly: the content's spring), each
// `true` (default), `false`, or a 0..2 strength, plus speed / preset / renderer. Set them on
// GoopAccordion (every item follows) or GoopCollapsible. `goo: false` is plain shadcn.

/** Every GoopAccordion / GoopCollapsible engine prop. */
export const ACCORDION_PROP_KEYS = ['goo', ...ACCORDION_EFFECTS, 'textFollow', 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopAccordion and GoopCollapsible. */
export interface GoopAccordionProps {
  /** Master switch. `false` renders a plain shadcn Accordion / Collapsible. */
  goo?: boolean
  /** The trigger row floods with goo from the click point on open and drains back into it on
   *  close (off: the fill snaps). `true`, `false` or 0..2. */
  flood?: boolean | number
  /** Crest of the flood front and a jelly wobble of the row once full. `true`, `false` or 0..2. */
  wobble?: boolean | number
  /** A few droplets splash off the row's top edge as it floods. `true`, `false` or 0..2. */
  droplets?: boolean | number
  /** The content opens on a jelly spring (overshoot + settle). `true`, `false` or 0..2. */
  jelly?: boolean | number
  /** The trigger's text color follows the goo's edge (default true). `false`: it flips all at
   *  once when the goo crosses the label. */
  textFollow?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every accordion option core grows must be a prop (or adapter-owned). */
type AccordionAdapterOwned = 'reducedMotion'
type AccordionUnhandled = Exclude<keyof AccordionOptions | AccordionEffect, keyof GoopAccordionProps | AccordionAdapterOwned>
const _allAccordionOptionsHandled: [AccordionUnhandled] extends [never] ? true : { unhandled: AccordionUnhandled } = true
void _allAccordionOptionsHandled
type AccordionPropsListed = Exclude<keyof GoopAccordionProps, (typeof ACCORDION_PROP_KEYS)[number]>
const _allAccordionPropsListed: [AccordionPropsListed] extends [never] ? true : { unlisted: AccordionPropsListed } = true
void _allAccordionPropsListed

/** Accordion options from props, over app config, or null when the goo is off. */
export function toAccordionOptions(props: GoopAccordionProps, config: GoopOptions = {}): AccordionOptions | null {
  if (props.goo === false) return null
  const out: AccordionOptions = {
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  if (props.speed !== undefined) out.speed = props.speed
  if (props.textFollow !== undefined) out.textFollow = props.textFollow
  for (const k of ACCORDION_EFFECTS) if (props[k] !== undefined) out[k] = props[k]
  return out
}

// ---- GoopPageTransition ---------------------------------------------------------------------
// Core's `createPageTransition`: a fixed, aria-hidden goo wall that pours in from one edge,
// holds, and drains out the other. band is `true` (default), `false` (the wall) or a
// thickness; bubbles / bulge / wobble / lag are `true` (default), `false` or a 0..2 strength; the rest are core's options as they are. `goo: false` turns it off:
// cover() / reveal() resolve at once.

/** Every GoopPageTransition engine prop. */
export const PAGE_TRANSITION_PROP_KEYS = [
  'goo',
  'direction',
  'color',
  'accent',
  'highlight',
  'duration',
  'coverDuration',
  'revealDuration',
  'speed',
  'preset',
  'band',
  'bubbles',
  'bulge',
  'wobble',
  'lag',
  'zIndex',
  'seed',
  'split',
] as const

/** Engine props of GoopPageTransition / useGoopPageTransition. */
export interface GoopPageTransitionProps {
  /** Master switch. `false`: no overlay; cover() / reveal() resolve at once. */
  goo?: boolean
  /** Travel direction: 'down' (default) pours from the top and drains out the bottom. */
  direction?: PageTransitionDirection
  /** Wall fill, any CSS colour or `var()`. Default `--goop-page-transition`, then `--primary`. */
  color?: string
  /** Lip colour on the moving edges and bubble rims, or false. Default
   *  `--goop-page-transition-accent` if set. */
  accent?: string | false
  /** A soft lighter glow through the band, or false. Default `--goop-page-transition-highlight` if set. */
  highlight?: string | false
  /** Total cover + reveal time (ms) at speed 1. Default from the preset (~1150). */
  duration?: number
  /** Cover / reveal time (ms); override `duration`. */
  coverDuration?: number
  revealDuration?: number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** A band that sweeps through (`true`), the full-screen wall (`false`), or the band's
   *  thickness as a fraction of the travel length (0.2..1). */
  band?: boolean | number
  /** See-through bubbles rising through the goo. `true`, `false` or 0..2 (how many). */
  bubbles?: boolean | number
  /** Low, wide mounds on the leading front. `true`, `false` or 0..2. */
  bulge?: boolean | number
  /** The mounds wobble and drift while moving. `true`, `false` or 0..2. */
  wobble?: boolean | number
  /** The trailing edge stretches back as it drains. `true`, `false` or 0..2. */
  lag?: boolean | number
  /** Overlay z-index. Default 2147483000. */
  zIndex?: number
  /** Seed for the first transition's mounds (each one re-rolls). */
  seed?: number
  /** The band is the seam between the pages (`true`, default with the band): the new page
   *  behind it, the old one ahead of it, never a visible swap (View Transitions, else a
   *  clone of the old page). `false`: the page swaps while the band is over the middle. */
  split?: boolean
}

/** Compile-time guards: every page-transition option core grows must be a prop (or adapter-owned). */
type PageTransitionAdapterOwned = 'enabled' | 'reducedMotion'
type PageTransitionUnhandled = Exclude<keyof PageTransitionOptions, keyof GoopPageTransitionProps | PageTransitionAdapterOwned>
const _allPageTransitionOptionsHandled: [PageTransitionUnhandled] extends [never] ? true : { unhandled: PageTransitionUnhandled } = true
void _allPageTransitionOptionsHandled
type PageTransitionPropsListed = Exclude<keyof GoopPageTransitionProps, (typeof PAGE_TRANSITION_PROP_KEYS)[number]>
const _allPageTransitionPropsListed: [PageTransitionPropsListed] extends [never] ? true : { unlisted: PageTransitionPropsListed } = true
void _allPageTransitionPropsListed

/** Page-transition options from props, over app config (`preset`, `reducedMotion`). */
export function toPageTransitionOptions(props: GoopPageTransitionProps, config: GoopOptions = {}): PageTransitionOptions {
  const out: PageTransitionOptions = {
    enabled: props.goo !== false,
    preset: props.preset ?? config.preset,
    reducedMotion: config.reducedMotion,
  }
  for (const k of PAGE_TRANSITION_PROP_KEYS) {
    if (k === 'goo' || k === 'preset') continue
    if (props[k] !== undefined) (out as Record<string, unknown>)[k] = props[k]
  }
  return out
}

// ---- GoopCommand / GoopCombobox -------------------------------------------------------------
// Command: the active item is the menu highlight blob (core `attachMenuHighlight`, found with
// `findCommandHighlight` so filtered-out items are skipped) gliding between items with the
// keyboard and pointer; choosing squishes it (`pop`); the input gets GoopInput's goo focus
// ring (`ring`). GoopCommandDialog adds the dialog's bloom. Combobox: the list is a popper
// that blooms like GoopSelectContent's (same props, minus `bloomFrom`: it always blooms from
// its own center), with the same highlight, pop and check plop.
import {
  COMBOBOX_EFFECTS as _COMBOBOX_EFFECTS,
  COMMAND_EFFECTS as _COMMAND_EFFECTS,
  type ComboboxEffect as _ComboboxEffect,
  type CommandEffect as _CommandEffect,
  type InputOptions as _InputOptions,
} from '@goopui/core'

/** Every GoopCommand engine prop. */
export const COMMAND_PROP_KEYS = [
  'goo',
  ..._COMMAND_EFFECTS,
  'wobble',
  'momentum',
  'followPointer',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopCommand (its input and items read them). Every toggle defaults on. */
export interface GoopCommandProps {
  /** Master switch. `false` renders plain shadcn Command parts. */
  goo?: boolean
  /** The active item is a goo blob that glides between items, following the arrow keys and
   *  the pointer (false: shadcn's flat highlight). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is chosen. */
  pop?: boolean
  /** The search input gets GoopInput's goo focus ring (a GoopCommandInput's own `goo` prop
   *  overrides it). */
  ring?: boolean
  /** Jelly overshoot: the highlight's overshoot and grow-in, and the ring's idle wobble. */
  wobble?: boolean
  /** The highlight stretches and necks toward where it came from as it travels. */
  momentum?: boolean
  /** The highlight's swell follows the pointer with a little lag (keyboard: centred). */
  followPointer?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

// `find` is the adapter's (findCommandHighlight); the ring's own effects are GoopCommandInput props.
type CommandAdapterOwned = 'find' | 'feel' | 'reducedMotion'
type CommandUnhandled = Exclude<keyof MenuHighlightOptions | _CommandEffect, keyof GoopCommandProps | CommandAdapterOwned>
const _allCommandOptionsHandled: [CommandUnhandled] extends [never] ? true : { unhandled: CommandUnhandled } = true
void _allCommandOptionsHandled
type CommandPropsListed = Exclude<keyof GoopCommandProps, (typeof COMMAND_PROP_KEYS)[number]>
const _allCommandPropsListed: [CommandPropsListed] extends [never] ? true : { unlisted: CommandPropsListed } = true
void _allCommandPropsListed

/** Fully resolved command settings (no undefined toggles). */
export interface ResolvedCommandProps extends Required<Omit<GoopCommandProps, 'preset' | 'renderer'>> {
  preset?: GoopPreset
  renderer?: GoopRendererOption
}

const COMMAND_TOGGLES = ['goo', ..._COMMAND_EFFECTS, 'wobble', 'momentum', 'followPointer'] as const

/** Resolve command props over the defaults (every toggle on). */
export function resolveCommandProps(props: GoopCommandProps): ResolvedCommandProps {
  const out = { speed: props.speed ?? 1 } as ResolvedCommandProps
  for (const k of COMMAND_TOGGLES) out[k] = props[k] ?? true
  out.preset = props.preset
  out.renderer = props.renderer
  return out
}

/** Core options for the highlight blob and the input ring, over app config (null when off). */
export function toCommandOptions(
  cmd: ResolvedCommandProps,
  config: GoopOptions = {},
): { highlight: MenuHighlightOptions | null; ring: _InputOptions | null } {
  const common = {
    speed: cmd.speed,
    preset: cmd.preset ?? config.preset,
    renderer: cmd.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  return {
    highlight:
      cmd.goo && cmd.highlight
        ? { ...common, wobble: cmd.wobble, momentum: cmd.momentum, pop: cmd.pop, followPointer: cmd.followPointer }
        : null,
    ring: cmd.goo && cmd.ring ? { ...common, ...(cmd.wobble ? {} : { wobble: false }) } : null,
  }
}

/** Every GoopCommandDialog engine prop: the dialog's bloom (DIALOG_PROP_KEYS) plus the
 *  command's own toggles. */
export const COMMAND_DIALOG_PROP_KEYS = [
  ...DIALOG_PROP_KEYS,
  ..._COMMAND_EFFECTS,
  'momentum',
  'followPointer',
] as const

/** Engine props of GoopCommandDialog: GoopDialogContent's (the panel blooms open) plus
 *  GoopCommand's highlight / pop / ring / momentum / followPointer. `goo`, `wobble`, `speed`,
 *  `preset` and `renderer` drive both. */
export interface GoopCommandDialogProps extends GoopDialogProps {
  /** The command's goo highlight blob (see GoopCommand). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is chosen. */
  pop?: boolean
  /** The search input's goo focus ring. */
  ring?: boolean
  /** The highlight stretches and necks as it travels. */
  momentum?: boolean
  /** The highlight's swell follows the pointer. */
  followPointer?: boolean
}
type CommandDialogOwn = Exclude<keyof GoopCommandDialogProps, keyof GoopDialogProps>
const _commandDialogMatches: [Exclude<CommandDialogOwn, keyof GoopCommandProps>] extends [never] ? true : false = true
void _commandDialogMatches

type CommandDialogPropsListed = Exclude<keyof GoopCommandDialogProps, (typeof COMMAND_DIALOG_PROP_KEYS)[number]>
const _allCommandDialogPropsListed: [CommandDialogPropsListed] extends [never] ? true : { unlisted: CommandDialogPropsListed } = true
void _allCommandDialogPropsListed

/** Every GoopComboboxList engine prop (GoopSelectContent's, minus `bloomFrom`). */
export const COMBOBOX_PROP_KEYS = SELECT_PROP_KEYS.filter((k) => k !== 'bloomFrom') as Exclude<
  (typeof SELECT_PROP_KEYS)[number],
  'bloomFrom'
>[]

/** Engine props of GoopComboboxList: the same as GoopSelectContent's (bloom open, highlight
 *  blob, select pop, check plop), except the list always blooms from its own center. */
export type GoopComboboxProps = Omit<GoopSelectProps, 'bloomFrom'>

type ComboboxUnhandled = Exclude<
  keyof EmergeOptions | keyof MenuHighlightOptions | keyof SelectPlopOptions | _ComboboxEffect,
  keyof GoopComboboxProps | MenuAdapterOwned
>
const _allComboboxOptionsHandled: [ComboboxUnhandled] extends [never] ? true : { unhandled: ComboboxUnhandled } = true
void _allComboboxOptionsHandled
void _COMBOBOX_EFFECTS

/** Resolve combobox list props over the defaults. */
export function resolveComboboxProps(props: GoopComboboxProps): ResolvedSelectProps {
  return resolveSelectProps({ ...props, bloomFrom: 'center' })
}

/** Core options for the combobox list (emerge), highlight and plop, over app config. */
export function toComboboxOptions(
  combobox: ResolvedSelectProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: MenuHighlightOptions | null; plop: SelectPlopOptions | null } {
  return toSelectOptions(combobox, config)
}

// ---- GoopNumberField -----------------------------------------------------------------------
// Core `attachNumberField`: the Input's ring (INPUT_EFFECTS) plus the steppers' squish and
// nudge (NUMBER_FIELD_EFFECTS), and speed / preset / renderer.

type NumberFieldAdapterOwned = 'invalid' | 'reducedMotion'
export type GoopNumberFieldEngineKey = NumberFieldEffect | 'speed' | 'preset' | 'renderer'
type NumberFieldUnhandled = Exclude<keyof NumberFieldOptions, GoopNumberFieldEngineKey | NumberFieldAdapterOwned>
const _allNumberFieldOptionsHandled: [NumberFieldUnhandled] extends [never] ? true : { unhandled: NumberFieldUnhandled } = true
void _allNumberFieldOptionsHandled

export type GoopNumberFieldPropsDefinition = EffectPropsDefinition<NumberFieldEffect>
export type GoopNumberFieldPropsInput = InputOf<GoopNumberFieldPropsDefinition>
/** Spread into `defineProps({ ...goopNumberFieldProps, ... })`. */
export const goopNumberFieldProps = effectEngineProps(NUMBER_FIELD_EFFECTS) as unknown as GoopNumberFieldPropsDefinition

/** Number field options from props, over app config. */
export function toNumberFieldOptions(props: GoopNumberFieldPropsInput, config: GoopOptions = {}): NumberFieldOptions {
  return toEffectOptions(NUMBER_FIELD_EFFECTS, props, config)
}

// ---- GoopInputOTP --------------------------------------------------------------------------
// Core `attachInputOTP`: OTP_EFFECTS (flood, flow, wobble, pulse) plus speed / preset / renderer.

type InputOTPAdapterOwned = 'reducedMotion'
export type GoopInputOTPEngineKey = OtpEffect | 'speed' | 'preset' | 'renderer'
type InputOTPUnhandled = Exclude<keyof InputOTPOptions, GoopInputOTPEngineKey | InputOTPAdapterOwned>
const _allInputOTPOptionsHandled: [InputOTPUnhandled] extends [never] ? true : { unhandled: InputOTPUnhandled } = true
void _allInputOTPOptionsHandled

export type GoopInputOTPPropsDefinition = EffectPropsDefinition<OtpEffect>
export type GoopInputOTPPropsInput = InputOf<GoopInputOTPPropsDefinition>
/** Spread into `defineProps({ ...goopInputOTPProps, ... })`. */
export const goopInputOTPProps = effectEngineProps(OTP_EFFECTS) as unknown as GoopInputOTPPropsDefinition

/** Input OTP options from props, over app config. */
export function toInputOTPOptions(props: GoopInputOTPPropsInput, config: GoopOptions = {}): InputOTPOptions {
  return toEffectOptions(OTP_EFFECTS, props, config)
}

// ---- GoopHoverCard --------------------------------------------------------------------------
// The card is an emerge surface like GoopPopoverContent (same engine, feel and toggles) that
// blooms from the side facing its trigger (`bloomFrom: 'trigger'`: core clamps the trigger's
// center onto the card's near edge) and shrinks back into it. Surface defaults to 'popover':
// a hover card's trigger is usually a link with no background of its own.

/** Every GoopHoverCardContent engine prop. */
export const HOVER_CARD_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  'bloomFrom',
  ...EMERGE_EFFECT_KEYS,
  ...EMERGE_DRIP_KEYS,
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopHoverCardContent. Every toggle defaults on. */
export interface GoopHoverCardProps {
  /** Master switch. `false` renders a plain shadcn HoverCardContent. */
  goo?: boolean
  /** Flow open (default true) in `flowStyle`. `false`: the card inflates from a bulb at the
   *  trigger edge (`bridge` / `momentum` apply). */
  flow?: boolean
  /** 'bloom' (default: pools from `bloomFrom`, spreads with a lobed edge, overshoots and
   *  splashes, shrinks back on close) or 'neck' (out of the trigger through a thick neck). */
  flowStyle?: EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Where the bloom starts: 'trigger' (default: the card's edge facing the trigger) or
   *  'center' (the card's own center, like GoopPopoverContent). */
  bloomFrom?: HoverCardBloomFrom
  /** Bulb + lumpy neck between trigger and card (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot and wobble (bloom: the open overshoot and settle). */
  wobble?: boolean
  /** Momentum launch away from the trigger (not used by bloom). */
  momentum?: boolean
  /** Content fades in once the goo settles. */
  fade?: boolean
  /** Open: every edge bulges past rest, rebounds and wobbles. `true`, `false` or 0..2. */
  openSlosh?: boolean | number
  /** Open: the all-around splash (drops kept off the trigger). `true`, `false` or 0..2. */
  openDrips?: boolean | number
  /** Burst drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges (re-rolled every open). Default 1. */
  sloshVariety?: number
  /** Close: the card pulls in and wobbles before it shrinks back. `true`, `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Card color: 'popover' (default: shadcn's popover tokens), 'trigger' or a CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every emerge option core grows must be a hover-card prop (or adapter-owned). */
type HoverCardAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type HoverCardUnhandled = Exclude<keyof EmergeOptions, keyof GoopHoverCardProps | HoverCardAdapterOwned>
const _allHoverCardOptionsHandled: [HoverCardUnhandled] extends [never] ? true : { unhandled: HoverCardUnhandled } = true
void _allHoverCardOptionsHandled
type HoverCardPropsListed = Exclude<keyof GoopHoverCardProps, (typeof HOVER_CARD_PROP_KEYS)[number]>
const _allHoverCardPropsListed: [HoverCardPropsListed] extends [never] ? true : { unlisted: HoverCardPropsListed } = true
void _allHoverCardPropsListed

/** Emerge options for a hover card over app config (`bloomOrigin` comes from the adapter). */
export function toHoverCardOptions(props: GoopHoverCardProps, config: GoopOptions = {}): EmergeOptions {
  return {
    flow: props.flow !== false,
    flowStyle: props.flowStyle ?? 'bloom',
    bloomStart: props.bloomStart ?? 'single',
    bridge: props.bridge !== false,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    fade: props.fade !== false,
    openSlosh: props.openSlosh ?? true,
    openDrips: props.openDrips ?? true,
    closeSlosh: props.closeSlosh ?? true,
    openDripAmount: props.openDripAmount,
    openDripSize: props.openDripSize,
    openDripFling: props.openDripFling,
    openDripVariety: props.openDripVariety,
    sloshVariety: props.sloshVariety,
    surfaceColor: props.surface ?? 'popover',
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

// ---- GoopContextMenu ------------------------------------------------------------------------
// The dropdown menu's goo (emerge panel + highlight blob + select pop + goo submenus) with no
// trigger box: the root panel blooms detached from the right-click point (`bloomFrom:
// 'pointer'`, core `attachContextPoint`), so `flow` / `flowStyle` / `bridge` don't apply
// (always the bloom). Submenus bloom out of their parent item. Surface defaults to 'popover'
// (the trigger is an area, not a button). `undefined` toggles inherit from the parent menu.

/** Every GoopContextMenuContent / SubContent engine prop. */
export const CONTEXT_MENU_PROP_KEYS = [
  'goo',
  'bloomStart',
  'bloomFrom',
  'wobble',
  'momentum',
  'fade',
  'openSlosh',
  'openDrips',
  'closeSlosh',
  ...EMERGE_DRIP_KEYS,
  ...MENU_EFFECTS,
  'followPointer',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopContextMenuContent / GoopContextMenuSubContent. Same meaning as
 *  GoopDropdownMenuContent's, except as noted. */
export interface GoopContextMenuProps extends Omit<GoopMenuProps, 'flow' | 'flowStyle' | 'bridge'> {
  /** Where the bloom starts: 'pointer' (default: the right-click / long-press point; a
   *  submenu: its parent item) or 'center' (the panel's own center). */
  bloomFrom?: ContextMenuBloomFrom
  /** Panel color: 'popover' (default: shadcn's popover tokens), 'trigger' (the trigger
   *  area's colors) or any CSS color. Submenus that leave it unset reuse their parent's. */
  surface?: EmergeSurfaceColor
}

/** Compile-time guards. `flow` / `flowStyle` / `bridge` are fixed by the adapter (always
 *  bloom), `detached` / `bloomOrigin` come from `bloomFrom`. */
type ContextMenuAdapterOwned = MenuAdapterOwned | 'flow' | 'flowStyle' | 'bridge'
type ContextMenuUnhandled = Exclude<
  keyof EmergeOptions | keyof MenuHighlightOptions | MenuEffect,
  keyof GoopContextMenuProps | ContextMenuAdapterOwned
>
const _allContextMenuOptionsHandled: [ContextMenuUnhandled] extends [never] ? true : { unhandled: ContextMenuUnhandled } = true
void _allContextMenuOptionsHandled
type ContextMenuPropsListed = Exclude<keyof GoopContextMenuProps, (typeof CONTEXT_MENU_PROP_KEYS)[number]>
const _allContextMenuPropsListed: [ContextMenuPropsListed] extends [never] ? true : { unlisted: ContextMenuPropsListed } = true
void _allContextMenuPropsListed

/** Fully resolved context-menu settings. */
export interface ResolvedContextMenuProps extends ResolvedMenuProps {
  bloomFrom: ContextMenuBloomFrom
}

/** Resolve context-menu props over a parent menu's (submenus) or the defaults. */
export function resolveContextMenuProps(props: GoopContextMenuProps, parent?: ResolvedContextMenuProps | null): ResolvedContextMenuProps {
  const surface = props.surface ?? parent?.surface ?? 'popover'
  const m = resolveMenuProps({ ...props, flow: true, flowStyle: 'bloom', bridge: true, surface }, parent)
  return { ...m, bloomFrom: props.bloomFrom ?? parent?.bloomFrom ?? 'pointer' }
}

/** Core options for a context-menu panel (emerge) and its highlight, over app config. */
export function toContextMenuOptions(
  menu: ResolvedContextMenuProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: MenuHighlightOptions | null } {
  return toMenuOptions(menu, config)
}

// ---- GoopSkeleton / GoopBadge / GoopAvatar / GoopCard (the static set) ----------------------
// Cheap, calm effects. Skeleton `shimmer`, Badge `swell` and Avatar `settle` are CSS-only
// (core's skeletonStyle / badgeStyle / avatarStyle resolve the feel into CSS vars); Card's
// edge `swell` is core's `attachCard`, off unless `goo` is set. Each effect takes a boolean
// or a multiplier, plus speed / preset.

/** Every static-set engine prop, per component. */
export const SKELETON_PROP_KEYS = [...SKELETON_EFFECTS, 'speed', 'preset'] as const
export const BADGE_PROP_KEYS = [...BADGE_EFFECTS, 'speed', 'preset'] as const
export const AVATAR_PROP_KEYS = [...AVATAR_EFFECTS, 'speed', 'preset'] as const
export const CARD_PROP_KEYS = ['goo', ...CARD_EFFECTS, 'speed', 'preset'] as const
export const SKELETON_REVEAL_PROP_KEYS = [...SKELETON_REVEAL_EFFECTS, 'speed', 'preset'] as const

type StaticEffectProps<E extends string> = { [K in E]: PropDef<boolean | number> } & {
  speed: PropDef<number>
  preset: PropDef<GoopPreset>
}
const staticEffectProps = (effects: readonly string[]): Record<string, PropDef<never>> =>
  Object.freeze({
    ...Object.fromEntries(effects.map((k) => [k, def([Boolean, Number])])),
    speed: def(Number),
    preset: def(String),
  })

export type GoopSkeletonPropsDefinition = StaticEffectProps<SkeletonEffect>
export type GoopSkeletonPropsInput = InputOf<GoopSkeletonPropsDefinition>
export type GoopBadgePropsDefinition = StaticEffectProps<BadgeEffect>
export type GoopBadgePropsInput = InputOf<GoopBadgePropsDefinition>
export type GoopAvatarPropsDefinition = StaticEffectProps<AvatarEffect>
export type GoopAvatarPropsInput = InputOf<GoopAvatarPropsDefinition>
export type GoopCardPropsDefinition = StaticEffectProps<CardEffect>
export type GoopCardPropsInput = InputOf<GoopCardPropsDefinition> & { goo?: boolean }
export type GoopSkeletonRevealPropsDefinition = StaticEffectProps<SkeletonRevealEffect>
export type GoopSkeletonRevealPropsInput = InputOf<GoopSkeletonRevealPropsDefinition>

/** Spread into `defineProps({ ...goopSkeletonProps, ... })` (likewise badge / avatar / card). */
export const goopSkeletonProps = staticEffectProps(SKELETON_EFFECTS) as unknown as GoopSkeletonPropsDefinition
export const goopBadgeProps = staticEffectProps(BADGE_EFFECTS) as unknown as GoopBadgePropsDefinition
export const goopAvatarProps = staticEffectProps(AVATAR_EFFECTS) as unknown as GoopAvatarPropsDefinition
/** GoopSkeletonReveal: `sheen` (the flowing sheen and its goo bridges), `breathe` (the
 *  loading wobble), `melt` (the reveal; `false`: a plain cross-fade), speed, preset. */
export const goopSkeletonRevealProps = staticEffectProps(SKELETON_REVEAL_EFFECTS) as unknown as GoopSkeletonRevealPropsDefinition
export const goopCardProps = Object.freeze({
  ...(staticEffectProps(CARD_EFFECTS) as unknown as GoopCardPropsDefinition),
  /** Master switch for the edge swell. Off by default: a card is static. */
  goo: { type: Boolean, default: false },
})

/** Compile-time guards: every option core grows must be a prop (or adapter-owned). */
type StaticAdapterOwned = 'reducedMotion'
type SkeletonUnhandled = Exclude<keyof SkeletonOptions, keyof GoopSkeletonPropsDefinition | StaticAdapterOwned>
const _allSkeletonOptionsHandled: [SkeletonUnhandled] extends [never] ? true : { unhandled: SkeletonUnhandled } = true
void _allSkeletonOptionsHandled
type BadgeUnhandled = Exclude<keyof BadgeOptions, keyof GoopBadgePropsDefinition | StaticAdapterOwned>
const _allBadgeOptionsHandled: [BadgeUnhandled] extends [never] ? true : { unhandled: BadgeUnhandled } = true
void _allBadgeOptionsHandled
type AvatarUnhandled = Exclude<keyof AvatarOptions, keyof GoopAvatarPropsDefinition | StaticAdapterOwned>
const _allAvatarOptionsHandled: [AvatarUnhandled] extends [never] ? true : { unhandled: AvatarUnhandled } = true
void _allAvatarOptionsHandled
type CardUnhandled = Exclude<keyof CardOptions, keyof GoopCardPropsDefinition | StaticAdapterOwned>
const _allCardOptionsHandled: [CardUnhandled] extends [never] ? true : { unhandled: CardUnhandled } = true
void _allCardOptionsHandled
type SkeletonRevealUnhandled = Exclude<keyof SkeletonRevealOptions, keyof GoopSkeletonRevealPropsDefinition | StaticAdapterOwned>
const _allSkeletonRevealOptionsHandled: [SkeletonRevealUnhandled] extends [never] ? true : { unhandled: SkeletonRevealUnhandled } = true
void _allSkeletonRevealOptionsHandled

function toStaticOptions<E extends string>(
  effects: readonly E[],
  props: InputOf<StaticEffectProps<E>>,
  config: GoopOptions,
): { [K in E]?: boolean | number } & { speed?: number; preset?: GoopPreset; reducedMotion?: boolean | 'auto' } {
  const out: Record<string, unknown> = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.speed !== undefined) out.speed = props.speed
  for (const k of effects) {
    const v = (props as Record<string, unknown>)[k]
    if (v !== undefined) out[k] = v
  }
  return out as never
}

/** Skeleton / badge / avatar / card options from props, over app config. */
export const toSkeletonOptions = (props: GoopSkeletonPropsInput, config: GoopOptions = {}): SkeletonOptions =>
  toStaticOptions(SKELETON_EFFECTS, props, config)
export const toBadgeOptions = (props: GoopBadgePropsInput, config: GoopOptions = {}): BadgeOptions =>
  toStaticOptions(BADGE_EFFECTS, props, config)
export const toAvatarOptions = (props: GoopAvatarPropsInput, config: GoopOptions = {}): AvatarOptions =>
  toStaticOptions(AVATAR_EFFECTS, props, config)
export const toSkeletonRevealOptions = (props: GoopSkeletonRevealPropsInput, config: GoopOptions = {}): SkeletonRevealOptions =>
  toStaticOptions(SKELETON_REVEAL_EFFECTS, props, config)
/** Card options, or null when the goo is off (the default). */
export const toCardOptions = (props: GoopCardPropsInput, config: GoopOptions = {}): CardOptions | null =>
  props.goo ? toStaticOptions(CARD_EFFECTS, props, config) : null

import {
  AVATAR_EFFECTS,
  BADGE_EFFECTS,
  CARD_EFFECTS,
  SKELETON_EFFECTS,
  SKELETON_REVEAL_EFFECTS,
  type AvatarEffect,
  type AvatarOptions,
  type BadgeEffect,
  type BadgeOptions,
  type CardEffect,
  type CardOptions,
  type SkeletonEffect,
  type SkeletonOptions,
  type SkeletonRevealEffect,
  type SkeletonRevealOptions,
} from '@goopui/core'

// ---- GoopSidebar ----------------------------------------------------------------------------
// Core's SIDEBAR_EFFECTS, each a GoopSidebar prop: `highlight` (the menu's goo blob glides
// between items under the cursor: core `attachSidebarHighlight`), `pill` (the active item's
// soft filled pill), `slosh` (the inner edge sloshes as the sidebar collapses / expands: core
// `attachSidebarEdge`; `true`, `false` or 0..2), `travel` (the collapse / expand has the
// Drawer's momentum: core `sidebarMotionCurve`), `submenus` (GoopCollapsible sub-menus spring
// open; their row stays unfilled), `pour` (a sub-menu's guide line pours down behind a goo
// bead), `tooltips` (icon-mode tooltips are GoopTooltips), `drawer` (the mobile sidebar is a
// GoopDrawer), `bloom` (with `drawer` off, the mobile sheet blooms like GoopSheet).
// `goo: false` is a plain shadcn Sidebar.

/** Every GoopSidebar engine prop. */
export const SIDEBAR_PROP_KEYS = ['goo', ...SIDEBAR_EFFECTS, 'followPointer', 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopSidebar. */
export interface GoopSidebarProps {
  /** Master switch. `false` renders a plain shadcn Sidebar (every effect off). */
  goo?: boolean
  /** Hover / focus highlight is a goo blob that glides between items (false: shadcn's flat hover bg). */
  highlight?: boolean
  /** The active item gets a soft filled pill (false: shadcn's flat active bg). */
  pill?: boolean
  /** The inner edge sloshes in low, wide mounds as the sidebar collapses or expands. `true`, `false` or 0..2. */
  slosh?: boolean | number
  /** Collapse / expand with the Drawer's momentum: a fast launch into a small landing overshoot, and a collapse that accelerates away (false: shadcn's 200ms linear). */
  travel?: boolean
  /** GoopCollapsible sub-menus inside spring open, their row unfilled (false: plain collapsibles). */
  submenus?: boolean
  /** An opening sub-menu's guide line pours down behind a goo bead that melts into it (needs `submenus`). */
  pour?: boolean
  /** Icon-mode tooltips bloom as goo (false: shadcn tooltips). */
  tooltips?: boolean
  /** The mobile sidebar is a GoopDrawer: panel and goo one body, a fast launch with a small landing overshoot, a close that accelerates away, swipe to close (false: a GoopSheet). */
  drawer?: boolean
  /** With `drawer` off, the mobile sheet blooms from its screen edge like GoopSheet (false: shadcn's slide). */
  bloom?: boolean
  /** The highlight's soft swell follows the cursor along the item (false: centred). */
  followPointer?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every sidebar option core grows must be a prop (or adapter-owned). */
type SidebarAdapterOwned = 'side' | 'reducedMotion' | 'feel' | 'seed' | 'wobble' | 'momentum' | 'pop'
type SidebarUnhandled = Exclude<
  keyof SidebarEdgeOptions | keyof SidebarHighlightOptions | SidebarEffect,
  keyof GoopSidebarProps | SidebarAdapterOwned
>
const _allSidebarOptionsHandled: [SidebarUnhandled] extends [never] ? true : { unhandled: SidebarUnhandled } = true
void _allSidebarOptionsHandled
type SidebarPropsListed = Exclude<keyof GoopSidebarProps, (typeof SIDEBAR_PROP_KEYS)[number]>
const _allSidebarPropsListed: [SidebarPropsListed] extends [never] ? true : { unlisted: SidebarPropsListed } = true
void _allSidebarPropsListed

/** Resolved sidebar goo: what each part of the sidebar should do. */
export interface ResolvedSidebarGoo {
  /** Highlight blob options, or null (shadcn's flat hover bg). */
  highlight: SidebarHighlightOptions | null
  /** Edge slosh options, or null (off). */
  edge: SidebarEdgeOptions | null
  pill: boolean
  travel: boolean
  submenus: boolean
  pour: boolean
  tooltips: boolean
  drawer: boolean
  bloom: boolean
  /** App-config reduced motion (true / false force it; else the OS / site switch). */
  reducedMotion?: boolean | 'auto'
  speed?: number
  preset?: GoopPreset
  renderer?: GoopRendererOption
}

/** Sidebar goo from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toSidebarOptions(props: GoopSidebarProps, config: GoopOptions = {}): ResolvedSidebarGoo {
  const on = props.goo !== false
  const common = {
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  const slosh = props.slosh ?? true
  return {
    highlight: on && props.highlight !== false ? { ...common, followPointer: props.followPointer !== false } : null,
    edge: on && slosh !== false && slosh !== 0 ? { ...common, slosh } : null,
    pill: on && props.pill !== false,
    travel: on && props.travel !== false,
    submenus: on && props.submenus !== false,
    pour: on && props.submenus !== false && props.pour !== false,
    tooltips: on && props.tooltips !== false,
    drawer: on && props.drawer !== false,
    bloom: on && props.bloom !== false,
    reducedMotion: config.reducedMotion,
    speed: common.speed,
    preset: common.preset,
    renderer: common.renderer,
  }
}

import { SIDEBAR_EFFECTS, type SidebarEdgeOptions, type SidebarEffect, type SidebarHighlightOptions } from '@goopui/core'

// ---- GoopMenubar ----------------------------------------------------------------------------
// The bar's trigger highlight is ONE goo body (core `attachMenubarHighlight`: the menu
// highlight engine fed MENUBAR_FEEL, the tabs feel) that flows between triggers as you hover or
// arrow across them and sits on the open trigger. Each menu is GoopDropdownMenuContent's goo
// (emerge bloom + item highlight + select pop + goo submenus), on reka's Menubar parts.
// Menu props left unset inherit the bar's `goo`, `wobble`, `momentum`, `speed`, `preset` and
// `renderer`; submenus inherit their parent menu's. Surface defaults to 'popover' (menubar
// triggers are flat text, not a filled button).

/** Every GoopMenubar engine prop (the trigger highlight). */
export const MENUBAR_PROP_KEYS = ['goo', ...MENUBAR_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopMenubar (the bar). */
export interface GoopMenubarProps {
  /** Master switch. `false` renders plain shadcn Menubar parts (menus too, unless they set
   *  their own `goo`). */
  goo?: boolean
  /** The trigger highlight (hover, keyboard focus, open menu) is one goo body that flows
   *  between triggers (false: shadcn's flat hover / open bg). */
  highlight?: boolean
  /** Jelly overshoot when the highlight lands (menus inherit it). */
  wobble?: boolean
  /** Momentum: the highlight stretches and necks to a trailing tail while it travels (menus
   *  inherit it). */
  momentum?: boolean
  /** Animation speed multiplier (menus inherit it). */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful.
   *  Menus inherit it. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory (menus inherit it). */
  renderer?: GoopRendererOption
}

type MenubarAdapterOwned = 'feel' | 'reducedMotion'
type MenubarUnhandled = Exclude<keyof MenubarHighlightOptions | MenubarEffect, keyof GoopMenubarProps | MenubarAdapterOwned>
const _allMenubarOptionsHandled: [MenubarUnhandled] extends [never] ? true : { unhandled: MenubarUnhandled } = true
void _allMenubarOptionsHandled
type MenubarPropsListed = Exclude<keyof GoopMenubarProps, (typeof MENUBAR_PROP_KEYS)[number]>
const _allMenubarPropsListed: [MenubarPropsListed] extends [never] ? true : { unlisted: MenubarPropsListed } = true
void _allMenubarPropsListed

/** Trigger highlight options for core over app config, or null when it is off. */
export function toMenubarOptions(props: GoopMenubarProps, config: GoopOptions = {}): MenubarHighlightOptions | null {
  if (props.goo === false || props.highlight === false) return null
  return {
    feel: MENUBAR_FEEL,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

/** Every GoopMenubarContent / SubContent engine prop (same as GoopDropdownMenuContent's). */
export const MENUBAR_MENU_PROP_KEYS = MENU_PROP_KEYS

/** Engine props of GoopMenubarContent / GoopMenubarSubContent. Same meaning as
 *  GoopDropdownMenuContent's, except as noted. */
export interface GoopMenubarMenuProps extends Omit<GoopMenuProps, 'surface'> {
  /** Menu color: 'popover' (default: shadcn's popover tokens), 'trigger' (the trigger's
   *  colors) or any CSS color. Submenus that leave it unset reuse their parent's. */
  surface?: EmergeSurfaceColor
}

/** Resolve a menubar menu's props over its parent menu's (submenus), else over the bar's
 *  shared settings, then the defaults. */
export function resolveMenubarMenuProps(
  props: GoopMenubarMenuProps,
  parent?: ResolvedMenuProps | null,
  bar?: GoopMenubarProps | null,
): ResolvedMenuProps {
  const base =
    parent ??
    resolveMenuProps({
      goo: bar?.goo,
      wobble: bar?.wobble,
      momentum: bar?.momentum,
      speed: bar?.speed,
      preset: bar?.preset,
      renderer: bar?.renderer,
      surface: 'popover',
    })
  return resolveMenuProps(props, base)
}

/** Core options for a menubar menu (emerge) and its item highlight, over app config. */
export function toMenubarMenuOptions(
  menu: ResolvedMenuProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: MenuHighlightOptions | null } {
  return toMenuOptions(menu, config)
}

// ---- GoopNavigationMenu ---------------------------------------------------------------------
// Two engines, set on the root and shared by its parts: the top-level items' hover / focus /
// open highlight is one goo blob (core `attachNavigationMenuHighlight`, the tabs indicator's
// feel on the menu highlight engine; the links inside a panel get the same blob with the
// menu's feel), and the viewport is an emerge bloom out of the active trigger whose box
// jelly-springs between triggers (core `attachNavigationMenuViewport`). Toggles come from core's
// NAVIGATION_MENU_EFFECTS plus the bloom's emerge knobs; all default on.

/** Every GoopNavigationMenu engine prop. */
export const NAVIGATION_MENU_PROP_KEYS = [
  'goo',
  ...NAVIGATION_MENU_EFFECTS,
  'fade',
  'openSlosh',
  'openDrips',
  'closeSlosh',
  ...EMERGE_DRIP_KEYS,
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopNavigationMenu. Every toggle defaults on. */
export interface GoopNavigationMenuProps {
  /** Master switch. `false` renders a plain shadcn NavigationMenu. */
  goo?: boolean
  /** The top-level items' hover / open background is one goo blob that flows between them. */
  highlight?: boolean
  /** The links inside a panel get the same goo blob (false: shadcn's flat hover bg). */
  contentHighlight?: boolean
  /** The panel is a goo body that blooms out of its trigger and shrinks back into it (false:
   *  shadcn's zoom; `jelly` then has nothing to move). */
  bloom?: boolean
  /** Moving to another trigger, the panel slides and resizes on a spring as one body (false:
   *  it jumps to the new size, like shadcn). */
  jelly?: boolean
  /** Overshoot: the blob lands with a jelly bounce, the bloom overshoots, the panel wobbles as
   *  it settles. */
  wobble?: boolean
  /** Momentum: the highlight stretches and necks to a trailing tail while it travels. */
  momentum?: boolean
  /** The panel's content fades in once the goo settles. */
  fade?: boolean
  /** Open: every edge of the panel bulges past rest, rebounds and wobbles. `true`, `false` or 0..2. */
  openSlosh?: boolean | number
  /** Open: a light splash of drops (kept off the menu bar). `true`, `false` or 0..2. */
  openDrips?: boolean | number
  /** Burst drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges (re-rolled every open). Default 1. */
  sloshVariety?: number
  /** Close: the panel pulls in and wobbles before it shrinks back. `true`, `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Panel color: 'popover' (default: shadcn's popover tokens), 'trigger' or a CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every option core grows must be a navigation menu prop (or adapter-owned). */
type NavigationMenuAdapterOwned =
  | 'anchor'
  | 'side'
  | 'ready'
  | 'surface'
  | 'surfaceColor'
  | 'feel'
  | 'jellyFeel'
  | 'target'
  | 'reducedMotion'
  | 'detached'
  | 'bloomOrigin'
  | 'flow'
  | 'flowStyle'
  | 'bloomStart'
  | 'bridge'
type NavigationMenuUnhandled = Exclude<
  keyof NavigationMenuViewportOptions | keyof NavigationMenuHighlightOptions | NavigationMenuEffect,
  keyof GoopNavigationMenuProps | NavigationMenuAdapterOwned
>
const _allNavigationMenuOptionsHandled: [NavigationMenuUnhandled] extends [never] ? true : { unhandled: NavigationMenuUnhandled } = true
void _allNavigationMenuOptionsHandled
type NavigationMenuPropsListed = Exclude<keyof GoopNavigationMenuProps, (typeof NAVIGATION_MENU_PROP_KEYS)[number]>
const _allNavigationMenuPropsListed: [NavigationMenuPropsListed] extends [never] ? true : { unlisted: NavigationMenuPropsListed } = true
void _allNavigationMenuPropsListed

/** Resolved navigation menu goo: what each part should do (null: that part is plain shadcn). */
export interface ResolvedNavigationMenuGoo {
  /** Top-level highlight options, or null. */
  highlight: NavigationMenuHighlightOptions | null
  /** Panel link highlight options, or null. */
  contentHighlight: NavigationMenuHighlightOptions | null
  /** Viewport (and `viewport: false` panel) options, or null. */
  viewport: NavigationMenuViewportOptions | null
}

/** Navigation menu goo from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toNavigationMenuOptions(props: GoopNavigationMenuProps, config: GoopOptions = {}): ResolvedNavigationMenuGoo {
  const on = props.goo !== false
  const common = {
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  return {
    highlight: on && props.highlight !== false ? { ...common, feel: NAVIGATION_MENU_FEEL } : null,
    contentHighlight: on && props.contentHighlight !== false ? { ...common, feel: NAVIGATION_MENU_CONTENT_FEEL } : null,
    viewport:
      on && props.bloom !== false
        ? {
            ...common,
            flow: true,
            flowStyle: 'bloom',
            bloomStart: 'single',
            bridge: true,
            jelly: props.jelly !== false,
            fade: props.fade !== false,
            openSlosh: props.openSlosh ?? true,
            openDrips: props.openDrips ?? true,
            closeSlosh: props.closeSlosh ?? true,
            openDripAmount: props.openDripAmount,
            openDripSize: props.openDripSize,
            openDripFling: props.openDripFling,
            openDripVariety: props.openDripVariety,
            sloshVariety: props.sloshVariety,
            surfaceColor: props.surface ?? 'popover',
          }
        : null,
  }
}

import {
  NAVIGATION_MENU_CONTENT_FEEL,
  NAVIGATION_MENU_EFFECTS,
  NAVIGATION_MENU_FEEL,
  type NavigationMenuEffect,
  type NavigationMenuHighlightOptions,
  type NavigationMenuViewportOptions,
} from '@goopui/core'

// ---- GoopCarousel ---------------------------------------------------------------------------
// Core's CAROUSEL_EFFECTS, each a GoopCarousel prop (all default on; `true`, `false` or a 0..2
// strength for the slide effects): `stretch` (slides stretch along the motion with momentum and
// wobble when they snap), `slosh` (slide edges slosh in low, wide mounds with the velocity),
// `rubberBand` (dragging past the first / last slide: its outer edge reaches back as one low,
// wide mound), all three core `attachCarousel` fed embla's motion; `squish` (Previous / Next
// are squishy GoopButtons; false: plain shadcn buttons); `dots` (GoopCarouselDots' active blob
// flows between dots: core `attachCarouselDots`; false: flat dots). `goo: false` is a plain
// shadcn Carousel. The parts read every prop from the carousel.

/** Every GoopCarousel engine prop. */
export const CAROUSEL_PROP_KEYS = ['goo', ...CAROUSEL_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopCarousel (its parts read them from the carousel). */
export interface GoopCarouselProps {
  /** Master switch. `false` renders a plain shadcn Carousel (every effect off). */
  goo?: boolean
  /** Slides stretch a little along the motion with momentum and wobble on the snap. `true`, `false` or 0..2. */
  stretch?: boolean | number
  /** Slide edges slosh in low, wide mounds as they scroll and snap. `true`, `false` or 0..2. */
  slosh?: boolean | number
  /** Dragging past the first / last slide: its outer edge reaches back as one low, wide mound. `true`, `false` or 0..2. */
  rubberBand?: boolean | number
  /** Previous / Next squish like GoopButton (false: plain shadcn buttons). */
  squish?: boolean
  /** GoopCarouselDots: the active dot is a goo blob that flows between dots (false: flat dots). */
  dots?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** Renderer of the dots blob: 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every carousel option core grows must be a prop (or adapter-owned). */
type CarouselAdapterOwned = 'axis' | 'overscroll' | 'reducedMotion' | 'feel' | 'seed' | 'wobble' | 'momentum'
type CarouselUnhandled = Exclude<
  keyof CarouselOptions | keyof CarouselDotsOptions | CarouselEffect,
  keyof GoopCarouselProps | CarouselAdapterOwned
>
const _allCarouselOptionsHandled: [CarouselUnhandled] extends [never] ? true : { unhandled: CarouselUnhandled } = true
void _allCarouselOptionsHandled
type CarouselPropsListed = Exclude<keyof GoopCarouselProps, (typeof CAROUSEL_PROP_KEYS)[number]>
const _allCarouselPropsListed: [CarouselPropsListed] extends [never] ? true : { unlisted: CarouselPropsListed } = true
void _allCarouselPropsListed

/** Resolved carousel goo: what each part of the carousel should do. */
export interface ResolvedCarouselGoo {
  /** Slide goo options (without `axis` / `overscroll`, the adapter's), or null (all off). */
  slides: Omit<CarouselOptions, 'axis' | 'overscroll'> | null
  /** GoopButton props of Previous / Next (`goo: false` when the squish is off). */
  button: GoopPropsInput & { goo?: boolean }
  /** Dots blob options, or null (flat dots). */
  dots: CarouselDotsOptions | null
  /** Reduced motion forced by app config (`true` / `false`), else 'auto'. */
  reducedMotion: boolean | 'auto'
}

const carouselStrength = (v: boolean | number | undefined): boolean | number => (v === undefined ? true : v)
const carouselOff = (v: boolean | number): boolean => v === false || v === 0

/** Carousel goo from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toCarouselOptions(props: GoopCarouselProps, config: GoopOptions = {}): ResolvedCarouselGoo {
  const on = props.goo !== false
  const preset = props.preset ?? config.preset
  const common = { speed: props.speed ?? 1, preset, reducedMotion: config.reducedMotion }
  const stretch = carouselStrength(props.stretch)
  const slosh = carouselStrength(props.slosh)
  const rubberBand = carouselStrength(props.rubberBand)
  const anySlide = !carouselOff(stretch) || !carouselOff(slosh) || !carouselOff(rubberBand)
  const button: GoopPropsInput & { goo?: boolean } = {}
  if (!on || props.squish === false) button.goo = false
  if (preset !== undefined) button.preset = preset
  if (props.speed !== undefined) button.timeScale = props.speed
  return {
    slides: on && anySlide ? { ...common, stretch, slosh, rubberBand } : null,
    button,
    dots: on && props.dots !== false ? { ...common, feel: CAROUSEL_DOTS_FEEL, wobble: true, momentum: true, renderer: props.renderer ?? config.renderer } : null,
    reducedMotion: config.reducedMotion ?? 'auto',
  }
}

import {
  CAROUSEL_DOTS_FEEL,
  CAROUSEL_EFFECTS,
  type CarouselDotsOptions,
  type CarouselEffect,
  type CarouselOptions,
} from '@goopui/core'

// ---- GoopAlert ------------------------------------------------------------------------------
// The entrance (core `attachAlert`): when the alert mounts or appears its body blooms out of
// its top edge in a low, wide mound and settles (`bloom`); its icon gets one gentle jelly
// wobble (`wobble`). Each takes a boolean or a multiplier, plus speed / preset; `goo: false`
// renders a plain shadcn Alert. Nothing loops.

/** Every GoopAlert engine prop. */
export const ALERT_PROP_KEYS = ['goo', ...ALERT_EFFECTS, 'speed', 'preset'] as const

export type GoopAlertPropsDefinition = StaticEffectProps<AlertEffect> & { goo: { type: PropType<boolean>; default: boolean } }
export type GoopAlertPropsInput = InputOf<StaticEffectProps<AlertEffect>> & { goo?: boolean }

/** Spread into GoopAlert's `defineProps({ ...goopAlertProps, ... })`. */
export const goopAlertProps = Object.freeze({
  ...(staticEffectProps(ALERT_EFFECTS) as unknown as StaticEffectProps<AlertEffect>),
  /** Master switch. `false` renders a plain shadcn Alert. */
  goo: { type: Boolean, default: true },
}) as GoopAlertPropsDefinition

type AlertUnhandled = Exclude<keyof AlertOptions, keyof GoopAlertPropsDefinition | StaticAdapterOwned>
const _allAlertOptionsHandled: [AlertUnhandled] extends [never] ? true : { unhandled: AlertUnhandled } = true
void _allAlertOptionsHandled
type AlertPropsListed = Exclude<keyof GoopAlertPropsDefinition, (typeof ALERT_PROP_KEYS)[number]>
const _allAlertPropsListed: [AlertPropsListed] extends [never] ? true : { unlisted: AlertPropsListed } = true
void _allAlertPropsListed

/** Entrance options for core over app config, or null when the goo is off. */
export const toAlertOptions = (props: GoopAlertPropsInput, config: GoopOptions = {}): AlertOptions | null =>
  props.goo === false ? null : toStaticOptions(ALERT_EFFECTS, props, config)

import { ALERT_EFFECTS, type AlertEffect, type AlertOptions } from '@goopui/core'

// ---- GoopKbd --------------------------------------------------------------------------------
// The key-press squish (core `attachKbd`): the kbd squishes into its base when clicked, or
// when the keys in `keys` are pressed (opt-in, e.g. ['Meta', 'K']), and springs back with a
// small jelly rebound (`press`, a boolean or a multiplier). `goo: false` renders a plain
// shadcn Kbd. GoopKbdGroup is plain.

/** Every GoopKbd engine prop. */
export const KBD_PROP_KEYS = ['goo', ...KBD_EFFECTS, 'keys', 'speed', 'preset'] as const

export type GoopKbdPropsDefinition = StaticEffectProps<KbdEffect> & {
  keys: PropDef<readonly string[]>
  goo: { type: PropType<boolean>; default: boolean }
}
export type GoopKbdPropsInput = InputOf<StaticEffectProps<KbdEffect>> & { keys?: readonly string[]; goo?: boolean }

/** Spread into GoopKbd's `defineProps({ ...goopKbdProps, ... })`. */
export const goopKbdProps = Object.freeze({
  ...(staticEffectProps(KBD_EFFECTS) as unknown as StaticEffectProps<KbdEffect>),
  /** Keyboard keys that press it, e.g. ['Meta', 'K'] (all held = pressed). Default: none. */
  keys: def(Array),
  /** Master switch. `false` renders a plain shadcn Kbd. */
  goo: { type: Boolean, default: true },
}) as GoopKbdPropsDefinition

type KbdUnhandled = Exclude<keyof KbdOptions, keyof GoopKbdPropsDefinition | StaticAdapterOwned>
const _allKbdOptionsHandled: [KbdUnhandled] extends [never] ? true : { unhandled: KbdUnhandled } = true
void _allKbdOptionsHandled
type KbdPropsListed = Exclude<keyof GoopKbdPropsDefinition, (typeof KBD_PROP_KEYS)[number]>
const _allKbdPropsListed: [KbdPropsListed] extends [never] ? true : { unlisted: KbdPropsListed } = true
void _allKbdPropsListed

/** Squish options for core over app config, or null when the goo or the squish is off. */
export function toKbdOptions(props: GoopKbdPropsInput, config: GoopOptions = {}): KbdOptions | null {
  if (props.goo === false || props.press === false || props.press === 0) return null
  const out: KbdOptions = toStaticOptions(KBD_EFFECTS, props, config)
  if (props.keys?.length) out.keys = [...props.keys]
  return out
}

import { KBD_EFFECTS, type KbdEffect, type KbdOptions } from '@goopui/core'

// ---- GoopBreadcrumb -------------------------------------------------------------------------
// The links' hover / keyboard-focus highlight is ONE goo blob (core
// `attachBreadcrumbHighlight`: the menu highlight engine fed BREADCRUMB_FEEL, a calm tabs feel
// with the menu's pointer swell) on GoopBreadcrumbList that flows from link to link.
// Separator, Ellipsis, Page and Item are plain. Every prop can sit on GoopBreadcrumb (the list
// inherits it) or on GoopBreadcrumbList (wins there). Toggles come from core's
// BREADCRUMB_EFFECTS; all default true.

/** Every GoopBreadcrumb engine prop. */
export const BREADCRUMB_PROP_KEYS = ['goo', ...BREADCRUMB_EFFECTS, 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopBreadcrumb (inherited) and GoopBreadcrumbList. */
export interface GoopBreadcrumbProps {
  /** Master switch. `false` renders plain shadcn Breadcrumb parts. */
  goo?: boolean
  /** The links' hover / focus highlight is one goo blob that flows between them (false: shadcn's
   *  text-colour hover only). */
  highlight?: boolean
  /** Soft jelly landing when the blob reaches a link. */
  wobble?: boolean
  /** Momentum: the blob stretches gently and trails a short tail while it travels. */
  momentum?: boolean
  /** A low, wide swell of the blob sits under the pointer (false: centred). */
  followPointer?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

type BreadcrumbAdapterOwned = 'feel' | 'reducedMotion'
type BreadcrumbUnhandled = Exclude<keyof BreadcrumbHighlightOptions | BreadcrumbEffect, keyof GoopBreadcrumbProps | BreadcrumbAdapterOwned>
const _allBreadcrumbOptionsHandled: [BreadcrumbUnhandled] extends [never] ? true : { unhandled: BreadcrumbUnhandled } = true
void _allBreadcrumbOptionsHandled
type BreadcrumbPropsListed = Exclude<keyof GoopBreadcrumbProps, (typeof BREADCRUMB_PROP_KEYS)[number]>
const _allBreadcrumbPropsListed: [BreadcrumbPropsListed] extends [never] ? true : { unlisted: BreadcrumbPropsListed } = true
void _allBreadcrumbPropsListed

/** The list's props over the root's: each prop the list sets wins, the rest are inherited. */
export function resolveBreadcrumbProps(own: GoopBreadcrumbProps, parent?: GoopBreadcrumbProps | null): GoopBreadcrumbProps {
  const out: GoopBreadcrumbProps = {}
  for (const k of BREADCRUMB_PROP_KEYS) {
    const v = own[k] ?? parent?.[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** Highlight options for core over app config, or null when the blob is off. */
export function toBreadcrumbOptions(props: GoopBreadcrumbProps, config: GoopOptions = {}): BreadcrumbHighlightOptions | null {
  if (props.goo === false || props.highlight === false) return null
  return {
    feel: BREADCRUMB_FEEL,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    followPointer: props.followPointer !== false,
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

import { BREADCRUMB_EFFECTS, BREADCRUMB_FEEL, type BreadcrumbEffect, type BreadcrumbHighlightOptions } from '@goopui/core'

// ---- GoopButtonGroup ------------------------------------------------------------------------
// Every GoopButton inside keeps its own goo body. The group (core `attachButtonGroup`) marks
// each member's joined sides (`seams`, default on) so that goo is cut clean at the seams;
// `press` (whole-button squish) and `tug` (neighbours pulled toward the pressed one) are the
// older transform flex, opt-in. Each takes a boolean or a multiplier, plus speed / preset;
// `goo: false` renders a plain shadcn ButtonGroup with plain buttons.

/** Every GoopButtonGroup engine prop. */
export const BUTTON_GROUP_PROP_KEYS = ['goo', ...BUTTON_GROUP_EFFECTS, 'speed', 'preset'] as const

export type GoopButtonGroupPropsDefinition = StaticEffectProps<ButtonGroupEffect> & { goo: { type: PropType<boolean>; default: boolean } }
export type GoopButtonGroupPropsInput = InputOf<StaticEffectProps<ButtonGroupEffect>> & { goo?: boolean }

/** Spread into GoopButtonGroup's `defineProps({ ...goopButtonGroupProps, ... })`. */
export const goopButtonGroupProps = Object.freeze({
  ...(staticEffectProps(BUTTON_GROUP_EFFECTS) as unknown as StaticEffectProps<ButtonGroupEffect>),
  /** Master switch. `false` renders a plain shadcn ButtonGroup. */
  goo: { type: Boolean, default: true },
}) as GoopButtonGroupPropsDefinition

type ButtonGroupAdapterOwned = StaticAdapterOwned | 'orientation'
type ButtonGroupUnhandled = Exclude<keyof ButtonGroupOptions, keyof GoopButtonGroupPropsDefinition | ButtonGroupAdapterOwned>
const _allButtonGroupOptionsHandled: [ButtonGroupUnhandled] extends [never] ? true : { unhandled: ButtonGroupUnhandled } = true
void _allButtonGroupOptionsHandled
type ButtonGroupPropsListed = Exclude<keyof GoopButtonGroupPropsDefinition, (typeof BUTTON_GROUP_PROP_KEYS)[number]>
const _allButtonGroupPropsListed: [ButtonGroupPropsListed] extends [never] ? true : { unlisted: ButtonGroupPropsListed } = true
void _allButtonGroupPropsListed

/** Group options for core over app config, or null when the goo is off. `orientation` is the
 *  group's own (shadcn) prop. */
export function toButtonGroupOptions(
  props: GoopButtonGroupPropsInput,
  config: GoopOptions = {},
  orientation?: ButtonGroupOrientation | null,
): ButtonGroupOptions | null {
  if (props.goo === false) return null
  const out: ButtonGroupOptions = toStaticOptions(BUTTON_GROUP_EFFECTS, props, config)
  if (orientation) out.orientation = orientation
  return out
}

import {
  BUTTON_GROUP_EFFECTS,
  type ButtonGroupEffect,
  type ButtonGroupOptions,
  type ButtonGroupOrientation,
} from '@goopui/core'

// ---- GoopEmpty ------------------------------------------------------------------------------
// The media (GoopEmptyMedia) sits in a goo puddle of its own muted tone (core
// `attachEmptyPuddle`) that breathes very slowly, about 1px (`breathe`; static under reduced
// motion). Props can sit on GoopEmpty (the media inherits them) or on GoopEmptyMedia (wins).
// The other parts are plain.

/** Every GoopEmpty engine prop. */
export const EMPTY_PROP_KEYS = ['goo', ...EMPTY_EFFECTS, 'speed', 'preset'] as const

/** Engine props of GoopEmpty (inherited) and GoopEmptyMedia. */
export interface GoopEmptyProps {
  /** Master switch. `false` renders plain shadcn Empty parts. */
  goo?: boolean
  /** The goo puddle under the media. A number scales its depth. */
  puddle?: boolean | number
  /** The puddle's slow ~1px breathing. A number scales it. */
  breathe?: boolean | number
  /** Animation speed multiplier (a faster breath). */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
}

type EmptyAdapterOwned = 'reducedMotion' | 'seed'
type EmptyUnhandled = Exclude<keyof EmptyPuddleOptions, keyof GoopEmptyProps | EmptyAdapterOwned>
const _allEmptyOptionsHandled: [EmptyUnhandled] extends [never] ? true : { unhandled: EmptyUnhandled } = true
void _allEmptyOptionsHandled
type EmptyPropsListed = Exclude<keyof GoopEmptyProps, (typeof EMPTY_PROP_KEYS)[number]>
const _allEmptyPropsListed: [EmptyPropsListed] extends [never] ? true : { unlisted: EmptyPropsListed } = true
void _allEmptyPropsListed

/** The media's props over the root's: each prop the media sets wins, the rest are inherited. */
export function resolveEmptyProps(own: GoopEmptyProps, parent?: GoopEmptyProps | null): GoopEmptyProps {
  const out: GoopEmptyProps = {}
  for (const k of EMPTY_PROP_KEYS) {
    const v = own[k] ?? parent?.[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** Puddle options for core over app config, or null when the puddle is off. */
export function toEmptyOptions(props: GoopEmptyProps, config: GoopOptions = {}): EmptyPuddleOptions | null {
  if (props.goo === false || props.puddle === false || props.puddle === 0) return null
  const out: EmptyPuddleOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.puddle !== undefined) out.puddle = props.puddle
  if (props.breathe !== undefined) out.breathe = props.breathe
  if (props.speed !== undefined) out.speed = props.speed
  return out
}

import { EMPTY_EFFECTS, type EmptyPuddleOptions } from '@goopui/core'

// ---- GoopScrollArea -------------------------------------------------------------------------
// The scrollbar thumb is a goo body (core `attachScrollArea`): it stretches a little with the
// scroll speed (`stretch`) and, pushed past an end, squashes against it and springs back with a
// small jelly wobble (`jelly`). Each takes a boolean or a multiplier; `goo: false` renders a
// plain shadcn ScrollArea. Reduced motion: a plain thumb. The scroll bars follow their root.
// Same as @goopui/vue / @goopui/react.

/** Every GoopScrollArea engine prop. */
export const SCROLL_AREA_PROP_KEYS = ['goo', ...SCROLL_AREA_EFFECTS, 'speed', 'preset'] as const

/** Engine props of GoopScrollArea. */
export interface GoopScrollAreaProps {
  /** Master switch. `false` renders a plain shadcn ScrollArea. Default true. */
  goo?: boolean
  /** The thumb stretches with the scroll speed. A number scales it. */
  stretch?: boolean | number
  /** Pushing past an end squashes the thumb against it, then a jelly wobble. A number scales it. */
  jelly?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
}

type ScrollAreaUnhandled = Exclude<keyof ScrollAreaOptions, keyof GoopScrollAreaProps | 'reducedMotion'>
const _allScrollAreaOptionsHandled: [ScrollAreaUnhandled] extends [never] ? true : { unhandled: ScrollAreaUnhandled } = true
void _allScrollAreaOptionsHandled
type ScrollAreaPropsListed = Exclude<keyof GoopScrollAreaProps, (typeof SCROLL_AREA_PROP_KEYS)[number]>
const _allScrollAreaPropsListed: [ScrollAreaPropsListed] extends [never] ? true : { unlisted: ScrollAreaPropsListed } = true
void _allScrollAreaPropsListed

/** Thumb options for core over app config, or null when the goo (or every effect) is off. */
export function toScrollAreaOptions(props: GoopScrollAreaProps, config: GoopOptions = {}): ScrollAreaOptions | null {
  const off = (v: boolean | number | undefined): boolean => v === false || v === 0
  if (props.goo === false || (off(props.stretch) && off(props.jelly))) return null
  const out: ScrollAreaOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.stretch !== undefined) out.stretch = props.stretch
  if (props.jelly !== undefined) out.jelly = props.jelly
  if (props.speed !== undefined) out.speed = props.speed
  return out
}

import { SCROLL_AREA_EFFECTS, type ScrollAreaOptions } from '@goopui/core'

// ---- GoopResizable --------------------------------------------------------------------------
// The handle's grip is a goo bead (core `attachResizableHandle`): while dragged it swells a
// little and bulges toward the drag direction in a low, wide mound (`bulge`); on release it
// wobbles back like jelly (`wobble`; off: it eases back). A handle without a grip gets the same
// mound on its line, under the pointer. Props can sit on GoopResizablePanelGroup (its handles
// inherit them) or on GoopResizableHandle (wins). Panels are plain. Reduced motion: a plain
// handle. Same as @goopui/vue / @goopui/react.

/** Every GoopResizable engine prop. */
export const RESIZABLE_PROP_KEYS = ['goo', ...RESIZABLE_EFFECTS, 'speed', 'preset'] as const

/** Engine props of GoopResizablePanelGroup (inherited) and GoopResizableHandle. */
export interface GoopResizableProps {
  /** Master switch. `false` renders a plain shadcn handle. Default true. */
  goo?: boolean
  /** The bead swells and bulges toward the drag. A number scales it. */
  bulge?: boolean | number
  /** The bead wobbles back like jelly on release (off: it eases back). A number scales it. */
  wobble?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
}

type ResizableUnhandled = Exclude<keyof ResizableOptions, keyof GoopResizableProps | 'reducedMotion'>
const _allResizableOptionsHandled: [ResizableUnhandled] extends [never] ? true : { unhandled: ResizableUnhandled } = true
void _allResizableOptionsHandled
type ResizablePropsListed = Exclude<keyof GoopResizableProps, (typeof RESIZABLE_PROP_KEYS)[number]>
const _allResizablePropsListed: [ResizablePropsListed] extends [never] ? true : { unlisted: ResizablePropsListed } = true
void _allResizablePropsListed

/** The handle's props over the group's: each prop the handle sets wins, the rest are inherited. */
export function resolveResizableProps(own: GoopResizableProps, parent?: GoopResizableProps | null): GoopResizableProps {
  const out: GoopResizableProps = {}
  for (const k of RESIZABLE_PROP_KEYS) {
    const v = own[k] ?? parent?.[k]
    if (v !== undefined) (out as Record<string, unknown>)[k] = v
  }
  return out
}

/** Bead options for core over app config, or null when the goo or the bulge is off. */
export function toResizableOptions(props: GoopResizableProps, config: GoopOptions = {}): ResizableOptions | null {
  if (props.goo === false || props.bulge === false || props.bulge === 0) return null
  const out: ResizableOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.bulge !== undefined) out.bulge = props.bulge
  if (props.wobble !== undefined) out.wobble = props.wobble
  if (props.speed !== undefined) out.speed = props.speed
  return out
}

import { RESIZABLE_EFFECTS, type ResizableOptions } from '@goopui/core'

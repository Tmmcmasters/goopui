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
type AdapterOwned = 'disabled' | 'cssVars' | 'random'
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

/** Spread into `defineProps({ ...goopSkeletonProps, ... })` (likewise badge / avatar / card). */
export const goopSkeletonProps = staticEffectProps(SKELETON_EFFECTS) as unknown as GoopSkeletonPropsDefinition
export const goopBadgeProps = staticEffectProps(BADGE_EFFECTS) as unknown as GoopBadgePropsDefinition
export const goopAvatarProps = staticEffectProps(AVATAR_EFFECTS) as unknown as GoopAvatarPropsDefinition
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
/** Card options, or null when the goo is off (the default). */
export const toCardOptions = (props: GoopCardPropsInput, config: GoopOptions = {}): CardOptions | null =>
  props.goo ? toStaticOptions(CARD_EFFECTS, props, config) : null

import {
  AVATAR_EFFECTS,
  BADGE_EFFECTS,
  CARD_EFFECTS,
  SKELETON_EFFECTS,
  type AvatarEffect,
  type AvatarOptions,
  type BadgeEffect,
  type BadgeOptions,
  type CardEffect,
  type CardOptions,
  type SkeletonEffect,
  type SkeletonOptions,
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

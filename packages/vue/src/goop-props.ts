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
  GOOP_DEFAULTS,
  GOOP_PRESETS,
  GOOP_VAR_META,
  MENU_EFFECTS,
  PROGRESS_EFFECTS,
  SLIDER_EFFECTS,
  SWITCH_EFFECTS,
  TABS_EFFECTS,
  TABS_FEEL,
  TOOLTIP_FEEL,
  TOOLTIP_MOMENTUM,
  type TabsEffect,
  type TabsIndicatorOptions,
  CHECKBOX_EFFECTS,
  RADIO_EFFECTS,
  type CheckboxEffect,
  type CheckboxOptions,
  type RadioEffect,
  type RadioGroupOptions,
  TOASTER_EFFECTS,
  type ToasterEffect,
  type ToasterOptions,
  type EmergeOptions,
  type EmergeSurfaceColor,
  type MenuEffect,
  type MenuHighlightOptions,
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
} from '@goopui/core'
import type { PropType } from 'vue'

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
export const EMERGE_DRIP_KEYS = ['openDripAmount', 'openDripSize', 'openDripFling', 'openDripVariety'] as const
/** Every GoopDropdownMenuContent / SubContent engine prop. */
export const MENU_PROP_KEYS = [
  'goo',
  ...EMERGE_EFFECT_KEYS,
  ...EMERGE_DRIP_KEYS,
  ...MENU_EFFECTS,
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopDropdownMenuContent / GoopDropdownMenuSubContent. */
export interface GoopMenuProps {
  /** Master switch. `false` renders plain shadcn DropdownMenu parts. */
  goo?: boolean
  /** Bulb + lumpy neck between trigger (or submenu row) and panel. */
  bridge?: boolean
  /** Jelly overshoot: panel wobble, highlight overshoot and grow-in. */
  wobble?: boolean
  /** Momentum: the panel's launch, and the highlight's stretch + neck while it travels. */
  momentum?: boolean
  /** Content fades in once the goo settles. */
  fade?: boolean
  /** On open, the far edge overshoots, rebounds and wobbles. */
  openSlosh?: boolean
  /** On open, the whole far edge bursts: globs, drops and specks fling off and fall away. */
  openDrips?: boolean
  /** Burst drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** On close, the goo lags and the near edge sloshes against the trigger. */
  closeSlosh?: boolean
  /** Item highlight is a goo blob that slides between items (false: shadcn's flat bg). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is selected, before the menu closes. */
  pop?: boolean
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
type MenuAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'find' | 'feel' | 'reducedMotion'
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

const MENU_TOGGLES = ['goo', ...EMERGE_EFFECT_KEYS, ...MENU_EFFECTS] as const

/** Resolve menu props over a parent menu's resolved settings (submenus) or the defaults. */
export function resolveMenuProps(props: GoopMenuProps, parent?: ResolvedMenuProps | null): ResolvedMenuProps {
  const out = { speed: props.speed ?? parent?.speed ?? 1 } as ResolvedMenuProps
  for (const k of MENU_TOGGLES) out[k] = props[k] ?? parent?.[k] ?? true
  for (const k of EMERGE_DRIP_KEYS) {
    const v = props[k] ?? parent?.[k]
    if (v !== undefined) out[k] = v
  }
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
      surfaceColor: menu.surface,
    },
    highlight: menu.goo && menu.highlight ? { ...common, wobble: menu.wobble, momentum: menu.momentum, pop: menu.pop } : null,
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
// The tooltip oozes out of its trigger with the popover's emerge engine, fed TOOLTIP_FEEL
// (quick, small bridge) and TOOLTIP_MOMENTUM (light slosh, no drips) as defaults.

/** Every GoopTooltipContent engine prop. */
export const TOOLTIP_PROP_KEYS = ['goo', ...EMERGE_EFFECT_KEYS, ...EMERGE_DRIP_KEYS, 'surface', 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopTooltipContent. */
export interface GoopTooltipProps {
  /** Master switch. `false` renders a plain shadcn TooltipContent. */
  goo?: boolean
  /** Small bulb + lumpy neck between trigger and tooltip. */
  bridge?: boolean
  /** Jelly overshoot and wobble. */
  wobble?: boolean
  /** Momentum launch away from the trigger that stretches and snaps the neck. */
  momentum?: boolean
  /** Content fades in once the goo settles. */
  fade?: boolean
  /** Open: the far edge bulges and wobbles. `true` (light, 0.4), `false` or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open: drops fling off the far edge. Off by default; `true` or 0..2 turns it on. */
  openDrips?: boolean | number
  /** Burst drop count scale (0..3, default 1), when `openDrips` is on. */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** Close: the near edge sloshes against the trigger. `true` (light, 0.5), `false` or 0..2. */
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
type TooltipAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'feel' | 'reducedMotion'
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
  return {
    feel: TOOLTIP_FEEL,
    bridge: props.bridge !== false,
    wobble: props.wobble !== false,
    momentum: props.momentum !== false,
    fade: props.fade !== false,
    openSlosh: lightSlosh(props.openSlosh, M.openSlosh),
    // Off unless asked for: `true` turns drips on at full strength.
    openDrips: props.openDrips ?? M.openDrips,
    closeSlosh: lightSlosh(props.closeSlosh, M.closeSlosh),
    openDripAmount: props.openDripAmount,
    openDripSize: props.openDripSize,
    openDripFling: props.openDripFling,
    openDripVariety: props.openDripVariety,
    surfaceColor: props.surface ?? 'popover',
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
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

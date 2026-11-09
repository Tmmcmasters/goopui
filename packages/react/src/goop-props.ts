// The ONE place where @goopui/core's options become React props (mirrors
// packages/vue/src/goop-props.ts; same keys, same rules, same typecheck guards).
//
// Every engine option is a typed prop, derived from core's own types and constants:
//   - every numeric tuning knob (keys of GOOP_DEFAULTS / GoopTuning), e.g. `dripSize={9}`;
//   - the non-tuning engine options in ENGINE_OPTION_KEYS (preset, renderer, finish, ...);
//   - finish vars that core only reads from CSS (oil*), written to the host as `--goop-*`;
//   - `goop`: an escape hatch taking any GoopOptions object (lowest precedence of the props).
//
// Feature toggles: every key in FEATURE_KEYS also takes a boolean. `false` turns the feature
// off completely, `true` turns it on at the active preset's strength, a number tunes it.
// `undefined` (the prop is absent) leaves it to `--goop-*` CSS vars, then the preset, then
// core's default. So `<GoopButton shockwave={false} taffy />` reads like a feature list.
//
// When core adds an option, the `Unhandled` checks below fail typecheck until the option is
// listed here (as an engine option, a feature, or adapter-owned). New tuning knobs need no
// change at all: they come from GOOP_DEFAULTS and show up as props automatically.
//
// No React imports: this module is server-safe (React Server Components can import it).
import {
  ALERT_DIALOG_MOMENTUM,
  ALERT_DIALOG_SPLASH,
  CHECKBOX_EFFECTS,
  DIALOG_FEEL,
  GOOP_DEFAULTS,
  GOOP_PRESETS,
  GOOP_VAR_META,
  SWITCH_EFFECTS,
  TABS_EFFECTS,
  TABS_FEEL,
  type BackdropOptions,
  type CheckboxEffect,
  type CheckboxOptions,
  type EmergeBloomStart,
  type EmergeOptions,
  type EmergeSurfaceColor,
  type GoopOptions,
  type GoopPreset,
  type GoopRendererOption,
  type GoopTuning,
  type GoopVarMeta,
  type SwitchEffect,
  type SwitchOptions,
  type TabsEffect,
  type TabsIndicatorOptions,
} from '@goopui/core'

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

/** Every engine prop of GoopButton (all optional). */
export type GoopEngineProps = { [K in GoopEngineKey]?: GoopPropValue<K> } & {
  [K in GoopCssVarKey]?: number
} & {
  /** Escape hatch: any engine option. Explicit props win over it. */
  goop?: GoopOptions
}

/** Every prop name in GoopEngineProps, for splitting them off the DOM props. */
export const GOOP_PROP_KEYS: readonly (keyof GoopEngineProps)[] = Object.freeze([
  ...GOOP_TUNING_KEYS,
  ...ENGINE_OPTION_KEYS,
  ...CSS_VAR_KEYS,
  'goop',
])

const FEATURES = new Set<string>(FEATURE_KEYS)
/** Toggles core itself accepts as booleans (the first block of FEATURE_KEYS). */
const CORE_TOGGLES = new Set<string>(['gloss', 'taffy', 'reach', 'puddles', 'labelRide', 'keyboard', 'idle'])
const isCoreToggle = (key: string): boolean => CORE_TOGGLES.has(key)

// ---- sound ---------------------------------------------------------------------------------

/**
 * `sound`: opt-in interaction sounds (Cuelume, an optional peer of @goopui/core). Not an
 * engine option (core's GoopOptions has no `sound`), so the Unhandled guards are unaffected.
 * `undefined` (absent) inherits the nearest ancestor component's `sound`, then the app default
 * (`<GoopProvider sound>`), then off.
 */
export interface GoopSoundProps {
  /** Interaction sounds for this component and its parts. Default: inherit (off). */
  sound?: boolean
}

// ---- splitting props -----------------------------------------------------------------------

/** Split `props` into the listed keys and the rest (the rest go to the DOM / Radix). */
export function splitProps<P extends object, K extends keyof P>(props: P, keys: readonly K[]): [Pick<P, K>, Omit<P, K>] {
  const picked = {} as Pick<P, K>
  const rest = { ...props } as P
  for (const k of keys) {
    if (k in rest) {
      ;(picked as P)[k] = rest[k]
      delete rest[k]
    }
  }
  return [picked, rest as Omit<P, K>]
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
export function toGoopOptions(props: GoopEngineProps, base: GoopOptions = {}): GoopOptions {
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

/** Inline `--goop-*` style for the CSS-only vars (oil finish), as a React style object. */
export function toGoopStyle(props: GoopEngineProps): Record<string, string> {
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

/** Deep equality for option objects (arrays and plain objects; functions by identity). */
export function sameValue(a: unknown, b: unknown): boolean {
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

// ---- small effect engines (switch, checkbox) -----------------------------------------------
// Each has its own engine in core, so its props come from core's *_EFFECTS plus speed /
// preset / renderer. `false` turns an effect off, `true` (or absent) is the preset's
// strength, a number scales it.

/** Props of a small effect engine: each effect takes a boolean or a multiplier. */
export type GoopEffectProps<E extends string> = { [K in E]?: boolean | number } & {
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

const effectKeys = <E extends string>(effects: readonly E[]) =>
  Object.freeze([...effects, 'speed', 'preset', 'renderer'] as const) as readonly (E | 'speed' | 'preset' | 'renderer')[]

/** Effect-engine options from props, over app config (`preset`, `renderer`, `reducedMotion`). */
function toEffectOptions<E extends string>(
  effects: readonly E[],
  props: GoopEffectProps<E>,
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

// ---- GoopSwitch ----------------------------------------------------------------------------

/** Switch options GoopSwitch sets itself (from `checked` and app config). */
type SwitchAdapterOwned = 'checked' | 'reducedMotion'
export type GoopSwitchEngineKey = SwitchEffect | 'speed' | 'preset' | 'renderer'
type SwitchUnhandled = Exclude<keyof SwitchOptions, GoopSwitchEngineKey | SwitchAdapterOwned>
const _allSwitchOptionsHandled: [SwitchUnhandled] extends [never] ? true : { unhandled: SwitchUnhandled } = true
void _allSwitchOptionsHandled

export type GoopSwitchEngineProps = GoopEffectProps<SwitchEffect>
export const SWITCH_PROP_KEYS = effectKeys(SWITCH_EFFECTS)

/** Switch options from props, over app config (`preset`, `renderer`, `reducedMotion`). */
export function toSwitchOptions(props: GoopSwitchEngineProps, config: GoopOptions = {}): SwitchOptions {
  return toEffectOptions(SWITCH_EFFECTS, props, config)
}

// ---- GoopCheckbox --------------------------------------------------------------------------
// Core `attachCheckbox`: CHECKBOX_EFFECTS (fill, splat, droplets) plus speed / preset / renderer.

type CheckboxAdapterOwned = 'checked' | 'reducedMotion'
export type GoopCheckboxEngineKey = CheckboxEffect | 'speed' | 'preset' | 'renderer'
type CheckboxUnhandled = Exclude<keyof CheckboxOptions, GoopCheckboxEngineKey | CheckboxAdapterOwned>
const _allCheckboxOptionsHandled: [CheckboxUnhandled] extends [never] ? true : { unhandled: CheckboxUnhandled } = true
void _allCheckboxOptionsHandled

export type GoopCheckboxEngineProps = GoopEffectProps<CheckboxEffect>
export const CHECKBOX_PROP_KEYS = effectKeys(CHECKBOX_EFFECTS)

/** Checkbox options from props, over app config. */
export function toCheckboxOptions(props: GoopCheckboxEngineProps, config: GoopOptions = {}): CheckboxOptions {
  return toEffectOptions(CHECKBOX_EFFECTS, props, config)
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

// ---- GoopDialog -----------------------------------------------------------------------------
// The panel blooms with core's emerge engine in `detached` mode (no trigger: it pools from its
// own center, the overshoot and big all-around splash reach every side, close shrinks it back
// to the center), fed DIALOG_FEEL. The overlay is shadcn's fade unless `overlay` opts into the
// goo sheet that pours down and drains off the bottom (core `attachBackdrop`).

/** Numeric open-burst knobs (core EMERGE_DRIP_KNOBS). */
export const EMERGE_DRIP_KEYS = ['openDripAmount', 'openDripSize', 'openDripFling', 'openDripVariety', 'sloshVariety'] as const

/** Every GoopDialogContent engine prop. */
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

/** Engine props of GoopDialogContent. */
export interface GoopDialogProps {
  /** Master switch. `false` renders plain shadcn content and overlay. */
  goo?: boolean
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** The open overshoot past every side and its jelly settle. */
  wobble?: boolean
  /** Content fades in once the goo has mostly spread (and out first on close). */
  fade?: boolean
  /** Open: every edge bulges past rest, rebounds and wobbles. `true`, `false` or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open: the big all-around splash (globs, drops and specks fling off every side, fall and
   *  fade). `true`, `false` or 0..2. */
  openDrips?: boolean | number
  /** Splash drop count scale (0..3; default 1). */
  openDripAmount?: number
  /** Splash drop size scale (0.3..2.5; default 1). */
  openDripSize?: number
  /** How far splash drops are flung (0..3; default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close. Default 1. */
  sloshVariety?: number
  /** Close: the panel pulls in and wobbles before it shrinks to the center. `true`, `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Goo overlay (opt-in): the dimmed backdrop pours down over the page and drains off the
   *  bottom on close. Default `false`: shadcn's fading overlay. */
  overlay?: boolean
  /** The overlay's leading edge runs ahead in drips: `true`, `false` (a straight edge) or a 0..2 strength. */
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

/** Emerge options for a dialog panel over app config (same as @goopui/vue). */
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

// ---- GoopSkeleton / GoopSkeletonReveal / GoopBadge / GoopAvatar / GoopCard (the static set) --
// Cheap, calm effects (same as @goopui/vue). Skeleton `shimmer`, Badge `swell` and Avatar
// `settle` are CSS-only (core's skeletonStyle / badgeStyle / avatarStyle resolve the feel into
// CSS vars); Card's edge `swell` is core's `attachCard`, off unless `goo` is set;
// GoopSkeletonReveal is core's `attachSkeletonReveal`. Each effect takes a boolean or a
// multiplier, plus speed / preset.

/** Every static-set engine prop, per component. */
export const SKELETON_PROP_KEYS = [...SKELETON_EFFECTS, 'speed', 'preset'] as const
export const BADGE_PROP_KEYS = [...BADGE_EFFECTS, 'speed', 'preset'] as const
export const AVATAR_PROP_KEYS = [...AVATAR_EFFECTS, 'speed', 'preset'] as const
export const CARD_PROP_KEYS = ['goo', ...CARD_EFFECTS, 'speed', 'preset'] as const
export const SKELETON_REVEAL_PROP_KEYS = [...SKELETON_REVEAL_EFFECTS, 'speed', 'preset'] as const

/** Props of a static-set component: each effect takes a boolean or a multiplier. */
export type GoopStaticEffectProps<E extends string> = { [K in E]?: boolean | number } & {
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
}
export type GoopSkeletonEngineProps = GoopStaticEffectProps<SkeletonEffect>
export type GoopBadgeEngineProps = GoopStaticEffectProps<BadgeEffect>
export type GoopAvatarEngineProps = GoopStaticEffectProps<AvatarEffect>
export type GoopSkeletonRevealEngineProps = GoopStaticEffectProps<SkeletonRevealEffect>
export type GoopCardEngineProps = GoopStaticEffectProps<CardEffect> & {
  /** Master switch for the edge swell. Off by default: a card is static. */
  goo?: boolean
}

/** Compile-time guards: every option core grows must be a prop (or adapter-owned). */
type StaticAdapterOwned = 'reducedMotion'
type SkeletonUnhandled = Exclude<keyof SkeletonOptions, keyof GoopSkeletonEngineProps | StaticAdapterOwned>
const _allSkeletonOptionsHandled: [SkeletonUnhandled] extends [never] ? true : { unhandled: SkeletonUnhandled } = true
void _allSkeletonOptionsHandled
type BadgeUnhandled = Exclude<keyof BadgeOptions, keyof GoopBadgeEngineProps | StaticAdapterOwned>
const _allBadgeOptionsHandled: [BadgeUnhandled] extends [never] ? true : { unhandled: BadgeUnhandled } = true
void _allBadgeOptionsHandled
type AvatarUnhandled = Exclude<keyof AvatarOptions, keyof GoopAvatarEngineProps | StaticAdapterOwned>
const _allAvatarOptionsHandled: [AvatarUnhandled] extends [never] ? true : { unhandled: AvatarUnhandled } = true
void _allAvatarOptionsHandled
type CardUnhandled = Exclude<keyof CardOptions, keyof GoopCardEngineProps | StaticAdapterOwned>
const _allCardOptionsHandled: [CardUnhandled] extends [never] ? true : { unhandled: CardUnhandled } = true
void _allCardOptionsHandled
type SkeletonRevealUnhandled = Exclude<keyof SkeletonRevealOptions, keyof GoopSkeletonRevealEngineProps | StaticAdapterOwned>
const _allSkeletonRevealOptionsHandled: [SkeletonRevealUnhandled] extends [never] ? true : { unhandled: SkeletonRevealUnhandled } = true
void _allSkeletonRevealOptionsHandled
// And every listed key is a prop (the lists above are what splitProps takes off).
type StaticListed<K extends readonly string[], P> = Exclude<keyof P, K[number]>
const _staticPropsListed: [
  | StaticListed<typeof SKELETON_PROP_KEYS, GoopSkeletonEngineProps>
  | StaticListed<typeof BADGE_PROP_KEYS, GoopBadgeEngineProps>
  | StaticListed<typeof AVATAR_PROP_KEYS, GoopAvatarEngineProps>
  | StaticListed<typeof CARD_PROP_KEYS, GoopCardEngineProps>
  | StaticListed<typeof SKELETON_REVEAL_PROP_KEYS, GoopSkeletonRevealEngineProps>,
] extends [never]
  ? true
  : false = true
void _staticPropsListed

function toStaticOptions<E extends string>(
  effects: readonly E[],
  props: GoopStaticEffectProps<E>,
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

/** Skeleton / badge / avatar / reveal options from props, over app config (same as Vue). */
export const toSkeletonOptions = (props: GoopSkeletonEngineProps, config: GoopOptions = {}): SkeletonOptions =>
  toStaticOptions(SKELETON_EFFECTS, props, config)
export const toBadgeOptions = (props: GoopBadgeEngineProps, config: GoopOptions = {}): BadgeOptions =>
  toStaticOptions(BADGE_EFFECTS, props, config)
export const toAvatarOptions = (props: GoopAvatarEngineProps, config: GoopOptions = {}): AvatarOptions =>
  toStaticOptions(AVATAR_EFFECTS, props, config)
export const toSkeletonRevealOptions = (props: GoopSkeletonRevealEngineProps, config: GoopOptions = {}): SkeletonRevealOptions =>
  toStaticOptions(SKELETON_REVEAL_EFFECTS, props, config)
/** Card options, or null when the goo is off (the default). */
export const toCardOptions = (props: GoopCardEngineProps, config: GoopOptions = {}): CardOptions | null =>
  props.goo ? toStaticOptions(CARD_EFFECTS, props, config) : null

// ---- GoopSpinner ---------------------------------------------------------------------------
// Core `attachSpinner`. @goopui/vue declares these as GoopSpinner.vue props with the same
// defaults; the parity test reads them from that file.

/** Every GoopSpinner engine prop. */
export const SPINNER_PROP_KEYS = ['variant', 'blobs', 'speed', 'preset', 'drips', 'interactive', 'slosh', 'grab', 'pop', 'renderer'] as const

/** Engine props of GoopSpinner. */
export interface GoopSpinnerEngineProps {
  /** Shape: 'orbit' (chasing blobs) | 'comet' (a spinning arc) | 'ring' (a bead rolling round a
   *  donut) | 'dots' (a bead rolling along three dots) | 'pulse' (a core budding satellites). */
  variant?: SpinnerVariant
  /** Number of blobs, 3..6 (orbit and pulse). Default 4. */
  blobs?: number
  /** Orbit speed multiplier (1 = about 1.15s per turn on `playful`). */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** Drips hang off the bottom and fall away as it turns (orbit only). Default false. */
  drips?: boolean
  /** Pointer play: master switch for slosh, grab and pop. Off under reduced motion. Default true. */
  interactive?: boolean
  /** Moving the pointer over it sloshes the goo. Default true. */
  slosh?: boolean
  /** Press and drag pulls the goo out in lumps; release snaps it back. Default true. */
  grab?: boolean
  /** Click / tap squishes it, then it swells back with a ripple. Default true. */
  pop?: boolean
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

type SpinnerUnhandled = Exclude<keyof SpinnerOptions, keyof GoopSpinnerEngineProps | 'reducedMotion'>
const _allSpinnerOptionsHandled: [SpinnerUnhandled] extends [never] ? true : { unhandled: SpinnerUnhandled } = true
void _allSpinnerOptionsHandled
type SpinnerPropsListed = Exclude<keyof GoopSpinnerEngineProps, (typeof SPINNER_PROP_KEYS)[number]>
const _allSpinnerPropsListed: [SpinnerPropsListed] extends [never] ? true : { unlisted: SpinnerPropsListed } = true
void _allSpinnerPropsListed

/** Spinner options from props (with GoopSpinner.vue's defaults), over app config. */
export function toSpinnerOptions(props: GoopSpinnerEngineProps, config: GoopOptions = {}): SpinnerOptions {
  return {
    variant: props.variant ?? SPINNER_DEFAULT_VARIANT,
    blobs: props.blobs ?? SPINNER_DEFAULT_BLOBS,
    speed: props.speed ?? 1,
    drips: props.drips ?? false,
    interactive: props.interactive ?? true,
    slosh: props.slosh ?? true,
    grab: props.grab ?? true,
    pop: props.pop ?? true,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

import {
  AVATAR_EFFECTS,
  BADGE_EFFECTS,
  CARD_EFFECTS,
  SKELETON_EFFECTS,
  SKELETON_REVEAL_EFFECTS,
  SPINNER_DEFAULT_BLOBS,
  SPINNER_DEFAULT_VARIANT,
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
  type SpinnerOptions,
  type SpinnerVariant,
} from '@goopui/core'

// ---- GoopSelect -----------------------------------------------------------------------------
// The listbox blooms open with core's emerge engine (the bloom flow), its item highlight is the
// menu highlight blob with the select pop, and core's SELECT_EFFECTS `plop` drops the chosen
// item's check mark in. `bloomFrom`: an item-aligned list blooms out of the selected item.
// Same keys, defaults and guards as @goopui/vue's GoopSelectContent.
import {
  SELECT_EFFECTS,
  type EmergeFlowStyle,
  type MenuHighlightOptions,
  type SelectBloomFrom,
  type SelectEffect,
  type SelectPlopOptions,
} from '@goopui/core'

/** The emerge toggles a select list takes (@goopui/vue's EMERGE_EFFECT_KEYS). */
const SELECT_EMERGE_EFFECTS = ['bridge', 'wobble', 'momentum', 'fade', 'openSlosh', 'openDrips', 'closeSlosh'] as const

/** Every GoopSelectContent engine prop. */
export const SELECT_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  'bloomFrom',
  ...SELECT_EMERGE_EFFECTS,
  ...EMERGE_DRIP_KEYS,
  ...SELECT_EFFECTS,
  'followPointer',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopSelectContent. Every toggle defaults on. */
export interface GoopSelectProps {
  /** Master switch. `false` renders a plain shadcn SelectContent. */
  goo?: boolean
  /** The list opens in `flowStyle`. `false`: it inflates from a bulb at the trigger edge. */
  flow?: boolean
  /** 'bloom' (default: pools from a point, spreads with a lobed edge, overshoots, splashes) or
   *  'neck' (out of the trigger through a thick neck). */
  flowStyle?: EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Where the bloom starts: 'auto' (default: the selected item when `position` is
   *  'item-aligned', the list's own center for 'popper'), 'selected' or 'center'. Close
   *  shrinks back to the same spot. */
  bloomFrom?: SelectBloomFrom
  /** Bulb + lumpy neck between trigger and list (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot: the open overshoot and settle, the highlight overshoot, the plop wobble. */
  wobble?: boolean
  /** The panel's launch (not used by bloom), and the highlight's stretch + neck while it travels. */
  momentum?: boolean
  /** The items fade in once the goo settles. */
  fade?: boolean
  /** On open, every edge overshoots, rebounds and wobbles. */
  openSlosh?: boolean
  /** On open, the edges splash (drops kept off the trigger). */
  openDrips?: boolean
  /** Splash drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Splash drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far splash drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close. Default 1. */
  sloshVariety?: number
  /** On close, the list pulls in and wobbles before it shrinks back. */
  closeSlosh?: boolean
  /** Item highlight is a goo blob that slides between items (false: shadcn's flat bg). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is chosen, before the list closes. */
  pop?: boolean
  /** The chosen item's check mark plops in (falls in small, squashes, jiggles back). */
  plop?: boolean
  /** The highlight's swell follows the pointer with a little lag (false, or keyboard: centred). */
  followPointer?: boolean
  /** List color: 'popover' (default: shadcn's popover tokens), 'trigger', or any CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Compile-time guards: every emerge / highlight / plop option and select effect core grows
 *  must be handled here. `bloomOrigin` is set by the adapter from `bloomFrom`. */
type SelectAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'find' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type SelectUnhandled = Exclude<
  keyof EmergeOptions | keyof MenuHighlightOptions | keyof SelectPlopOptions | SelectEffect,
  keyof GoopSelectProps | SelectAdapterOwned
>
const _allSelectOptionsHandled: [SelectUnhandled] extends [never] ? true : { unhandled: SelectUnhandled } = true
void _allSelectOptionsHandled
type SelectPropsListed = Exclude<keyof GoopSelectProps, (typeof SELECT_PROP_KEYS)[number]>
const _allSelectPropsListed: [SelectPropsListed] extends [never] ? true : { unlisted: SelectPropsListed } = true
void _allSelectPropsListed

/** Core options for the list (emerge), the highlight blob and the check plop, over app config
 *  (@goopui/vue's resolveSelectProps + toSelectOptions). `highlight` / `plop` are null when
 *  off. */
export function toSelectOptions(
  props: GoopSelectProps,
  config: GoopOptions = {},
): { goo: boolean; emerge: EmergeOptions; highlight: MenuHighlightOptions | null; plop: SelectPlopOptions | null } {
  const on = (v: boolean | undefined) => v ?? true
  const goo = on(props.goo)
  const wobble = on(props.wobble)
  const momentum = on(props.momentum)
  const common = {
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  return {
    goo,
    emerge: {
      ...common,
      flow: on(props.flow),
      flowStyle: props.flowStyle ?? 'bloom',
      bloomStart: props.bloomStart ?? 'single',
      bridge: on(props.bridge),
      wobble,
      momentum,
      fade: on(props.fade),
      openSlosh: on(props.openSlosh),
      openDrips: on(props.openDrips),
      closeSlosh: on(props.closeSlosh),
      openDripAmount: props.openDripAmount,
      openDripSize: props.openDripSize,
      openDripFling: props.openDripFling,
      openDripVariety: props.openDripVariety,
      sloshVariety: props.sloshVariety,
      surfaceColor: props.surface ?? 'popover',
    },
    highlight: goo && on(props.highlight) ? { ...common, wobble, momentum, pop: on(props.pop), followPointer: on(props.followPointer) } : null,
    plop: goo && on(props.plop) ? { speed: common.speed, preset: common.preset, wobble, reducedMotion: config.reducedMotion } : null,
  }
}

// ---- GoopDrawerContent ----------------------------------------------------------------------
// Core's `createDrawer` drives the whole drawer (drag, snap points, springs) and its goo, as in
// @goopui/vue: DRAWER_EFFECTS (lag, slosh, rise, stretch, handle, splash), each `true`
// (default), `false`, or a 0..2 strength, plus goo / speed / preset / renderer. `goo: false` is
// a plain shadcn DrawerContent look. The drawer's behaviour options (direction, snap points,
// dismissible...) are GoopDrawer root props (vaul's API), passed through by the adapter.

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

/** Drawer options from props, over app config (`preset`, `renderer`, `reducedMotion`). Same as Vue. */
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

import { DRAWER_EFFECTS, type DrawerEffect, type DrawerOptions } from '@goopui/core'

// ---- GoopSidebar ----------------------------------------------------------------------------
// Core's SIDEBAR_EFFECTS, each a GoopSidebar prop (same as @goopui/vue): `highlight` (the
// menu's goo blob glides between items under the cursor: core `attachSidebarHighlight`), `pill`
// (the active item's soft filled pill), `slosh` (the inner edge sloshes as the sidebar
// collapses / expands: core `attachSidebarEdge`; `true`, `false` or 0..2), `travel` (the
// collapse / expand has the Drawer's momentum: core `sidebarMotionCurve`), `submenus` (an open
// sub-menu's row stays unfilled; its Collapsible keeps its jelly spring), `pour` (a sub-menu's
// guide line pours down behind a goo bead), `tooltips` (icon-mode tooltips; React renders
// shadcn's tooltip for now), `drawer` (the mobile sidebar is a GoopDrawer), `bloom` (accepted
// for parity; React's mobile sheet is shadcn's slide for now). `goo={false}` is a plain shadcn
// Sidebar.

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
  /** Sub-menus: an open Collapsible sub-menu's row stays unfilled, only the active item is a pill (false: a goo Collapsible floods its row as anywhere else). */
  submenus?: boolean
  /** An opening sub-menu's guide line pours down behind a goo bead that melts into it (needs `submenus` and a goo Collapsible). */
  pour?: boolean
  /** Icon-mode tooltips. Accepted for parity with @goopui/vue; React renders shadcn's tooltip. */
  tooltips?: boolean
  /** The mobile sidebar is a GoopDrawer: panel and goo one body, a fast launch with a small landing overshoot, a close that accelerates away, swipe to close (false: shadcn's Sheet). */
  drawer?: boolean
  /** Accepted for parity with @goopui/vue (its mobile sheet blooms with `drawer` off); React's sheet is shadcn's slide. */
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

/** Sidebar goo from props, over app config (`preset`, `renderer`, `reducedMotion`). Same as Vue. */
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

// ---- GoopCarousel ---------------------------------------------------------------------------
// Core's CAROUSEL_EFFECTS, each a GoopCarousel prop (same as @goopui/vue; all default on;
// `true`, `false` or a 0..2 strength for the slide effects): `stretch` (slides stretch along
// the motion with momentum and wobble when they snap), `slosh` (slide edges slosh in low, wide
// mounds with the velocity), `rubberBand` (dragging past the first / last slide: its outer edge
// reaches back as one low, wide mound), all three core `attachCarousel` fed embla's motion;
// `squish` (Previous / Next are squishy GoopButtons; false: plain shadcn buttons); `dots`
// (GoopCarouselDots' active blob flows between dots: core `attachCarouselDots`; false: flat
// dots). `goo={false}` is a plain shadcn Carousel. The parts read every prop from the carousel.

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
  button: { goo?: boolean; preset?: GoopPreset; timeScale?: number }
  /** Dots blob options, or null (flat dots). */
  dots: CarouselDotsOptions | null
  /** Reduced motion forced by app config (`true` / `false`), else 'auto'. */
  reducedMotion: boolean | 'auto'
}

const carouselStrength = (v: boolean | number | undefined): boolean | number => (v === undefined ? true : v)
const carouselOff = (v: boolean | number): boolean => v === false || v === 0

/** Carousel goo from props, over app config (`preset`, `renderer`, `reducedMotion`). Same as Vue. */
export function toCarouselOptions(props: GoopCarouselProps, config: GoopOptions = {}): ResolvedCarouselGoo {
  const on = props.goo !== false
  const preset = props.preset ?? config.preset
  const common = { speed: props.speed ?? 1, preset, reducedMotion: config.reducedMotion }
  const stretch = carouselStrength(props.stretch)
  const slosh = carouselStrength(props.slosh)
  const rubberBand = carouselStrength(props.rubberBand)
  const anySlide = !carouselOff(stretch) || !carouselOff(slosh) || !carouselOff(rubberBand)
  const button: ResolvedCarouselGoo['button'] = {}
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

// ---- GoopPageTransition ---------------------------------------------------------------------
// Core's `createPageTransition` (same as @goopui/vue): a fixed, aria-hidden goo band that pours
// in from one edge and drains out the other, the seam between the old page and the new one.
// band is `true` (default), `false` (the wall) or a thickness; bubbles / bulge / wobble / lag
// are `true` (default), `false` or a 0..2 strength; the rest are core's options as they are.
// `goo={false}` turns it off: cover() / reveal() resolve at once.

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

/** Engine props of GoopPageTransition. */
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

/** Page-transition options from props, over app config (`preset`, `reducedMotion`). Same as Vue. */
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

import type { PageTransitionDirection, PageTransitionOptions } from '@goopui/core'

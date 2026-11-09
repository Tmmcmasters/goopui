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

/** Emerge toggles shared by the select list and the menus (@goopui/vue's EMERGE_EFFECT_KEYS). */
export const EMERGE_EFFECT_KEYS = ['bridge', 'wobble', 'momentum', 'fade', 'openSlosh', 'openDrips', 'closeSlosh'] as const

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
// ---- GoopInput / GoopTextarea / GoopRadioGroup / GoopSlider / GoopProgress / GoopToggle /
// GoopToggleGroup (the forms batch) ---------------------------------------------------------
// Each has its own small engine in core, so its props come from core's *_EFFECTS plus speed /
// preset / renderer (same keys and defaults as @goopui/vue). Progress adds `seed`; Toggle and
// ToggleGroup add `textFollow`.

/** Every engine prop, per component (what splitProps takes off the DOM / Radix props). */
export const INPUT_PROP_KEYS = effectKeys(INPUT_EFFECTS)
export const RADIO_PROP_KEYS = effectKeys(RADIO_EFFECTS)
export const SLIDER_PROP_KEYS = effectKeys(SLIDER_EFFECTS)
export const PROGRESS_PROP_KEYS = Object.freeze([...effectKeys(PROGRESS_EFFECTS), 'seed'] as const)
export const TOGGLE_PROP_KEYS = Object.freeze([...effectKeys(TOGGLE_EFFECTS), 'textFollow'] as const)
export const TOGGLE_GROUP_PROP_KEYS = Object.freeze([...effectKeys(TOGGLE_GROUP_EFFECTS), 'textFollow'] as const)

export type GoopInputEngineProps = GoopEffectProps<InputEffect>
export type GoopRadioEngineProps = GoopEffectProps<RadioEffect>
export type GoopSliderEngineProps = GoopEffectProps<SliderEffect>
export type GoopProgressEngineProps = GoopEffectProps<ProgressEffect> & {
  /** Varies drip timing and sizes. Default: app config, then 0. */
  seed?: number
}
/** `textFollow`: the label's color follows the goo's edge (default on; `false` = the color
 *  flips all at once). */
type TextFollowProp = { textFollow?: boolean }
export type GoopToggleEngineProps = GoopEffectProps<ToggleEffect> & TextFollowProp
export type GoopToggleGroupEngineProps = GoopEffectProps<ToggleGroupEffect> & TextFollowProp

/** Compile-time guards: every option core grows must be a prop (or set by the component). */
type InputUnhandled = Exclude<keyof InputOptions, keyof GoopInputEngineProps | 'invalid' | 'reducedMotion'>
const _allInputOptionsHandled: [InputUnhandled] extends [never] ? true : { unhandled: InputUnhandled } = true
void _allInputOptionsHandled
type RadioUnhandled = Exclude<keyof RadioGroupOptions, keyof GoopRadioEngineProps | 'value' | 'item' | 'reducedMotion'>
const _allRadioOptionsHandled: [RadioUnhandled] extends [never] ? true : { unhandled: RadioUnhandled } = true
void _allRadioOptionsHandled
type SliderAdapterOwned = 'orientation' | 'reducedMotion' | 'thumbSelector' | 'rangeSelector' | 'trackSelector'
type SliderUnhandled = Exclude<keyof SliderOptions, keyof GoopSliderEngineProps | SliderAdapterOwned>
const _allSliderOptionsHandled: [SliderUnhandled] extends [never] ? true : { unhandled: SliderUnhandled } = true
void _allSliderOptionsHandled
type ProgressUnhandled = Exclude<keyof ProgressOptions, keyof GoopProgressEngineProps | 'value' | 'max' | 'reducedMotion'>
const _allProgressOptionsHandled: [ProgressUnhandled] extends [never] ? true : { unhandled: ProgressUnhandled } = true
void _allProgressOptionsHandled
type ToggleUnhandled = Exclude<keyof ToggleOptions, keyof GoopToggleEngineProps | 'pressed' | 'reducedMotion'>
const _allToggleOptionsHandled: [ToggleUnhandled] extends [never] ? true : { unhandled: ToggleUnhandled } = true
void _allToggleOptionsHandled
type ToggleGroupUnhandled = Exclude<keyof ToggleGroupOptions, keyof GoopToggleGroupEngineProps | 'value' | 'item' | 'reducedMotion'>
const _allToggleGroupOptionsHandled: [ToggleGroupUnhandled] extends [never] ? true : { unhandled: ToggleGroupUnhandled } = true
void _allToggleGroupOptionsHandled
// And every listed key is a prop.
const _formsPropsListed: [
  | StaticListed<typeof INPUT_PROP_KEYS, GoopInputEngineProps>
  | StaticListed<typeof RADIO_PROP_KEYS, GoopRadioEngineProps>
  | StaticListed<typeof SLIDER_PROP_KEYS, GoopSliderEngineProps>
  | StaticListed<typeof PROGRESS_PROP_KEYS, GoopProgressEngineProps>
  | StaticListed<typeof TOGGLE_PROP_KEYS, GoopToggleEngineProps>
  | StaticListed<typeof TOGGLE_GROUP_PROP_KEYS, GoopToggleGroupEngineProps>,
] extends [never]
  ? true
  : false = true
void _formsPropsListed

/** Input / textarea options from props, over app config (same as Vue). */
export const toInputOptions = (props: GoopInputEngineProps, config: GoopOptions = {}): InputOptions => toEffectOptions(INPUT_EFFECTS, props, config)
/** Radio group options from props, over app config. */
export const toRadioOptions = (props: GoopRadioEngineProps, config: GoopOptions = {}): RadioGroupOptions => toEffectOptions(RADIO_EFFECTS, props, config)
/** Slider options from props, over app config. */
export const toSliderOptions = (props: GoopSliderEngineProps, config: GoopOptions = {}): SliderOptions => toEffectOptions(SLIDER_EFFECTS, props, config)

/** Progress options from props, over app config (`seed` falls back to the app's). */
export function toProgressOptions(props: GoopProgressEngineProps, config: GoopOptions = {}): ProgressOptions {
  const out: ProgressOptions = toEffectOptions(PROGRESS_EFFECTS, props, config)
  const seed = props.seed ?? config.seed
  if (seed !== undefined) out.seed = seed
  return out
}

/** Toggle options from props, over app config. */
export function toToggleOptions(props: GoopToggleEngineProps, config: GoopOptions = {}): ToggleOptions {
  const out: ToggleOptions = toEffectOptions(TOGGLE_EFFECTS, props, config)
  if (props.textFollow !== undefined) out.textFollow = props.textFollow
  return out
}

/** Toggle group options from props, over app config. */
export function toToggleGroupOptions(props: GoopToggleGroupEngineProps, config: GoopOptions = {}): ToggleGroupOptions {
  const out: ToggleGroupOptions = toEffectOptions(TOGGLE_GROUP_EFFECTS, props, config)
  if (props.textFollow !== undefined) out.textFollow = props.textFollow
  return out
}

import {
  INPUT_EFFECTS,
  PROGRESS_EFFECTS,
  RADIO_EFFECTS,
  SLIDER_EFFECTS,
  TOGGLE_EFFECTS,
  TOGGLE_GROUP_EFFECTS,
  type InputEffect,
  type InputOptions,
  type ProgressEffect,
  type ProgressOptions,
  type RadioEffect,
  type RadioGroupOptions,
  type SliderEffect,
  type SliderOptions,
  type ToggleEffect,
  type ToggleGroupEffect,
  type ToggleGroupOptions,
  type ToggleOptions,
} from '@goopui/core'

// ---- Overlays: GoopPopover, GoopTooltip, GoopHoverCard, GoopSheet -----------------------------
// Bloom overlays on core's emerge engine (mirrors the Vue adapter's GoopPopoverContent props
// and its TOOLTIP / HOVER_CARD / SHEET sections). The goo blooms from the panel itself.

import {
  TOOLTIP_BLOOM_SPLASH,
  TOOLTIP_FEEL,
  TOOLTIP_MOMENTUM,
  // EmergeFlowStyle comes from the GoopSelect section's import above.
  type HoverCardBloomFrom,
  type SheetOptions,
} from '@goopui/core'

/** Every GoopPopoverContent engine prop. */
export const POPOVER_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  'bridge',
  'wobble',
  'momentum',
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

/** Engine props of GoopPopoverContent. Every toggle defaults on. */
export interface GoopPopoverProps {
  /** Master switch. `false` renders a plain shadcn PopoverContent. */
  goo?: boolean
  /** Flow open (default true) in `flowStyle`. `false`: the panel inflates from a bulb at the
   *  trigger edge (`bridge` / `momentum` apply). */
  flow?: boolean
  /** 'bloom' (default: the panel pools from its own center, spreads with a lobed edge,
   *  overshoots and splashes all around, keeping drops off the trigger; close shrinks it back
   *  to the center) or 'neck' (out of the trigger through a thick neck). */
  flowStyle?: EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Bulb + lumpy neck between trigger and panel (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot and wobble (bloom: the open overshoot and settle). */
  wobble?: boolean
  /** Momentum launch away from the trigger (not used by bloom). */
  momentum?: boolean
  /** Content fades in once the goo settles. */
  fade?: boolean
  /** Open: the far edge (bloom: every edge) bulges past rest, rebounds and wobbles. `true`,
   *  `false` or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open: the burst (bloom: all around, drops kept off the trigger). `true`, `false` or 0..2. */
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
  /** Close: the near edge sloshes against the trigger (bloom: the panel pulls in and wobbles
   *  before it shrinks to the center). `true`, `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Panel color: 'trigger' (default: the trigger's background and text color, theme primary
   *  when the trigger has none), 'popover' (shadcn's popover tokens), or a CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

type PopoverAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type PopoverUnhandled = Exclude<keyof EmergeOptions, keyof GoopPopoverProps | PopoverAdapterOwned>
const _allPopoverOptionsHandled: [PopoverUnhandled] extends [never] ? true : { unhandled: PopoverUnhandled } = true
void _allPopoverOptionsHandled
type PopoverPropsListed = Exclude<keyof GoopPopoverProps, (typeof POPOVER_PROP_KEYS)[number]>
const _allPopoverPropsListed: [PopoverPropsListed] extends [never] ? true : { unlisted: PopoverPropsListed } = true
void _allPopoverPropsListed

/** Emerge options for a popover over app config (GoopPopoverContent.vue's defaults). */
export function toPopoverOptions(props: GoopPopoverProps, config: GoopOptions = {}): EmergeOptions {
  return {
    flow: props.flow ?? true,
    flowStyle: props.flowStyle ?? 'bloom',
    bloomStart: props.bloomStart ?? 'single',
    bridge: props.bridge ?? true,
    wobble: props.wobble ?? true,
    momentum: props.momentum ?? true,
    fade: props.fade ?? true,
    openSlosh: props.openSlosh ?? true,
    openDrips: props.openDrips ?? true,
    openDripAmount: props.openDripAmount,
    openDripSize: props.openDripSize,
    openDripFling: props.openDripFling,
    openDripVariety: props.openDripVariety,
    sloshVariety: props.sloshVariety,
    closeSlosh: props.closeSlosh ?? true,
    surfaceColor: props.surface ?? 'trigger',
    speed: props.speed ?? 1,
    preset: props.preset ?? config.preset,
    renderer: props.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
}

/** Every GoopTooltipContent engine prop (the popover's). */
export const TOOLTIP_PROP_KEYS = POPOVER_PROP_KEYS

/** Engine props of GoopTooltipContent: the popover's, with tooltip defaults (TOOLTIP_FEEL, a
 *  light slosh, a light bloom splash, `surface` 'popover': shadcn's inverted tooltip). */
export type GoopTooltipProps = GoopPopoverProps

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

/** Every GoopHoverCardContent engine prop. */
export const HOVER_CARD_PROP_KEYS = [...POPOVER_PROP_KEYS, 'bloomFrom'] as const

/** Engine props of GoopHoverCardContent: the popover's plus `bloomFrom`; `surface` defaults to
 *  'popover' (a hover card's trigger is usually a link with no background of its own). */
export interface GoopHoverCardProps extends GoopPopoverProps {
  /** Where the bloom starts: 'trigger' (default: the card's edge facing the trigger) or
   *  'center' (the card's own center, like GoopPopoverContent). */
  bloomFrom?: HoverCardBloomFrom
}

type HoverCardPropsListed = Exclude<keyof GoopHoverCardProps, (typeof HOVER_CARD_PROP_KEYS)[number]>
const _allHoverCardPropsListed: [HoverCardPropsListed] extends [never] ? true : { unlisted: HoverCardPropsListed } = true
void _allHoverCardPropsListed

/** Emerge options for a hover card over app config (`bloomOrigin` comes from the adapter). */
export function toHoverCardOptions(props: GoopHoverCardProps, config: GoopOptions = {}): EmergeOptions {
  return { ...toPopoverOptions(props, config), surfaceColor: props.surface ?? 'popover' }
}

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
  /** Bloom start: 'single' (default: one droplet swells at the edge) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** The open overshoot past the inner edge and its jelly settle. */
  wobble?: boolean
  /** Content fades in once the goo has mostly spread (and out first on close). */
  fade?: boolean
  /** Open: the edges bulge past rest, rebound and wobble. `true`, `false` or a 0..2 strength. */
  openSlosh?: boolean | number
  /** Open: the big splash off the inner edge and sides (none off-screen). `true`, `false` or 0..2. */
  openDrips?: boolean | number
  /** Splash drop count scale (0..3; default 1). */
  openDripAmount?: number
  /** Splash drop size scale (0.3..2.5; default 1). */
  openDripSize?: number
  /** How far splash drops are flung (0..3; default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges (re-rolled every open). Default 1. */
  sloshVariety?: number
  /** Close: the goo pulls in and wobbles before it shrinks back into the edge. `true`, `false` or 0..2. */
  closeSlosh?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'canvas' (default for the sheet) | 'svg' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

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

// ---- GoopAlert / GoopKbd / GoopButtonGroup (static set, goo on by default) -------------------
// Same as @goopui/vue. Alert: core `attachAlert` (the entrance: `bloom`, icon `wobble`). Kbd:
// core `attachKbd` (the key-press squish: `press`, plus opt-in `keys`). ButtonGroup: core
// `attachButtonGroup`: one goo layer behind the buttons (the hover / focus `highlight` blob
// with `wobble` / `momentum` / `followPointer`, the press `bulge` and `ripple`) plus the
// buttons' own flex (`press` squish + neighbour `tug`); GoopButtons inside a group leave their
// own goo off unless they set `goo`. Each effect takes a boolean or a multiplier, plus
// speed / preset; `goo={false}` renders plain shadcn.

/** Every GoopAlert engine prop. */
export const ALERT_PROP_KEYS = ['goo', ...ALERT_EFFECTS, 'speed', 'preset'] as const
/** Every GoopKbd engine prop. */
export const KBD_PROP_KEYS = ['goo', ...KBD_EFFECTS, 'keys', 'speed', 'preset'] as const
/** Every GoopButtonGroup engine prop. */
export const BUTTON_GROUP_PROP_KEYS = ['goo', ...BUTTON_GROUP_EFFECTS, 'speed', 'preset'] as const

export type GoopAlertEngineProps = GoopStaticEffectProps<AlertEffect> & {
  /** Master switch. `false` renders a plain shadcn Alert. Default true. */
  goo?: boolean
}
export type GoopKbdEngineProps = GoopStaticEffectProps<KbdEffect> & {
  /** Keyboard keys that press it, e.g. ['Meta', 'K'] (all held = pressed). Default: none. */
  keys?: readonly string[]
  /** Master switch. `false` renders a plain shadcn Kbd. Default true. */
  goo?: boolean
}
export type GoopButtonGroupEngineProps = GoopStaticEffectProps<ButtonGroupEffect> & {
  /** Master switch. `false` renders a plain shadcn ButtonGroup. Default true. */
  goo?: boolean
}

type AlertUnhandled = Exclude<keyof AlertOptions, keyof GoopAlertEngineProps | StaticAdapterOwned>
const _allAlertOptionsHandled: [AlertUnhandled] extends [never] ? true : { unhandled: AlertUnhandled } = true
void _allAlertOptionsHandled
type KbdUnhandled = Exclude<keyof KbdOptions, keyof GoopKbdEngineProps | StaticAdapterOwned>
const _allKbdOptionsHandled: [KbdUnhandled] extends [never] ? true : { unhandled: KbdUnhandled } = true
void _allKbdOptionsHandled
type ButtonGroupUnhandled = Exclude<keyof ButtonGroupOptions, keyof GoopButtonGroupEngineProps | StaticAdapterOwned | 'orientation' | 'renderer'>
const _allButtonGroupOptionsHandled: [ButtonGroupUnhandled] extends [never] ? true : { unhandled: ButtonGroupUnhandled } = true
void _allButtonGroupOptionsHandled
const _simpleStaticPropsListed: [
  | StaticListed<typeof ALERT_PROP_KEYS, GoopAlertEngineProps>
  | StaticListed<typeof KBD_PROP_KEYS, GoopKbdEngineProps>
  | StaticListed<typeof BUTTON_GROUP_PROP_KEYS, GoopButtonGroupEngineProps>,
] extends [never]
  ? true
  : false = true
void _simpleStaticPropsListed

/** Entrance options for core over app config, or null when the goo is off. */
export const toAlertOptions = (props: GoopAlertEngineProps, config: GoopOptions = {}): AlertOptions | null =>
  props.goo === false ? null : toStaticOptions(ALERT_EFFECTS, props, config)

/** Squish options for core over app config, or null when the goo or the squish is off. */
export function toKbdOptions(props: GoopKbdEngineProps, config: GoopOptions = {}): KbdOptions | null {
  if (props.goo === false || props.press === false || props.press === 0) return null
  const out: KbdOptions = toStaticOptions(KBD_EFFECTS, props, config)
  if (props.keys?.length) out.keys = [...props.keys]
  return out
}

/** Group options for core over app config, or null when the goo is off. `orientation` is the
 *  group's own (shadcn) prop. */
export function toButtonGroupOptions(
  props: GoopButtonGroupEngineProps,
  config: GoopOptions = {},
  orientation?: ButtonGroupOrientation | null,
): ButtonGroupOptions | null {
  if (props.goo === false) return null
  const out: ButtonGroupOptions = toStaticOptions(BUTTON_GROUP_EFFECTS, props, config)
  if (orientation) out.orientation = orientation
  if (config.renderer) out.renderer = config.renderer
  return out
}

/** A part's props over the root's: each prop the part sets wins, the rest are inherited. */
function resolveOver<P extends object>(keys: readonly (keyof P)[], own: P, parent?: P | null): P {
  const out = {} as P
  for (const k of keys) {
    const v = own[k] ?? parent?.[k]
    if (v !== undefined) out[k] = v as P[keyof P]
  }
  return out
}

// ---- GoopEmpty ------------------------------------------------------------------------------
// The media (GoopEmptyMedia) sits in a goo puddle of its own muted tone (core
// `attachEmptyPuddle`) that breathes very slowly, about 1px. Props can sit on GoopEmpty (the
// media inherits them) or on GoopEmptyMedia (wins). The other parts are plain.

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

type EmptyUnhandled = Exclude<keyof EmptyPuddleOptions, keyof GoopEmptyProps | 'reducedMotion' | 'seed'>
const _allEmptyOptionsHandled: [EmptyUnhandled] extends [never] ? true : { unhandled: EmptyUnhandled } = true
void _allEmptyOptionsHandled
type EmptyPropsListed = Exclude<keyof GoopEmptyProps, (typeof EMPTY_PROP_KEYS)[number]>
const _allEmptyPropsListed: [EmptyPropsListed] extends [never] ? true : { unlisted: EmptyPropsListed } = true
void _allEmptyPropsListed

/** The media's props over the root's. */
export const resolveEmptyProps = (own: GoopEmptyProps, parent?: GoopEmptyProps | null): GoopEmptyProps =>
  resolveOver(EMPTY_PROP_KEYS, own, parent)

/** Puddle options for core over app config, or null when the puddle is off. */
export function toEmptyOptions(props: GoopEmptyProps, config: GoopOptions = {}): EmptyPuddleOptions | null {
  if (props.goo === false || props.puddle === false || props.puddle === 0) return null
  const out: EmptyPuddleOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.puddle !== undefined) out.puddle = props.puddle
  if (props.breathe !== undefined) out.breathe = props.breathe
  if (props.speed !== undefined) out.speed = props.speed
  return out
}

// ---- GoopBreadcrumb -------------------------------------------------------------------------
// The links' hover / keyboard-focus highlight is ONE goo blob (core `attachBreadcrumbHighlight`)
// on GoopBreadcrumbList. Every prop can sit on GoopBreadcrumb (the list inherits it) or on
// GoopBreadcrumbList (wins there). Toggles from core's BREADCRUMB_EFFECTS; all default true.

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

type BreadcrumbUnhandled = Exclude<keyof BreadcrumbHighlightOptions | BreadcrumbEffect, keyof GoopBreadcrumbProps | 'feel' | 'reducedMotion'>
const _allBreadcrumbOptionsHandled: [BreadcrumbUnhandled] extends [never] ? true : { unhandled: BreadcrumbUnhandled } = true
void _allBreadcrumbOptionsHandled
type BreadcrumbPropsListed = Exclude<keyof GoopBreadcrumbProps, (typeof BREADCRUMB_PROP_KEYS)[number]>
const _allBreadcrumbPropsListed: [BreadcrumbPropsListed] extends [never] ? true : { unlisted: BreadcrumbPropsListed } = true
void _allBreadcrumbPropsListed

/** The list's props over the root's. */
export const resolveBreadcrumbProps = (own: GoopBreadcrumbProps, parent?: GoopBreadcrumbProps | null): GoopBreadcrumbProps =>
  resolveOver(BREADCRUMB_PROP_KEYS, own, parent)

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

// ---- GoopPagination -------------------------------------------------------------------------
// The current page is ONE goo blob (core `attachPaginationIndicator`) on GoopPaginationContent.
// Previous / Next are ghost GoopButtons, so they press-squish. Every prop can sit on
// GoopPagination (all parts inherit it) or on a part (wins there). Toggles from core's
// PAGINATION_EFFECTS; all default true.

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
  /** Previous / Next squish when pressed (GoopButton's press squish). */
  press?: boolean
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

/** Engine props of the button parts (Previous / Next). */
export type GoopPaginationButtonProps = Pick<GoopPaginationProps, 'goo' | 'press' | 'speed' | 'preset' | 'renderer'>
export const PAGINATION_BUTTON_PROP_KEYS = ['goo', 'press', 'speed', 'preset', 'renderer'] as const

type PaginationUnhandled = Exclude<keyof PaginationIndicatorOptions | PaginationEffect, keyof GoopPaginationProps | 'feel' | 'reducedMotion'>
const _allPaginationOptionsHandled: [PaginationUnhandled] extends [never] ? true : { unhandled: PaginationUnhandled } = true
void _allPaginationOptionsHandled
type PaginationPropsListed = Exclude<keyof GoopPaginationProps, (typeof PAGINATION_PROP_KEYS)[number]>
const _allPaginationPropsListed: [PaginationPropsListed] extends [never] ? true : { unlisted: PaginationPropsListed } = true
void _allPaginationPropsListed
type PaginationButtonPropsListed = Exclude<keyof GoopPaginationButtonProps, (typeof PAGINATION_BUTTON_PROP_KEYS)[number]>
const _allPaginationButtonPropsListed: [PaginationButtonPropsListed] extends [never] ? true : { unlisted: PaginationButtonPropsListed } = true
void _allPaginationButtonPropsListed

/** A part's props over the root's. */
export const resolvePaginationProps = (own: GoopPaginationProps, parent?: GoopPaginationProps | null): GoopPaginationProps =>
  resolveOver(PAGINATION_PROP_KEYS, own, parent)

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
export function toPaginationButtonProps(props: GoopPaginationButtonProps): GoopEngineProps & { goo?: boolean } {
  const out: GoopEngineProps & { goo?: boolean } = {}
  if (props.goo !== undefined) out.goo = props.goo
  if (props.press === false) out.squish = false
  if (props.preset !== undefined) out.preset = props.preset
  if (props.renderer !== undefined) out.renderer = props.renderer
  if (props.speed !== undefined) out.timeScale = props.speed
  return out
}

// ---- GoopAccordion / GoopCollapsible --------------------------------------------------------
// Core `attachAccordion` on each item (and on the collapsible root): ACCORDION_EFFECTS (flood,
// wobble, droplets: GoopToggle's fill on the trigger row; jelly: the content's spring), each
// `true` (default), `false`, or a 0..2 strength, plus textFollow / speed / preset / renderer.
// Set them on GoopAccordion (every item follows) or GoopCollapsible. `goo={false}` is plain shadcn.

/** Every GoopAccordion / GoopCollapsible engine prop. */
export const ACCORDION_PROP_KEYS = ['goo', ...ACCORDION_EFFECTS, 'textFollow', 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopAccordion and GoopCollapsible. */
export interface GoopAccordionProps {
  /** Master switch. `false` renders a plain shadcn Accordion / Collapsible. */
  goo?: boolean
  /** The trigger row floods with goo from the click point on open and drains away from the
   *  label on close (off: the fill snaps). `true`, `false` or 0..2. */
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

type AccordionUnhandled = Exclude<keyof AccordionOptions | AccordionEffect, keyof GoopAccordionProps | 'reducedMotion'>
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

import {
  ACCORDION_EFFECTS,
  ALERT_EFFECTS,
  BREADCRUMB_EFFECTS,
  BREADCRUMB_FEEL,
  BUTTON_GROUP_EFFECTS,
  EMPTY_EFFECTS,
  KBD_EFFECTS,
  PAGINATION_EFFECTS,
  PAGINATION_FEEL,
  type AccordionEffect,
  type AccordionOptions,
  type AlertEffect,
  type AlertOptions,
  type BreadcrumbEffect,
  type BreadcrumbHighlightOptions,
  type ButtonGroupEffect,
  type ButtonGroupOptions,
  type ButtonGroupOrientation,
  type EmptyPuddleOptions,
  type KbdEffect,
  type KbdOptions,
  type PaginationEffect,
  type PaginationIndicatorOptions,
} from '@goopui/core'

// ---- GoopDropdownMenu -----------------------------------------------------------------------
// The menu panel reuses core's emerge engine (the bloom by default) and adds core's
// MENU_EFFECTS: the goo highlight blob, the select pop, and goo submenus. Every toggle is a
// boolean; `undefined` (absent) means "inherit" (a submenu takes its parent menu's value), then
// on. Same keys, defaults and rules as @goopui/vue.

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
  /** Flow out of the trigger (with `flowStyle="neck"`). Default true; submenus inherit it.
   *  `false`: the menu inflates from a bulb at the trigger edge. */
  flow?: boolean
  /** How the flow opens: 'bloom' (default: the menu pools from its own center and spreads
   *  out in every direction with a lobed edge, overshoots, then splashes all around, keeping
   *  the drops off the trigger; close pulls in, wobbles and shrinks back to the center) or
   *  'neck' (out of the trigger through a thick neck). Submenus inherit it. */
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
  /** On open, every edge (bloom) overshoots, rebounds and wobbles. */
  openSlosh?: boolean
  /** On open, every edge splashes (drops kept off the trigger). */
  openDrips?: boolean
  /** Burst drop count scale (0..3, default 1). */
  openDripAmount?: number
  /** Burst drop size scale (0.3..2.5, default 1). */
  openDripSize?: number
  /** How far burst drops are flung (0..3, default 1). */
  openDripFling?: number
  /** 0..1 mix of big globs vs specks and unevenness (default 0.7; 0: all alike). */
  openDripVariety?: number
  /** 0..1: how differently each side bulges on open and sloshes on close. Default 1. */
  sloshVariety?: number
  /** On close, the panel pulls in and wobbles before it shrinks to the center (bloom). */
  closeSlosh?: boolean
  /** Item highlight is a goo blob that slides between items (false: shadcn's flat bg). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is selected, before the menu closes. */
  pop?: boolean
  /** The highlight's swell (its neck while it slides, and a soft low mound as the pointer
   *  moves along an item) follows the pointer with a little lag (false, or keyboard: centred). */
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
type MenuAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'find' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type MenuUnhandled = Exclude<keyof EmergeOptions | keyof MenuHighlightOptions | MenuEffect, keyof GoopMenuProps | MenuAdapterOwned>
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

// ---- GoopContextMenu ------------------------------------------------------------------------
// The dropdown menu's goo with no trigger box: the root panel blooms detached from the
// right-click point (`bloomFrom: 'pointer'`, core `attachContextPoint`), so `flow` /
// `flowStyle` / `bridge` don't apply (always the bloom). Submenus bloom out of their parent
// item. Surface defaults to 'popover'. `undefined` toggles inherit from the parent menu.

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

// ---- GoopMenubar ----------------------------------------------------------------------------
// The bar's trigger highlight is ONE goo body (core `attachMenubarHighlight`: the menu
// highlight engine fed MENUBAR_FEEL, the tabs feel). Each menu is GoopDropdownMenuContent's
// goo on Radix's Menubar parts. Menu props left unset inherit the bar's `goo`, `wobble`,
// `momentum`, `speed`, `preset` and `renderer`; submenus inherit their parent menu's. Surface
// defaults to 'popover'.

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
export interface GoopMenubarMenuEngineProps extends Omit<GoopMenuProps, 'surface'> {
  /** Menu color: 'popover' (default: shadcn's popover tokens), 'trigger' (the trigger's
   *  colors) or any CSS color. Submenus that leave it unset reuse their parent's. */
  surface?: EmergeSurfaceColor
}

/** Resolve a menubar menu's props over its parent menu's (submenus), else over the bar's
 *  shared settings, then the defaults. */
export function resolveMenubarMenuProps(props: GoopMenubarMenuEngineProps, parent?: ResolvedMenuProps | null, bar?: GoopMenubarProps | null): ResolvedMenuProps {
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
// open highlight is one goo blob (core `attachNavigationMenuHighlight`; the links inside a
// panel get the same blob with the menu's feel), and the viewport is an emerge bloom out of
// the active trigger whose box jelly-springs between triggers (core
// `attachNavigationMenuViewport`). Toggles: core's NAVIGATION_MENU_EFFECTS plus the bloom's
// emerge knobs; all default on (`openDrips` included).

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
  /** Viewport (and `viewport={false}` panel) options, or null. */
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
  MENU_EFFECTS,
  MENUBAR_EFFECTS,
  MENUBAR_FEEL,
  NAVIGATION_MENU_CONTENT_FEEL,
  NAVIGATION_MENU_EFFECTS,
  NAVIGATION_MENU_FEEL,
  type ContextMenuBloomFrom,
  type MenubarEffect,
  type MenubarHighlightOptions,
  type MenuEffect,
  type NavigationMenuEffect,
  type NavigationMenuHighlightOptions,
  type NavigationMenuViewportOptions,
} from '@goopui/core'

// ---- GoopToaster / GoopCommand / GoopCombobox / GoopNumberField / GoopInputOTP (bespoke 1) --
// Same mapping as @goopui/vue (the parity test sends both the same props). Names are scoped to
// these components so they never clash with the other React batches' helpers.

// GoopToaster: core `attachToaster`, TOASTER_EFFECTS (dropIn, merge, drips) each `true`
// (default), `false` or a 0..2 strength, plus speed / preset. `goo={false}` is shadcn's Sonner.

/** Every GoopToaster engine prop. */
export const TOASTER_PROP_KEYS = ['goo', ..._TOASTER_EFFECTS, 'speed', 'preset'] as const

/** Engine props of GoopToaster (on top of sonner's ToasterProps). */
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

type ToasterUnhandled = Exclude<keyof _ToasterOptions | _ToasterEffect, keyof GoopToasterProps | 'reducedMotion'>
const _allToasterOptionsHandled: [ToasterUnhandled] extends [never] ? true : { unhandled: ToasterUnhandled } = true
void _allToasterOptionsHandled
type ToasterPropsListed = Exclude<keyof GoopToasterProps, (typeof TOASTER_PROP_KEYS)[number]>
const _allToasterPropsListed: [ToasterPropsListed] extends [never] ? true : { unlisted: ToasterPropsListed } = true
void _allToasterPropsListed

/** Toaster options from props, over app config (`preset`, `reducedMotion`). */
export function toToasterOptions(props: GoopToasterProps, config: GoopOptions = {}): _ToasterOptions {
  const out: _ToasterOptions = { preset: props.preset ?? config.preset, reducedMotion: config.reducedMotion }
  if (props.speed !== undefined) out.speed = props.speed
  for (const k of _TOASTER_EFFECTS) if (props[k] !== undefined) out[k] = props[k]
  return out
}

// GoopCommand: the active item is the menu highlight blob (core `attachMenuHighlight`; cmdk
// marks it `data-selected`) gliding between items with the keyboard and pointer; choosing
// squishes it (`pop`); the input gets the Input's goo focus ring (`ring`, core `attachInput`).
// GoopCommandDialog adds the dialog's bloom.

/** Every GoopCommand engine prop. */
export const COMMAND_PROP_KEYS = ['goo', ..._COMMAND_EFFECTS, 'wobble', 'momentum', 'followPointer', 'speed', 'preset', 'renderer'] as const

/** Engine props of GoopCommand (its input and items read them). Every toggle defaults on. */
export interface GoopCommandProps {
  /** Master switch. `false` renders plain shadcn Command parts. */
  goo?: boolean
  /** The active item is a goo blob that glides between items, following the arrow keys and
   *  the pointer (false: shadcn's flat highlight). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is chosen. */
  pop?: boolean
  /** The search input gets the Input's goo focus ring (a GoopCommandInput's own `goo` prop
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

type CommandUnhandled = Exclude<keyof _MenuHighlightOptions | _CommandEffect, keyof GoopCommandProps | 'find' | 'feel' | 'reducedMotion'>
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
): { highlight: _MenuHighlightOptions | null; ring: _InputOptions | null } {
  const common = {
    speed: cmd.speed,
    preset: cmd.preset ?? config.preset,
    renderer: cmd.renderer ?? config.renderer,
    reducedMotion: config.reducedMotion,
  }
  return {
    highlight:
      cmd.goo && cmd.highlight ? { ...common, wobble: cmd.wobble, momentum: cmd.momentum, pop: cmd.pop, followPointer: cmd.followPointer } : null,
    ring: cmd.goo && cmd.ring ? { ...common, ...(cmd.wobble ? {} : { wobble: false }) } : null,
  }
}

/** Every GoopCommandDialog engine prop: the dialog's bloom (DIALOG_PROP_KEYS) plus the
 *  command's own toggles. */
export const COMMAND_DIALOG_PROP_KEYS = [...DIALOG_PROP_KEYS, ..._COMMAND_EFFECTS, 'momentum', 'followPointer'] as const

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
type CommandDialogPropsListed = Exclude<keyof GoopCommandDialogProps, (typeof COMMAND_DIALOG_PROP_KEYS)[number]>
const _allCommandDialogPropsListed: [CommandDialogPropsListed] extends [never] ? true : { unlisted: CommandDialogPropsListed } = true
void _allCommandDialogPropsListed

/** The ring effects a GoopCommandInput / GoopComboboxInput takes (core INPUT_EFFECTS, as
 *  GoopInput's), plus speed / preset / renderer. */
export const COMMAND_INPUT_PROP_KEYS = effectKeys(_INPUT_EFFECTS)
export type GoopCommandInputEngineProps = GoopEffectProps<_InputEffect>
type CommandInputUnhandled = Exclude<keyof _InputOptions, keyof GoopCommandInputEngineProps | 'invalid' | 'reducedMotion'>
const _allCommandInputOptionsHandled: [CommandInputUnhandled] extends [never] ? true : { unhandled: CommandInputUnhandled } = true
void _allCommandInputOptionsHandled

/** Ring options for a command / combobox input from its props, over app config. */
export function toCommandInputOptions(props: GoopCommandInputEngineProps, config: GoopOptions = {}): _InputOptions {
  return toEffectOptions(_INPUT_EFFECTS, props, config)
}

// GoopCombobox: the list is a popover that blooms like GoopSelectContent's popper (core
// `attachEmerge`, always from its own center), with the command highlight, the select pop and
// the check mark plop.

/** Every GoopComboboxList engine prop (GoopSelectContent's, minus `bloomFrom`). */
export const COMBOBOX_PROP_KEYS = [
  'goo',
  'flow',
  'flowStyle',
  'bloomStart',
  'bridge',
  'wobble',
  'momentum',
  'fade',
  'openSlosh',
  'openDrips',
  'closeSlosh',
  ...EMERGE_DRIP_KEYS,
  ..._COMBOBOX_EFFECTS,
  'followPointer',
  'surface',
  'speed',
  'preset',
  'renderer',
] as const

/** Engine props of GoopComboboxList. Every toggle defaults on. */
export interface GoopComboboxProps {
  /** Master switch. `false` renders a plain shadcn popover list. */
  goo?: boolean
  /** The list opens in `flowStyle` (false: it inflates from a bulb at the input edge). */
  flow?: boolean
  /** 'bloom' (default: pools from the list's own center, spreads, overshoots, splashes) or
   *  'neck' (out of the input through a thick neck). */
  flowStyle?: _EmergeFlowStyle
  /** Bloom start: 'single' (default: one droplet swells) or 'merge' (a few drops fuse). */
  bloomStart?: EmergeBloomStart
  /** Bulb + lumpy neck between the input and the list (not used by bloom). */
  bridge?: boolean
  /** Jelly overshoot: the open overshoot and settle, the highlight overshoot, the plop wobble. */
  wobble?: boolean
  /** The panel's launch (not used by bloom), and the highlight's stretch + neck as it travels. */
  momentum?: boolean
  /** The items fade in once the goo settles. */
  fade?: boolean
  /** On open, every edge overshoots, rebounds and wobbles. */
  openSlosh?: boolean
  /** On open, the edges splash (drops kept off the input). */
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
  /** The item highlight is a goo blob that glides between items (false: shadcn's flat bg). */
  highlight?: boolean
  /** Jelly squish of the highlight when an item is chosen, before the list closes. */
  pop?: boolean
  /** The chosen item's check mark plops in: falls in small, squashes as it lands, jiggles back. */
  plop?: boolean
  /** The highlight's swell follows the pointer with a little lag (keyboard: centred). */
  followPointer?: boolean
  /** Panel color: 'popover' (default), 'trigger', or any CSS color. */
  surface?: EmergeSurfaceColor
  /** Animation speed multiplier. */
  speed?: number
  /** Feel: 'subtle' | 'playful' | 'wild'. Default: app config, `--goop-preset`, then playful. */
  preset?: GoopPreset
  /** 'svg' (default) | 'canvas' | a custom renderer factory. */
  renderer?: GoopRendererOption
}

// `bloomOrigin` stays the panel's center: a combobox list always blooms from its own center.
type ComboboxAdapterOwned = 'anchor' | 'side' | 'ready' | 'surface' | 'surfaceColor' | 'find' | 'feel' | 'reducedMotion' | 'detached' | 'bloomOrigin'
type ComboboxUnhandled = Exclude<
  keyof EmergeOptions | keyof _MenuHighlightOptions | keyof _SelectPlopOptions | _ComboboxEffect,
  keyof GoopComboboxProps | ComboboxAdapterOwned
>
const _allComboboxOptionsHandled: [ComboboxUnhandled] extends [never] ? true : { unhandled: ComboboxUnhandled } = true
void _allComboboxOptionsHandled
type ComboboxPropsListed = Exclude<keyof GoopComboboxProps, (typeof COMBOBOX_PROP_KEYS)[number]>
const _allComboboxPropsListed: [ComboboxPropsListed] extends [never] ? true : { unlisted: ComboboxPropsListed } = true
void _allComboboxPropsListed

/** Fully resolved combobox list settings (no undefined toggles). */
export interface ResolvedComboboxProps
  extends Required<Omit<GoopComboboxProps, 'preset' | 'renderer' | (typeof EMERGE_DRIP_KEYS)[number]>>,
    Pick<GoopComboboxProps, (typeof EMERGE_DRIP_KEYS)[number]> {
  preset?: GoopPreset
  renderer?: GoopRendererOption
}

const COMBOBOX_TOGGLES = ['goo', 'flow', 'bridge', 'wobble', 'momentum', 'fade', 'openSlosh', 'openDrips', 'closeSlosh', ..._COMBOBOX_EFFECTS, 'followPointer'] as const

/** Resolve combobox list props over the defaults (as @goopui/vue's resolveComboboxProps). */
export function resolveComboboxProps(props: GoopComboboxProps): ResolvedComboboxProps {
  const out = { speed: props.speed ?? 1 } as ResolvedComboboxProps
  for (const k of COMBOBOX_TOGGLES) out[k] = props[k] ?? true
  for (const k of EMERGE_DRIP_KEYS) if (props[k] !== undefined) out[k] = props[k]
  out.flowStyle = props.flowStyle ?? 'bloom'
  out.bloomStart = props.bloomStart ?? 'single'
  out.surface = props.surface ?? 'popover'
  out.preset = props.preset
  out.renderer = props.renderer
  return out
}

/** Core options for the list (emerge), the highlight blob and the check plop, over app
 *  config. `highlight` / `plop` are null when off. */
export function toComboboxOptions(
  c: ResolvedComboboxProps,
  config: GoopOptions = {},
): { emerge: EmergeOptions; highlight: _MenuHighlightOptions | null; plop: _SelectPlopOptions | null } {
  const common = { speed: c.speed, preset: c.preset ?? config.preset, renderer: c.renderer ?? config.renderer, reducedMotion: config.reducedMotion }
  return {
    emerge: {
      ...common,
      flow: c.flow,
      flowStyle: c.flowStyle,
      bloomStart: c.bloomStart,
      bridge: c.bridge,
      wobble: c.wobble,
      momentum: c.momentum,
      fade: c.fade,
      openSlosh: c.openSlosh,
      openDrips: c.openDrips,
      closeSlosh: c.closeSlosh,
      openDripAmount: c.openDripAmount,
      openDripSize: c.openDripSize,
      openDripFling: c.openDripFling,
      openDripVariety: c.openDripVariety,
      sloshVariety: c.sloshVariety,
      surfaceColor: c.surface,
    },
    highlight: c.goo && c.highlight ? { ...common, wobble: c.wobble, momentum: c.momentum, pop: c.pop, followPointer: c.followPointer } : null,
    plop: c.goo && c.plop ? { speed: c.speed, preset: c.preset ?? config.preset, wobble: c.wobble, reducedMotion: config.reducedMotion } : null,
  }
}

// GoopNumberField: core `attachNumberField`, the Input's ring (INPUT_EFFECTS) plus the
// steppers' squish and nudge (NUMBER_FIELD_EFFECTS), and speed / preset / renderer.

/** Every GoopNumberField engine prop. */
export const NUMBER_FIELD_PROP_KEYS = effectKeys(_NUMBER_FIELD_EFFECTS)
export type GoopNumberFieldEngineProps = GoopEffectProps<_NumberFieldEffect>
type NumberFieldUnhandled = Exclude<keyof _NumberFieldOptions, keyof GoopNumberFieldEngineProps | 'invalid' | 'reducedMotion'>
const _allNumberFieldOptionsHandled: [NumberFieldUnhandled] extends [never] ? true : { unhandled: NumberFieldUnhandled } = true
void _allNumberFieldOptionsHandled

/** Number field options from props, over app config. */
export function toNumberFieldOptions(props: GoopNumberFieldEngineProps, config: GoopOptions = {}): _NumberFieldOptions {
  return toEffectOptions(_NUMBER_FIELD_EFFECTS, props, config)
}

// GoopInputOTP: core `attachInputOTP`, OTP_EFFECTS (flood, flow, wobble, pulse) plus speed /
// preset / renderer.

/** Every GoopInputOTP engine prop. */
export const INPUT_OTP_PROP_KEYS = effectKeys(_OTP_EFFECTS)
export type GoopInputOTPEngineProps = GoopEffectProps<_OtpEffect>
type InputOTPUnhandled = Exclude<keyof _InputOTPOptions, keyof GoopInputOTPEngineProps | 'reducedMotion'>
const _allInputOTPOptionsHandled: [InputOTPUnhandled] extends [never] ? true : { unhandled: InputOTPUnhandled } = true
void _allInputOTPOptionsHandled

/** Input OTP options from props, over app config. */
export function toInputOTPOptions(props: GoopInputOTPEngineProps, config: GoopOptions = {}): _InputOTPOptions {
  return toEffectOptions(_OTP_EFFECTS, props, config)
}

import {
  COMBOBOX_EFFECTS as _COMBOBOX_EFFECTS,
  COMMAND_EFFECTS as _COMMAND_EFFECTS,
  INPUT_EFFECTS as _INPUT_EFFECTS,
  NUMBER_FIELD_EFFECTS as _NUMBER_FIELD_EFFECTS,
  OTP_EFFECTS as _OTP_EFFECTS,
  TOASTER_EFFECTS as _TOASTER_EFFECTS,
  type ComboboxEffect as _ComboboxEffect,
  type CommandEffect as _CommandEffect,
  type EmergeFlowStyle as _EmergeFlowStyle,
  type InputEffect as _InputEffect,
  type InputOptions as _InputOptions,
  type InputOTPOptions as _InputOTPOptions,
  type MenuHighlightOptions as _MenuHighlightOptions,
  type NumberFieldEffect as _NumberFieldEffect,
  type NumberFieldOptions as _NumberFieldOptions,
  type OtpEffect as _OtpEffect,
  type SelectPlopOptions as _SelectPlopOptions,
  type ToasterEffect as _ToasterEffect,
  type ToasterOptions as _ToasterOptions,
} from '@goopui/core'

// ---- GoopSidebar ----------------------------------------------------------------------------
// Core's SIDEBAR_EFFECTS, each a GoopSidebar prop (same as @goopui/vue): `highlight` (the
// menu's goo blob glides between items under the cursor: core `attachSidebarHighlight`), `pill`
// (the active item's soft filled pill), `slosh` (the inner edge sloshes as the sidebar
// collapses / expands: core `attachSidebarEdge`; `true`, `false` or 0..2), `travel` (the
// collapse / expand has the Drawer's momentum: core `sidebarMotionCurve`), `submenus`
// (GoopCollapsible sub-menus inside spring open, their row unfilled), `pour` (a sub-menu's
// guide line pours down behind a goo bead), `tooltips` (icon-mode tooltips are GoopTooltips),
// `drawer` (the mobile sidebar is a GoopDrawer), `bloom` (with `drawer` off, the mobile
// GoopSheet blooms from its edge). `goo={false}` is a plain shadcn Sidebar.

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

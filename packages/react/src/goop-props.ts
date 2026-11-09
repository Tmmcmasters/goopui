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

// All goopUI feel tuning lives in this file.
//
// Two tiers:
//   GOOP_DEFAULTS : per-element knobs. Each one can be overridden from CSS with the
//                   matching `--goop-*` custom property (see GOOP_CSS_VARS) or from JS
//                   via attachGoop(el, { ... }). Precedence: JS option > CSS var > default.
//   GOOP_PHYSICS  : engine-level constants (spring feel, timings, shape ratios). Not
//                   exposed as CSS vars; edit here while dialing in the feel.
//
// Precedence everywhere: JS option > `--goop-*` CSS var > preset (GOOP_PRESETS) > default.
//
// ---- features ------------------------------------------------------------------------------
// Every feature is individually toggleable and tunable. "Off" = the option/var value that
// disables it. Cost = extra work when it is ON (everything sleeps when nothing moves).
//
// feature          option (off)              CSS var                     default  cost
// drips            drips (false)             --goop-drip-count (0)       3        low: <=8 circles/drip
// rhythm           dripInterval              --goop-drip-interval        0.9s     none (timer)
// click mass       clickMass (0)             --goop-click-mass           0.35     low
// squish           squish (0)                --goop-squish               0.08     none
// inertia/slosh    inertia (0)               --goop-inertia              1        none (one spring)
// flow to cursor   flow (0)                  --goop-flow                 1        none
// pointer jelly    reactivity (0)            --goop-reactivity           1        none
// scroll slosh     scrollSlosh (0)           --goop-scroll-slosh         1        low: 1 shared scroll listener
// tilt             tilt (false, opt-in)      --goop-tilt                 1        low: 1 shared listener
// keyboard         keyboard (false)          --goop-keyboard (0)         1        none
// splash-through   splashAmount (0)          --goop-splash-amount        1        med: <=28 particles/burst
//   reach mode     splash ('off')            --goop-splash               near     escape: shared overlay
// shockwave        shockwave (0)             --goop-shockwave            1        med: <=22 particles + 8 circles
// oiliness         oiliness                  --goop-oiliness             0.65     none (fluid params)
// strings          stringiness (0)           --goop-stringiness          0.5      low: 1 bond/particle
// puddles          puddles (false)           --goop-puddles (0)          1        low: 1 circle/puddle
// gloss            gloss (false)             --goop-gloss (0)            0 (on: 0.6)     SVG: static filter prims;
//                                                                                 canvas: shader branch
// taffy pull       taffy (false)             --goop-taffy (0)            1        low: <=24 circles while held
// reach            reach (false)             --goop-reach (0, px)        60       low: 2 circles, wakes only
//                                                                                 within radius, on screen
// label ride       labelRide (false)         --goop-label-ride (0)       0.6      low: 1 transform write/frame
// finish (oil)     finish ('solid')          --goop-finish               solid    canvas: ~free; SVG: static
//
// Presets ('subtle' | 'playful' | 'wild', option `preset` or `--goop-preset`) only change
// the defaults column; see GOOP_PRESETS at the bottom of this file.

/** Per-element tuning knobs. Every field maps 1:1 to a `--goop-*` CSS custom property; the
 *  full description, unit, range and group of each lives in GOOP_VAR_META below. */
export interface GoopTuning {
  softness: number
  edgeSharpness: number
  edge: number
  dripCount: number
  dripLength: number
  dripSize: number
  thickness: number
  fallDistance: number
  gravity: number
  squish: number
  restingDrips: number
  dripInterval: number
  pointerReaction: number
  clickGoop: number
  clickGoopFade: number
  splashMinSpeed: number
  splashAmount: number
  oiliness: number
  shockwave: number
  inertia: number
  flowToCursor: number
  scrollSlosh: number
  tiltStrength: number
  maxDrips: number
  gloss: number
  taffy: number
  taffyLength: number
  reach: number
  reachSize: number
  reachGlobs: number
  taffyStrands: number
  globbiness: number
  strands: number
  hitVariety: number
  puddles: number
  puddleLife: number
  labelRide: number
  keyboard: number
  dripVariance: number
  idle: number
}

export type GoopVarGroup = 'Shape' | 'Drips' | 'Motion' | 'Touch' | 'Splash' | 'Finish' | 'Features'
export type GoopVarCost = 'none' | 'low' | 'medium' | 'high'

/** Everything a docs page, a tuner UI or a newcomer needs to know about one `--goop-*` var. */
export interface GoopVarMeta {
  /** The CSS custom property. */
  name: string
  /** The JS option key (camelCase of the same words). */
  option: string
  /** 2-4 word label. */
  label: string
  /** One plain-English sentence: what it does and when you'd change it. */
  description: string
  /** px, s, x (multiplier), 0-1, deg/s..., or 'keyword'. */
  unit: string
  default: number | string
  min?: number
  max?: number
  step?: number
  /** Allowed values for keyword vars. */
  values?: readonly string[]
  group: GoopVarGroup
  cost: GoopVarCost
  /** What happens under prefers-reduced-motion / data-reduced-motion. */
  reducedMotion: string
  /** Old names still read (deprecated aliases). */
  aliases?: readonly string[]
}

type TuningMeta = GoopVarMeta & { option: keyof GoopTuning; default: number; min: number; max: number; step: number }

const STATIC = 'Unchanged (static).'
const OFF = 'Off.'

/** Tuning vars, keyed by option. Source of truth for GOOP_DEFAULTS / GOOP_CSS_VARS / GOOP_LIMITS. */
const TUNING_META: { readonly [K in keyof GoopTuning]: TuningMeta & { option: K } } = {
  // ---- Shape
  softness: { name: '--goop-softness', option: 'softness', label: 'Softness', unit: 'px', default: 4, min: 0, max: 40, step: 0.5, group: 'Shape', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-blur'],
    description: 'How far apart shapes start to melt together; higher looks blobbier with rounder corners, lower looks crisper.' },
  edgeSharpness: { name: '--goop-edge-sharpness', option: 'edgeSharpness', label: 'Edge sharpness', unit: 'x', default: 20, min: 1, max: 100, step: 1, group: 'Shape', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-contrast'],
    description: 'How hard the goo outline is; lower gives a soft, slightly fuzzy edge.' },
  edge: { name: '--goop-edge', option: 'edge', label: 'Edge position', unit: '0-1', default: 0.4, min: 0.05, max: 0.95, step: 0.01, group: 'Shape', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-threshold'],
    description: 'Where the outline sits on the melted shape; lower makes everything fatter and merge from further away, higher makes necks thinner.' },
  gloss: { name: '--goop-gloss', option: 'gloss', label: 'Wet gloss', unit: '0-1', default: 0, min: 0, max: 1, step: 0.05, group: 'Shape', cost: 'low', reducedMotion: STATIC,
    description: 'Opt-in wet look: a soft top-left highlight and rim shading so the goo looks 3D. Off (flat color) by default; `gloss: true` uses 0.6.' },

  // ---- Drips
  dripCount: { name: '--goop-drip-count', option: 'dripCount', label: 'Drips per hover', unit: 'count', default: 3, min: 0, max: 8, step: 1, group: 'Drips', cost: 'low', reducedMotion: OFF,
    description: 'Most drips hanging at once while hovered; 0 turns hover drips off.' },
  dripLength: { name: '--goop-drip-length', option: 'dripLength', label: 'Drip length', unit: 'px', default: 14, min: 0, max: 200, step: 1, group: 'Drips', cost: 'none', reducedMotion: STATIC,
    description: 'How far a drip stretches below the edge before it lets go.' },
  dripSize: { name: '--goop-drip-size', option: 'dripSize', label: 'Drip size', unit: 'px', default: 7, min: 1, max: 60, step: 0.5, group: 'Drips', cost: 'none', reducedMotion: STATIC,
    description: 'Radius of a drip bulb when it is full.' },
  dripInterval: { name: '--goop-drip-interval', option: 'dripInterval', label: 'Drip rhythm', unit: 's', default: 0.9, min: 0.1, max: 10, step: 0.05, group: 'Drips', cost: 'none', reducedMotion: OFF,
    description: 'Average time between new drips while the pointer rests on the element; moving and clicking make it faster.' },
  dripVariance: { name: '--goop-drip-variance', option: 'dripVariance', label: 'Drip variety', unit: '0-1', default: 0.6, min: 0, max: 1, step: 0.05, group: 'Drips', cost: 'none', reducedMotion: STATIC,
    description: 'How different drips look from each other (length, size, neck, spacing); 0 makes them identical.' },
  restingDrips: { name: '--goop-resting-drips', option: 'restingDrips', label: 'Resting drips', unit: 'count', default: 0, min: 0, max: 8, step: 1, group: 'Drips', cost: 'low', reducedMotion: STATIC,
    description: 'Drips that always hang off the bottom edge, even when nothing happens.' },
  idle: { name: '--goop-idle', option: 'idle', label: 'Idle breathing', unit: 'on/off', default: 1, min: 0, max: 1, step: 1, group: 'Drips', cost: 'low', reducedMotion: OFF,
    description: 'Resting drips swell very slowly so the element never looks frozen.' },
  maxDrips: { name: '--goop-max-drips', option: 'maxDrips', label: 'Drip cap', unit: 'count', default: 10, min: 0, max: 48, step: 1, group: 'Drips', cost: 'none', reducedMotion: OFF,
    description: 'Hard limit on drips alive at once on this element; raise it for very wide elements.' },
  fallDistance: { name: '--goop-fall-distance', option: 'fallDistance', label: 'Fall distance', unit: 'px', default: 32, min: 0, max: 400, step: 1, group: 'Drips', cost: 'none', reducedMotion: OFF, aliases: ['--goop-fall'],
    description: 'How far a released drop falls before it has drained away (when puddles are off).' },
  gravity: { name: '--goop-gravity', option: 'gravity', label: 'Gravity', unit: 'px/s²', default: 700, min: 0, max: 10000, step: 50, group: 'Drips', cost: 'none', reducedMotion: OFF,
    description: 'How fast drops and splashes speed up as they fall.' },
  puddles: { name: '--goop-puddles', option: 'puddles', label: 'Puddles', unit: 'on/off', default: 0, min: 0, max: 1, step: 1, group: 'Drips', cost: 'low', reducedMotion: OFF,
    description: 'Opt-in: falling drops land on an invisible floor below the element, spread flat, then drain; off, they just fall and fade.' },
  puddleLife: { name: '--goop-puddle-life', option: 'puddleLife', label: 'Puddle life', unit: 's', default: 1.4, min: 0.2, max: 10, step: 0.1, group: 'Drips', cost: 'none', reducedMotion: OFF,
    description: 'How long a puddle lasts before it has fully drained.' },

  // ---- Motion
  thickness: { name: '--goop-thickness', option: 'thickness', label: 'Thickness', unit: 'x', default: 1, min: 0.2, max: 5, step: 0.05, group: 'Motion', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-viscosity'],
    description: 'How syrupy the goo is: above 1 is slower and less bouncy like honey, below 1 is quicker and springier.' },
  pointerReaction: { name: '--goop-pointer-reaction', option: 'pointerReaction', label: 'Pointer reaction', unit: 'x', default: 1, min: 0, max: 4, step: 0.05, group: 'Motion', cost: 'none', reducedMotion: OFF, aliases: ['--goop-reactivity'],
    description: 'Master strength for everything the pointer does to the goo (impact, lean, wobble, sway); 0 ignores pointer motion.' },
  inertia: { name: '--goop-inertia', option: 'inertia', label: 'Inertia', unit: 'x', default: 1, min: 0, max: 4, step: 0.05, group: 'Motion', cost: 'none', reducedMotion: OFF,
    description: 'How much the goo sloshes behind sudden pointer moves, so drips swing and goo piles up on the leading side.' },
  flowToCursor: { name: '--goop-flow-to-cursor', option: 'flowToCursor', label: 'Flow to cursor', unit: 'x', default: 1, min: 0, max: 2, step: 0.05, group: 'Motion', cost: 'none', reducedMotion: OFF, aliases: ['--goop-flow'],
    description: 'How far hanging drips creep along the edge toward the cursor.' },
  scrollSlosh: { name: '--goop-scroll-slosh', option: 'scrollSlosh', label: 'Scroll slosh', unit: 'x', default: 1, min: -3, max: 3, step: 0.05, group: 'Motion', cost: 'low', reducedMotion: OFF,
    description: 'Fast page scrolling sloshes the goo; negative flips the direction, 0 turns it off.' },
  tiltStrength: { name: '--goop-tilt-strength', option: 'tiltStrength', label: 'Tilt strength', unit: 'x', default: 1, min: 0, max: 3, step: 0.05, group: 'Motion', cost: 'low', reducedMotion: OFF, aliases: ['--goop-tilt'],
    description: 'How much tilting a phone pulls goo sideways (only with the tilt option on).' },
  labelRide: { name: '--goop-label-ride', option: 'labelRide', label: 'Label ride', unit: '0-1', default: 0.6, min: 0, max: 1, step: 0.05, group: 'Motion', cost: 'low', reducedMotion: OFF,
    description: 'How much content marked [data-goop-label] moves and squishes along with the goo.' },

  // ---- Touch
  squish: { name: '--goop-squish', option: 'squish', label: 'Press squish', unit: '0-1', default: 0.08, min: 0, max: 0.4, step: 0.01, group: 'Touch', cost: 'none', reducedMotion: OFF,
    description: 'How much the body flattens while pressed.' },
  clickGoop: { name: '--goop-click-goop', option: 'clickGoop', label: 'Goop per click', unit: 'x', default: 0.35, min: 0, max: 2, step: 0.05, group: 'Touch', cost: 'low', reducedMotion: OFF, aliases: ['--goop-click-mass'],
    description: 'Extra goo each click adds: the body swells, drips come faster and a splash drip falls.' },
  clickGoopFade: { name: '--goop-click-goop-fade', option: 'clickGoopFade', label: 'Click goop fade', unit: 's', default: 1.2, min: 0.1, max: 10, step: 0.1, group: 'Touch', cost: 'none', reducedMotion: OFF, aliases: ['--goop-mass-decay'],
    description: 'How long the extra goo from clicks takes to drain back to normal.' },
  keyboard: { name: '--goop-keyboard', option: 'keyboard', label: 'Keyboard squish', unit: 'on/off', default: 1, min: 0, max: 1, step: 1, group: 'Touch', cost: 'none', reducedMotion: OFF,
    description: 'Space or Enter on the focused element squishes it from the top and adds goop.' },
  taffy: { name: '--goop-taffy', option: 'taffy', label: 'Taffy pull', unit: 'x', default: 1, min: 0, max: 2, step: 0.05, group: 'Touch', cost: 'low', reducedMotion: OFF,
    description: 'Press and drag off the element to pull a stretchy goo string; 0 turns it off.' },
  taffyLength: { name: '--goop-taffy-length', option: 'taffyLength', label: 'Taffy snap length', unit: 'px', default: 90, min: 20, max: 400, step: 5, group: 'Touch', cost: 'none', reducedMotion: OFF,
    description: 'How far the string stretches past the edge before it snaps.' },
  reach: { name: '--goop-reach', option: 'reach', label: 'Reach distance', unit: 'px', default: 80, min: 0, max: 300, step: 5, group: 'Touch', cost: 'low', reducedMotion: OFF,
    description: 'A lump of goo swells out of the edge toward a pointer closer than this, before it touches; 0 turns it off.' },
  reachSize: { name: '--goop-reach-size', option: 'reachSize', label: 'Reach lump size', unit: 'x drip size', default: 2.6, min: 0.5, max: 5, step: 0.1, group: 'Touch', cost: 'none', reducedMotion: OFF,
    description: 'How big the lump that reaches toward the pointer gets, as a multiple of the drip size.' },
  reachGlobs: { name: '--goop-reach-globs', option: 'reachGlobs', label: 'Reach globs', unit: 'count', default: 3, min: 1, max: 4, step: 1, group: 'Touch', cost: 'low', reducedMotion: OFF,
    description: 'Most lumps that swell toward an approaching pointer; extra ones join as it gets nearer or faster.' },
  taffyStrands: { name: '--goop-taffy-strands', option: 'taffyStrands', label: 'Taffy strands', unit: 'count', default: 2, min: 0, max: 3, step: 1, group: 'Touch', cost: 'low', reducedMotion: OFF,
    description: 'Extra ropes that stretch from the edge into the pulled blob, each letting go at its own length.' },
  globbiness: { name: '--goop-globbiness', option: 'globbiness', label: 'Globbiness', unit: '0-1', default: 0.8, min: 0, max: 1, step: 0.05, group: 'Touch', cost: 'none', reducedMotion: OFF,
    description: 'How fat and lumpy reach lumps and taffy pulls are; 1 is round blobby goo, 0 is a thin smooth string.' },

  // ---- Splash
  splashMinSpeed: { name: '--goop-splash-min-speed', option: 'splashMinSpeed', label: 'Splash speed', unit: 'x1200 px/s', default: 1, min: 0.1, max: 5, step: 0.05, group: 'Splash', cost: 'none', reducedMotion: OFF, aliases: ['--goop-splash-threshold'],
    description: 'How fast the pointer must enter (1 = 1200 px/s) to punch goo out of the far side.' },
  splashAmount: { name: '--goop-splash-amount', option: 'splashAmount', label: 'Splash amount', unit: 'x', default: 1, min: 0, max: 3, step: 0.05, group: 'Splash', cost: 'medium', reducedMotion: OFF,
    description: 'How much goo a punch-through throws; 0 turns splashes off.' },
  shockwave: { name: '--goop-shockwave', option: 'shockwave', label: 'Click shockwave', unit: 'x', default: 1, min: 0, max: 3, step: 0.05, group: 'Splash', cost: 'medium', reducedMotion: OFF,
    description: 'Strength of the ring of goo and the edge ripple on each click; 0 turns it off.' },
  oiliness: { name: '--goop-oiliness', option: 'oiliness', label: 'Oiliness', unit: '0-1', default: 0.65, min: 0, max: 1, step: 0.05, group: 'Splash', cost: 'none', reducedMotion: OFF,
    description: 'Splash character: 0 is a watery spray of droplets, 1 is slow oily clumps that stretch.' },
  strands: { name: '--goop-strands', option: 'strands', label: 'Strand strength', unit: '0-1', default: 0.5, min: 0, max: 1, step: 0.05, group: 'Splash', cost: 'low', reducedMotion: OFF, aliases: ['--goop-stringiness'],
    description: 'How long splashes stay joined in strings before they snap; 0 gives loose clumps.' },
  hitVariety: { name: '--goop-hit-variety', option: 'hitVariety', label: 'Hit variety', unit: '0-1', default: 0.7, min: 0, max: 1, step: 0.05, group: 'Splash', cost: 'none', reducedMotion: OFF,
    description: 'How different each punch-through looks: big lead globs, medium drops and fine specks, a varied cone, tear-off spot and neck; 0 makes every hit the same.' },
}

/** Keyword and finish vars (not part of GoopTuning numbers). */
const OTHER_META: Readonly<Record<string, GoopVarMeta>> = {
  preset: { name: '--goop-preset', option: 'preset', label: 'Preset', unit: 'keyword', default: 'playful', values: ['subtle', 'playful', 'wild'], group: 'Features', cost: 'none', reducedMotion: 'Motion features off whatever the preset.',
    description: 'Starting point for every feature: subtle for dense UIs, playful by default, wild for hero sections.' },
  splash: { name: '--goop-splash', option: 'splash', label: 'Splash reach', unit: 'keyword', default: 'near', values: ['near', 'escape', 'off'], group: 'Splash', cost: 'medium', reducedMotion: OFF,
    description: 'Where splash goo may fly: near the element, across the whole page (escape), or nowhere.' },
  hitEffect: { name: '--goop-hit-effect', option: 'hitEffect', label: 'Hit effect', unit: 'keyword', default: 'shockwave', values: ['shockwave', 'splash', 'both', 'none'], group: 'Splash', cost: 'medium', reducedMotion: OFF,
    description: 'What a fast pointer hit does (a hard entry or a fast swipe across or out): a click-like shockwave, the punch-through glob, both, or nothing.' },
  finish: { name: '--goop-finish', option: 'finish', label: 'Finish', unit: 'keyword', default: 'solid', values: ['solid', 'oil'], group: 'Finish', cost: 'low', reducedMotion: 'Static sheen.',
    description: 'Surface look: plain color, or an oily rainbow sheen at the edges.' },
  oilIntensity: { name: '--goop-oil-intensity', option: 'oilIntensity', label: 'Oil sheen', unit: '0-1', default: 0.3, min: 0, max: 1, step: 0.05, group: 'Finish', cost: 'none', reducedMotion: STATIC,
    description: 'How strong the oily rainbow sheen is.' },
  oilBandSize: { name: '--goop-oil-band-size', option: 'oilBandSize', label: 'Oil band size', unit: 'x', default: 1, min: 0.1, max: 10, step: 0.05, group: 'Finish', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-oil-scale'],
    description: 'Size of the rainbow bands; 2 makes them twice as large.' },
  oilHueShift: { name: '--goop-oil-hue-shift', option: 'oilHueShift', label: 'Oil hue shift', unit: 'cycles', default: 0, min: 0, max: 1, step: 0.02, group: 'Finish', cost: 'none', reducedMotion: STATIC, aliases: ['--goop-oil-shift'],
    description: 'Rotates which colors show in the sheen, like a slightly thicker or thinner oil film.' },
  oilFollowPointer: { name: '--goop-oil-follow-pointer', option: 'oilFollowPointer', label: 'Oil follows pointer', unit: '0-2', default: 0, min: 0, max: 2, step: 0.05, group: 'Finish', cost: 'low', reducedMotion: OFF, aliases: ['--goop-oil-react'],
    description: 'Lets the rainbow bands drift and swirl with the mouse; 0 keeps them calm.' },
}

/** One entry per `--goop-*` var, keyed by JS option name. The single source of truth for
 *  names, labels, descriptions, units, defaults, ranges, groups, cost and reduced motion. */
export const GOOP_VAR_META: Readonly<Record<string, GoopVarMeta>> = Object.freeze({ ...TUNING_META, ...OTHER_META })

const TUNING_KEYS = Object.keys(TUNING_META) as (keyof GoopTuning)[]

export const GOOP_DEFAULTS: Readonly<GoopTuning> = Object.freeze(
  Object.fromEntries(TUNING_KEYS.map((k) => [k, TUNING_META[k].default])) as unknown as GoopTuning,
)

/** CSS custom property name for each tuning knob. */
export const GOOP_CSS_VARS: Readonly<Record<keyof GoopTuning, string>> = Object.freeze(
  Object.fromEntries(TUNING_KEYS.map((k) => [k, TUNING_META[k].name])) as Record<keyof GoopTuning, string>,
)

/** Sanity clamps applied after reading CSS / options, so a bad value can't explode the sim. */
export const GOOP_LIMITS: Readonly<Record<keyof GoopTuning, readonly [number, number]>> = Object.freeze(
  Object.fromEntries(TUNING_KEYS.map((k) => [k, [TUNING_META[k].min, TUNING_META[k].max] as const])) as Record<
    keyof GoopTuning,
    readonly [number, number]
  >,
)

/** Deprecated CSS var name -> new name (old names keep working, with a one-time dev warning). */
export const GOOP_VAR_RENAMES: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.values(GOOP_VAR_META).flatMap((m) => (m.aliases ?? []).map((a) => [a, m.name] as const)),
  ),
)

/** Deprecated JS option name -> new option name. */
export const GOOP_OPTION_RENAMES: Readonly<Record<string, string>> = Object.freeze({
  blur: 'softness',
  contrast: 'edgeSharpness',
  threshold: 'edge',
  viscosity: 'thickness',
  fall: 'fallDistance',
  reactivity: 'pointerReaction',
  clickMass: 'clickGoop',
  massDecay: 'clickGoopFade',
  splashThreshold: 'splashMinSpeed',
  flow: 'flowToCursor',
  stringiness: 'strands',
  oilScale: 'oilBandSize',
  oilShift: 'oilHueShift',
  oilReact: 'oilFollowPointer',
})

/** Where splash / shockwave particles may go. `--goop-splash: near | escape | off`. */
export type GoopSplashMode = 'near' | 'escape' | 'off'
export const GOOP_SPLASH_VAR = '--goop-splash'
export const GOOP_DEFAULT_SPLASH: GoopSplashMode = 'near'

/** What a fast pointer "hit" (hard entry, fast swipe across or out) does. `--goop-hit-effect`. */
export type GoopHitEffect = 'shockwave' | 'splash' | 'both' | 'none'
export const GOOP_HIT_VAR = '--goop-hit-effect'
export const GOOP_DEFAULT_HIT: GoopHitEffect = 'shockwave'

// ---- presets --------------------------------------------------------------------------
//
// `preset: 'subtle' | 'playful' | 'wild'` (or `--goop-preset`) replaces the defaults above
// for the knobs it lists. Precedence: JS option > CSS var > preset > GOOP_DEFAULTS.
// 'playful' is the default and equals GOOP_DEFAULTS.

export type GoopPreset = 'subtle' | 'playful' | 'wild'
export const GOOP_PRESET_VAR = '--goop-preset'
export const GOOP_DEFAULT_PRESET: GoopPreset = 'playful'

export interface GoopPresetValues {
  tuning: Partial<GoopTuning>
  splash: GoopSplashMode
  hitEffect?: GoopHitEffect
}

export const GOOP_PRESETS: Readonly<Record<GoopPreset, GoopPresetValues>> = Object.freeze({
  /** Calm enough for a dense dashboard: one slow drip, small reactions, no flying goo. */
  subtle: {
    splash: 'off',
    tuning: {
      dripCount: 1,
      dripInterval: 2.2,
      pointerReaction: 0.45,
      inertia: 0.5,
      flowToCursor: 0.4,
      squish: 0.05,
      clickGoop: 0.12,
      shockwave: 0.35,
      splashAmount: 0,
      scrollSlosh: 0,
      taffy: 0,
      reach: 0,
      strands: 0,
      puddles: 0,
      labelRide: 0.3,
    },
  },
  /** The default: everything on at shadcn-friendly strengths. */
  playful: { splash: 'near', tuning: {} },
  /** Hero sections: big, fast, sloppy. Splashes escape across the page. */
  wild: {
    splash: 'escape',
    hitEffect: 'both',
    tuning: {
      dripCount: 5,
      dripInterval: 0.5,
      pointerReaction: 1.6,
      inertia: 1.6,
      flowToCursor: 1.3,
      squish: 0.12,
      clickGoop: 0.5,
      shockwave: 2,
      splashAmount: 2,
      splashMinSpeed: 0.7,
      oiliness: 0.85,
      strands: 1,
      hitVariety: 0.9,
      scrollSlosh: 1.5,
      gloss: 0.5,
      taffy: 1.5,
      taffyLength: 150,
      reach: 110,
      puddles: 1,
      puddleLife: 2.2,
      labelRide: 0.8,
    },
  },
})

/**
 * A spring described the way designers tune them (Apple/SwiftUI style):
 * `response` = seconds for one undamped oscillation (lower = snappier),
 * `dampingRatio` = 1 is critically damped (no overshoot), <1 bounces, >1 is sluggish.
 */
export interface SpringFeel {
  response: number
  dampingRatio: number
}

/** Engine-level feel constants. Times in seconds, distances in px, unless noted. */
export const GOOP_PHYSICS = Object.freeze({
  // ---- spawning --------------------------------------------------------------
  /** Max random extra delay between drips spawned by one hover, per drip index. */
  spawnStagger: 0.16,
  /** Min horizontal gap between drip anchors, as a multiple of dripSize. */
  minSpacing: 3.2,
  /** The first drip spawns this close (px, +/-) to where the pointer entered. */
  pointerJitter: 6,
  /** Default cap of live drips per element (attached + falling); see --goop-max-drips. */
  maxDrips: 10,
  /** Random spread for per-drip size / swell time / fall distance (fraction, +/-). */
  sizeJitter: 0.2,
  swellJitter: 0.35,
  fallJitter: 0.25,

  // ---- swelling + necking (drip still attached) ------------------------------
  /** Seconds of continuous hover for a drip to fill up and detach (x viscosity). */
  swellTime: 0.95,
  /** Seconds for an un-fed drip to drain back (x viscosity). Shorter = sucked back faster. */
  drainTime: 0.3,
  /** Hang length follows fill^hangCurve: >1 means it lingers short then sags late, like
   *  a drop getting heavy. */
  hangCurve: 1.2,
  /** Fill must be 1 and hang at least this fraction of dripLength to detach. */
  detachAt: 0.9,
  /** Number of neck circles between the edge and the bulb (plus one root/meniscus). */
  neckSegments: 4,
  /** How much the neck thins in the middle at full fill (0 = no necking, 0.7 = very thin). */
  neckPinch: 0.55,
  /** Root (meniscus) radius as a fraction of the bulb radius. Wider = fatter fillet. */
  rootScale: 1.05,
  /** Neck radius at the bulb end, as a fraction of bulb radius. */
  neckTipScale: 0.72,
  /** Hover feed multiplier while the element is pressed (squeezing goo out). */
  pressFeedBoost: 2.2,
  /** Tap drips (touch/pen) swell this much faster than hover drips. */
  tapSwellScale: 0.6,
  /** Viscous hang while fed: heavily damped creep. */
  hangSpring: { response: 0.32, dampingRatio: 0.95 } as SpringFeel,
  /** Retract when the pointer leaves before detach: springy suck-back. */
  retractSpring: { response: 0.3, dampingRatio: 0.7 } as SpringFeel,
  /** The stub left on the body after a drop detaches snaps back with this. */
  stubSpring: { response: 0.42, dampingRatio: 0.6 } as SpringFeel,

  // ---- detached drop ---------------------------------------------------------
  /** Downward velocity added at detach (px/s). */
  detachKick: 40,
  /** Linear drag on the falling drop (1/s). Higher = floatier, more viscous fall. */
  dropDrag: 4,
  /** Fraction of radius lost by the end of the fall. */
  dropShrink: 0.35,
  /** Opacity fade starts at this fraction of the fall. */
  dropFadeStart: 0.65,
  /** Vertical stretch per px/s of fall speed (scaleY = 1 + v * k), capped. */
  dropStretch: 0.0009,
  dropMaxStretch: 0.45,

  // ---- body ------------------------------------------------------------------
  /** Squish in. */
  pressSpring: { response: 0.14, dampingRatio: 0.75 } as SpringFeel,
  /** Rebound on release: underdamped so it wobbles once or twice. */
  releaseSpring: { response: 0.4, dampingRatio: 0.32 } as SpringFeel,
  /** Horizontal bulge per unit of vertical squish (volume-ish preservation). */
  squishSpread: 0.55,
  /** Body scale velocity impulse when a drop detaches (the edge snaps up). */
  detachRecoil: 0.3,

  // ---- pointer reactivity (all scaled by --goop-reactivity) -------------------
  /** Pointer velocity smoothing time constant (s). Higher = calmer, laggier velocity. */
  pointerSmoothing: 0.05,
  /** Pointer speed (px/s) treated as "fast" (normalized speed 1). Normalized speed is capped at 2. */
  speedRef: 1200,
  /** Body jelly spring: translation, extra scale, skew all ring on this. */
  jellySpring: { response: 0.34, dampingRatio: 0.32 } as SpringFeel,
  /** Entry impact: body translation velocity (px/s) per px/s of pointer speed. */
  impactPush: 0.085,
  /** Entry impact: squash along the travel axis (scale velocity per unit normalized speed). */
  impactSquash: 1.6,
  /** Max body translation from any pointer effect (px). */
  maxOffset: 8,
  /** Max extra squash/stretch from pointer effects (fraction). */
  maxDeform: 0.16,
  /** While hovering, the body leans toward the pointer by up to this many px (with lag). */
  leanPx: 3,
  /** Skew (deg) per px/s of horizontal pointer velocity while hovering, and its clamp. */
  skewPerVelocity: 0.006,
  maxSkew: 9,
  /** Exit pull: translation velocity per px/s of exit speed, and stretch along exit axis. */
  exitPull: 0.07,
  exitStretch: 0.6,
  /** Fast exits (normalized speed above this) heading down yank fat drips (fill > yankFill) off. */
  yankSpeed: 0.6,
  yankFill: 0.5,
  /** Drip sway clamp (in dripSize units) and spring. Sway itself is driven by slosh. */
  maxSway: 1.6,
  swaySpring: { response: 0.4, dampingRatio: 0.45 } as SpringFeel,
  /** Fast entries make bigger drips: size x (1 + burstSize * normalized speed). */
  burstSize: 0.18,
  /** First drip spawns ahead of the pointer by velocity x this (s), i.e. where it is heading. */
  leadTime: 0.08,

  // ---- rhythm (continuous dripping while hovered) ---------------------------
  /** Interval jitter (+/- fraction). */
  rhythmJitter: 0.35,
  /** Interval divisor gains: interval / (1 + speed*rhythmSpeed + mass*rhythmMass). */
  rhythmSpeed: 1.5,
  rhythmMass: 1.5,

  // ---- clicks add goop -------------------------------------------------------
  /** Cap on accumulated click mass. */
  maxMass: 1.6,
  /** Body scale growth per unit of mass. */
  massSwell: 0.035,
  /** Drip feed-rate boost per unit of mass. */
  massFeed: 1,
  /** Splash drip: swell time scale (lower = faster detach) and size gain per unit of mass. */
  splashSwellScale: 0.35,
  splashSizePerMass: 0.25,
  /** Above this mass, a click also throws a second smaller drip next to the first. */
  doubleSplashMass: 0.8,

  // ---- direction: inertia / slosh, flow ---------------------------------------
  /** The goo's "center of mass" offset (px) rings on this spring. Low damping = sloshy. */
  sloshSpring: { response: 0.62, dampingRatio: 0.28 } as SpringFeel,
  /** Slosh velocity (px/s) per px/s of pointer velocity CHANGE (x --goop-inertia x reactivity).
   *  Opposite sign: liquid lags behind the acceleration, like a jerked cup. */
  sloshPerAccel: 0.05,
  /** Max slosh offset (px). */
  maxSlosh: 14,
  /** Slosh -> drip swing (px of bulb sway per px of slosh at full hang). */
  sloshSway: 1.1,
  /** Slosh -> body: translation (fraction of slosh), skew (deg per px). */
  sloshBody: 0.35,
  sloshSkew: 0.45,
  /** Slosh -> extra hang (px per px of vertical slosh). */
  sloshStretch: 0.9,
  /** Leading side of the slosh feeds drips up to (1 + this) faster, trailing side slower. */
  sloshFeedBias: 0.9,
  /** Scroll: slosh velocity per px/s of scroll velocity change (x --goop-scroll-slosh). */
  sloshPerScroll: 0.04,
  /** Tilt: slosh offset (px) at full sideways tilt, and particle sideways gravity fraction. */
  tiltSlosh: 10,
  tiltGravity: 0.6,
  /** Flow toward the pointer: fraction of the distance fed drips creep (x --goop-flow), and
   *  the lag time constant (s, x viscosity). */
  flowPull: 0.45,
  flowLag: 0.9,
  /** Directional spray: velocity bias added to spawn directions per unit normalized speed. */
  sprayBias: 0.9,
  /** Keyboard press: downward body kick (px/s) and squash velocity. */
  keyPush: 60,
  keySquash: 0.9,

  // ---- oil film (SVG renderer flow) --------------------------------------------
  /** Ambient band drift (px/s) while the goo is animating. Pointer-independent. */
  oilDrift: 6,
  /** Resting film swirl (contour bend); pointer speed adds to it only with --goop-oil-react. */
  oilSwirl: 0.3,

  // ---- resting drips: idle breathing ---------------------------------------------
  /** Breathing swell amplitude (fraction) and period (s). Redrawn at idleFps only. */
  idleSwell: 0.07,
  idlePeriod: 3.6,
  idleFps: 12,

  // ---- puddles / strings / taffy / reach / gloss ---------------------------------
  /** Flattest a puddle gets (minor/major radius ratio before area-preserving spread). */
  puddleFlatten: 0.5,
  /** Chain bonds (stringiness): stiffness per 1/60 s at stringiness 1, and the stretch
   *  factor at which a bond snaps (rest x (2 + this x stringiness)). */
  bondStiffness: 0.35,
  bondBreak: 6,
  /** Taffy: string circle count, sag (px at full length), recoil spring, follow lag (s). */
  taffySegments: 9,
  taffySag: 10,
  taffyFollow: 0.06,
  taffySpring: { response: 0.34, dampingRatio: 0.34 } as SpringFeel,
  /** Touch long-press before taffy can start (s). */
  taffyLongPress: 0.35,
  /** Reach: bulge length (px) at full strength, blob radius (x dripSize), speed boost. */
  reachBulge: 9,
  reachSize: 1.25,
  reachSpeedBoost: 0.6,
  /** Max swell / shrink rate of reach lumps (amount per second). */
  reachMaxRate: 2.2,
  reachSpring: { response: 0.5, dampingRatio: 0.62 } as SpringFeel,
  /** The reach lump lags the cursor on this spring: low damping = wobbly. */
  reachLumpSpring: { response: 0.3, dampingRatio: 0.38 } as SpringFeel,

  // ---- particle fluid (splash-through + shockwave) ---------------------------
  /** Hard caps: particles per element, and across the whole page (all elements + overlay). */
  maxParticles: 64,
  maxParticlesGlobal: 320,
  /** Fluid integrator substep (s). Large frames are split into these. */
  fluidSubstep: 1 / 120,
  /** Particle radius as a fraction of dripSize (watery -> oily), floored above the vanish radius. */
  particleSize: [0.7, 0.85] as readonly [number, number],
  /** Cohesion stiffness per substep (watery -> oily). Pulls neighbors to the rest distance. */
  cohesion: [0.015, 0.09] as readonly [number, number],
  /** XSPH viscosity: neighbors share velocity (watery -> oily). Keeps strings moving together. */
  fluidViscosity: [0.01, 0.12] as readonly [number, number],
  /** Air drag (1/s) in flight (watery -> oily). */
  fluidDrag: [1.4, 3.4] as readonly [number, number],
  /** Launch speed multiplier (watery -> oily): oil is slower. */
  fluidSpeed: [1, 0.75] as readonly [number, number],
  /** Neighbor reach as a multiple of radius (watery -> oily). Longer reach = longer strings. */
  fluidReach: [2, 3.3] as readonly [number, number],
  /** Rest distance between neighbors as a multiple of radius. */
  fluidRest: 1.5,
  /** A particle starts to drip (fall + drain) when slower than this (px/s), or after maxFlight s. */
  dripSpeed: 70,
  maxFlight: 0.55,
  /** Drip phase: drag (1/s) and lifetime range (s, x viscosity) until drained. */
  dripDrag: 1.2,
  dripLife: [0.45, 0.85] as readonly [number, number],
  /** Splash-through: base and per-speed particle counts (x --goop-splash-amount), cone half-angle (rad). */
  splashCount: 9,
  splashCountPerSpeed: 9,
  splashMaxBurst: 28,
  splashCone: 0.6,
  /** Launch speed (px/s) at the threshold, plus extra per unit of normalized speed above it. */
  splashSpeed: 230,
  splashSpeedPerSpeed: 100,
  /** Near mode: how far past the element particles may go (px) before heavy drag stops them. */
  nearReach: 70,
  /** Escape mode: speed multiplier and drag multiplier (fly across the page). */
  escapeSpeed: 2.6,
  escapeDrag: 0.35,
  /** Click shockwave ring: particles = (base + perMass * mass) x --goop-shockwave, capped. */
  shockCount: 8,
  shockCountPerMass: 6,
  shockMaxBurst: 22,
  shockSpeed: 170,
  shockSpeedPerMass: 90,
  /** How much the ring is pushed outward from the element's center (0 = pure ring). */
  shockOutwardBias: 0.5,
  /** Edge ripple: front speed (px/s), bump radius (px) base/per mass, cap, live ripples cap. */
  rippleSpeed: 380,
  rippleSize: 3,
  rippleSizePerMass: 2,
  rippleMaxSize: 6.5,
  /** Strong shockwaves may grow the ripple up to this fraction of the element's short side. */
  rippleMaxFraction: 0.3,
  maxRipples: 3,
  /** Momentum hits: base and max shockwave strength (x --goop-shockwave), share of click
   *  goop added, and the minimum time between hits (s). */
  hitBaseStrength: 0.7,
  hitMaxStrength: 1.6,
  hitGoop: 0.5,
  hitCooldown: 0.25,
  /** Pass-through: the entry dent's share of the hit strength, the wave's travel time across
   *  the body (s, faster hits travel quicker, min), and the wave's edge bump size (x drip). */
  hitEntryShare: 0.3,
  hitWaveTime: 0.15,
  hitWaveMin: 0.08,
  hitWaveSize: 0.9,
  /** Far-side eruption: lumps spring out and back on this spring (low damping = wobbly), the
   *  launch kick (x the lump's max push per second), max lumps. */
  eruptSpring: { response: 0.36, dampingRatio: 0.36 } as SpringFeel,
  eruptKick: 16,
  eruptMaxLumps: 4,
  /** Droplets torn off the far edge per hit: min, max, and extra per unit of hit speed. */
  eruptDropsMin: 4,
  eruptDropsMax: 14,
  eruptDropsPerSpeed: 1.5,
  /** Hit spray size classes (x the usual splash droplet) and speeds (x the base throw): big
   *  slow lead globs, medium drops, fast fine specks. Below `eruptSlowSpeed` (x speedRef over
   *  the splash threshold) a hit only oozes out 1-3 fat drops that barely leave. */
  eruptLeadSize: 2.1,
  eruptLeadSpeed: 0.6,
  eruptMidSize: 1.15,
  eruptMidSpeed: 0.95,
  eruptSpeckSize: 0.4,
  eruptSpeckSpeed: 1.5,
  eruptSlowSpeed: 0.1,
  /** Lead-glob neck: how long (s) it stays stretched on a thin neck before it snaps. */
  eruptNeckTime: 0.09,
  /** Shockwave body pulse: jelly velocity kick away from the click point. */
  shockPush: 26,
  shockSquash: 0.5,

  // ---- resting drips (static) -----------------------------------------------
  /** Hang and size of static resting drips relative to dripLength / dripSize. */
  restingHang: 0.45,
  restingSize: 0.8,

  // ---- loop ------------------------------------------------------------------
  /** Largest dt (s) one frame may advance. Stops tab-switch jumps. */
  maxDt: 1 / 20,
})

// All goopUI feel tuning lives in this file.
//
// Two tiers:
//   GOOP_DEFAULTS : per-element knobs. Each one can be overridden from CSS with the
//                   matching `--goop-*` custom property (see GOOP_CSS_VARS) or from JS
//                   via attachGoop(el, { ... }). Precedence: JS option > CSS var > default.
//   GOOP_PHYSICS  : engine-level constants (spring feel, timings, shape ratios). Not
//                   exposed as CSS vars; edit here while dialing in the feel.

/** Per-element tuning knobs. Every field maps 1:1 to a `--goop-*` CSS custom property. */
export interface GoopTuning {
  /** `--goop-blur` (px). Gaussian blur stdDeviation of the goo filter. Higher = blobbier,
   *  wider necks and fillets, rounder corners on the body. Keep it below ~dripSize or
   *  small drips vanish under the alpha threshold. */
  blur: number
  /** `--goop-contrast`. Alpha multiplier after the blur. Higher = crisper goo edge,
   *  lower = softer / more aliased-looking edge. */
  contrast: number
  /** `--goop-threshold` (0..1). Blurred alpha level that becomes the goo edge. Lower =
   *  shapes bulge outward and merge from further away; higher = tighter, thinner necks. */
  threshold: number
  /** `--goop-drip-count`. Max drips spawned per hover (a random 1..N, capped by width). */
  dripCount: number
  /** `--goop-drip-length` (px). How far the bulb hangs below the edge before it detaches. */
  dripLength: number
  /** `--goop-drip-size` (px). Bulb radius at full swell (randomized +/- GOOP_PHYSICS.sizeJitter). */
  dripSize: number
  /** `--goop-viscosity`. Global thickness multiplier. 1 = default. >1 = slower swell,
   *  slower hang, less bounce (honey). <1 = quicker and springier (syrup/water). */
  viscosity: number
  /** `--goop-fall` (px). Mean distance a detached drop falls before it is gone
   *  (randomized +/- GOOP_PHYSICS.fallJitter, so 32 gives roughly 24-40). */
  fall: number
  /** `--goop-gravity` (px/s^2). Acceleration of detached drops. */
  gravity: number
  /** `--goop-squish` (0..0.4). How much the body compresses vertically on press. 0 disables. */
  squish: number
  /** `--goop-resting-drips`. Static drips that always hang off the bottom edge (no motion).
   *  These are also what remains in reduced-motion mode. */
  restingDrips: number
  /** `--goop-drip-interval` (s). Mean time between new drips while the pointer rests on the
   *  element. Movement and recent clicks shorten it (see GOOP_PHYSICS.rhythm*). */
  dripInterval: number
  /** `--goop-reactivity`. Scales every pointer-driven reaction: entry impact, hover lean,
   *  skew/wobble, drip sway, exit pull. 0 = goo ignores pointer motion, 2 = very jelly. */
  reactivity: number
  /** `--goop-click-mass`. Goop added per click (dimensionless; capped at
   *  GOOP_PHYSICS.maxMass). Swells the body, speeds dripping, spawns a splash drip. 0 disables. */
  clickMass: number
  /** `--goop-mass-decay` (s). Time constant for click-added goop to drain back to rest. */
  massDecay: number
  /** `--goop-splash-threshold`. Entry speed (in units of GOOP_PHYSICS.speedRef px/s, so
   *  1 = 1200 px/s) above which the pointer punches goo out through the far side. */
  splashThreshold: number
  /** `--goop-splash-amount`. Particle count multiplier for punch-through splashes. 0 disables. */
  splashAmount: number
  /** `--goop-oiliness` (0..1). 0 = watery: fast, loose spray of separate droplets.
   *  1 = oily: slow, cohesive clumps that stretch into strings and tendrils before snapping. */
  oiliness: number
  /** `--goop-shockwave`. Strength of the click shockwave (particle ring + edge ripple). 0 disables. */
  shockwave: number
  /** `--goop-inertia`. How strongly the goo carries pointer momentum (slosh opposite to the
   *  pointer's acceleration: drips swing, mass shifts to the leading side). 0 disables. */
  inertia: number
  /** `--goop-flow`. How far hanging drips creep along the edge toward the cursor. 0 disables. */
  flow: number
  /** `--goop-scroll-slosh`. Page scroll sloshes the goo (scroll down fast -> drips lag up,
   *  then swing). 0 disables; negative flips the direction. */
  scrollSlosh: number
  /** `--goop-tilt`. Device tilt shifts gravity sideways (mobile). Only used when the element
   *  opts in with `tilt: true` (needs requestTiltPermission() on iOS). 0 disables. */
  tiltStrength: number
  /** `--goop-max-drips`. Cap on live drips for this element (wide edges can raise it). */
  maxDrips: number
}


/** Where splash / shockwave particles may go. `--goop-splash: near | escape | off`. */
export type GoopSplashMode = 'near' | 'escape' | 'off'
export const GOOP_SPLASH_VAR = '--goop-splash'
export const GOOP_DEFAULT_SPLASH: GoopSplashMode = 'near'


export const GOOP_DEFAULTS: Readonly<GoopTuning> = Object.freeze({
  blur: 4,
  contrast: 20,
  threshold: 0.4,
  dripCount: 3,
  dripLength: 14,
  dripSize: 7,
  viscosity: 1,
  fall: 32,
  gravity: 700,
  squish: 0.08,
  restingDrips: 0,
  dripInterval: 0.9,
  reactivity: 1,
  clickMass: 0.35,
  massDecay: 1.2,
  splashThreshold: 1,
  splashAmount: 1,
  oiliness: 0.65,
  shockwave: 1,
  inertia: 1,
  flow: 1,
  scrollSlosh: 1,
  tiltStrength: 1,
  maxDrips: 10,
})

/** CSS custom property name for each tuning knob. */
export const GOOP_CSS_VARS: Readonly<Record<keyof GoopTuning, string>> = Object.freeze({
  blur: '--goop-blur',
  contrast: '--goop-contrast',
  threshold: '--goop-threshold',
  dripCount: '--goop-drip-count',
  dripLength: '--goop-drip-length',
  dripSize: '--goop-drip-size',
  viscosity: '--goop-viscosity',
  fall: '--goop-fall',
  gravity: '--goop-gravity',
  squish: '--goop-squish',
  restingDrips: '--goop-resting-drips',
  dripInterval: '--goop-drip-interval',
  reactivity: '--goop-reactivity',
  clickMass: '--goop-click-mass',
  massDecay: '--goop-mass-decay',
  splashThreshold: '--goop-splash-threshold',
  splashAmount: '--goop-splash-amount',
  oiliness: '--goop-oiliness',
  shockwave: '--goop-shockwave',
  inertia: '--goop-inertia',
  flow: '--goop-flow',
  scrollSlosh: '--goop-scroll-slosh',
  tiltStrength: '--goop-tilt',
  maxDrips: '--goop-max-drips',
})

/** Sanity clamps applied after reading CSS / options, so a bad value can't explode the sim. */
export const GOOP_LIMITS: Readonly<Record<keyof GoopTuning, readonly [number, number]>> = Object.freeze({
  blur: [0, 40],
  contrast: [1, 100],
  threshold: [0.05, 0.95],
  dripCount: [0, 8],
  dripLength: [0, 200],
  dripSize: [1, 60],
  viscosity: [0.2, 5],
  fall: [0, 400],
  gravity: [0, 10000],
  squish: [0, 0.4],
  restingDrips: [0, 8],
  dripInterval: [0.1, 10],
  reactivity: [0, 4],
  clickMass: [0, 2],
  massDecay: [0.1, 10],
  splashThreshold: [0.1, 5],
  splashAmount: [0, 3],
  oiliness: [0, 1],
  shockwave: [0, 3],
  inertia: [0, 4],
  flow: [0, 2],
  scrollSlosh: [-3, 3],
  tiltStrength: [0, 3],
  maxDrips: [0, 48],
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
  maxRipples: 3,
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

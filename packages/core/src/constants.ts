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
}

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
  /** Hard cap of live drips per element (attached + falling). */
  maxDrips: 8,
  /** Random spread for per-drip size / swell time / fall distance (fraction, +/-). */
  sizeJitter: 0.2,
  swellJitter: 0.35,
  fallJitter: 0.25,

  // ---- swelling + necking (drip still attached) ------------------------------
  /** Seconds of continuous hover for a drip to fill up and detach (x viscosity). */
  swellTime: 0.95,
  /** Seconds for an un-fed drip to drain back (x viscosity). Shorter = sucked back faster. */
  drainTime: 0.14,
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
  retractSpring: { response: 0.24, dampingRatio: 0.5 } as SpringFeel,
  /** The stub left on the body after a drop detaches snaps back with this. */
  stubSpring: { response: 0.3, dampingRatio: 0.45 } as SpringFeel,

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

  // ---- resting drips (static) -----------------------------------------------
  /** Hang and size of static resting drips relative to dripLength / dripSize. */
  restingHang: 0.45,
  restingSize: 0.8,

  // ---- loop ------------------------------------------------------------------
  /** Largest dt (s) one frame may advance. Stops tab-switch jumps. */
  maxDt: 1 / 20,
})

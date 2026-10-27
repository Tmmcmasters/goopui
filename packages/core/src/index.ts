// @goopui/core — framework-agnostic engine.
// Everything here must be plain TS + DOM: no Vue, React, or Svelte imports.
// Framework packages (@goopui/vue, @goopui/react, @goopui/svelte) wrap these primitives.
// Nothing in this module graph touches `document`/`window` at import time (SSR-safe).

import { GOOP_DEFAULTS } from './constants'

export const VERSION = '0.0.0'

export { attachGoop, type GoopDebugState, type GoopHandle, type GoopOptions } from './goop'
export {
  ParticleFluid,
  drainRadius,
  fluidParams,
  liveParticleCount,
  type FluidBounds,
  type ParticleSpawn,
} from './fluid'
export {
  ESCAPE_MAX_PARTICLES,
  acquireEscapeLayer,
  escapeLayerRefs,
  type EscapeLease,
  type EscapeOptions,
} from './escape'
export { requestTiltPermission, trackScroll, trackTilt, type ScrollTracker, type TiltTracker } from './motion'
export {
  GOOP_CSS_VARS,
  GOOP_DEFAULTS,
  GOOP_LIMITS,
  GOOP_DEFAULT_SPLASH,
  GOOP_PHYSICS,
  GOOP_SPLASH_VAR,
  GOOP_HIT_VAR,
  GOOP_DEFAULT_HIT,
  type GoopHitEffect,
  GOOP_VAR_META,
  GOOP_VAR_RENAMES,
  GOOP_OPTION_RENAMES,
  GOOP_PRESETS,
  GOOP_PRESET_VAR,
  GOOP_DEFAULT_PRESET,
  type GoopPreset,
  type GoopVarMeta,
  type GoopVarGroup,
  type GoopVarCost,
  type GoopSplashMode,
  type GoopTuning,
  type SpringFeel,
} from './constants'
export { gooParamsOf, readPreset, readTuning, renameOptions } from './tuning'
export {
  GOO_DEFS_ATTR,
  GOO_FILTER_REGION,
  acquireGooFilter,
  OIL_PALETTE,
  createOilFilter,
  gooColorMatrix,
  type OilFilter,
  type OilFinishParams,
  gooVanishRadius,
  gooFilterId,
  gooFilterMarkup,
  gooFilterRefCount,
  type GooFilterLease,
  type GooFilterParams,
} from './filter'
export {
  GOOP_PART_ATTR,
  createSvgFilterRenderer,
  type GoopBlob,
  type GoopBodyTransform,
  type GoopSheen,
  type GoopLayerPadding,
  type GoopRenderer,
  type GoopRendererFactory,
} from './renderer'
export {
  createCanvasRenderer,
  makeCanvasRenderer,
  type CanvasBodyPose,
  type CanvasGoopRenderer,
  type CanvasRendererOptions,
} from './renderers/canvas'
export {
  GOOP_OVERLAY_ATTR,
  acquireGoopOverlay,
  goopOverlayCount,
  type GoopOverlay,
  type GoopOverlayOptions,
} from './renderers/overlay'
export { gooCanvasBackend, gooCanvasRefCount, isSoftwareGl, type CanvasBackend } from './renderers/shared'
export {
  GOOP_FINISH_DEFAULTS,
  GOOP_FINISH_VARS,
  readFinish,
  type GoopFinish,
  type GoopFinishName,
  type GoopFinishRenderer,
} from './renderers/finish'
export { resolveRenderer, type GoopRendererName, type GoopRendererOption } from './renderers/resolve'
export { DripField, type Drip, type DripContext, type RestingDrip, type SpawnOptions } from './drips'
export {
  clampDt,
  isSpringSettled,
  springConfig,
  stepFall,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from './spring'
export { activeTickerCount, isLoopRunning, loopStats, removeTicker, setGoopTimeScale, wakeTicker, type Ticker } from './loop'
export { isReducedMotion, watchReducedMotion } from './reduced-motion'

/** @deprecated Use GOOP_DEFAULTS. Kept so existing imports keep compiling. */
export const defaultGoopOptions = GOOP_DEFAULTS
export { trackPointer, type PointerSample, type PointerTracker } from './pointer'
export {
  SPINNER_DEFAULT_BLOBS,
  SPINNER_DEFAULT_VARIANT,
  SPINNER_FEEL,
  SPINNER_MAX_BLOBS,
  SPINNER_MIN_BLOBS,
  SPINNER_VARIANTS,
  attachSpinner,
  spinnerCircleCount,
  spinnerGooParams,
  spinnerPose,
  spinnerStaticPose,
  spinnerVariantPose,
  type SpinnerCircle,
  type SpinnerFeel,
  type SpinnerHandle,
  type SpinnerNeckState,
  type SpinnerOptions,
  type SpinnerVariant,
} from './spinner'
export {
  SPINNER_GRAB_LUMPS,
  SPINNER_INTERACT,
  SPINNER_NO_INTERACTION,
  createSpinnerJelly,
  type SpinnerInteractFlags,
  type SpinnerJelly,
  type SpinnerPointer,
} from './spinner-interact'
export {
  SWITCH_ALL_EFFECTS,
  SWITCH_EFFECTS,
  SWITCH_FEEL,
  SWITCH_FILL_CIRCLES,
  SWITCH_FILL_COLOR_VAR,
  SWITCH_THUMB_CIRCLES,
  SWITCH_THUMB_COLOR_VAR,
  SWITCH_TRAVEL,
  attachSwitch,
  switchEffectValue,
  switchGooParams,
  switchMetrics,
  switchPose,
  switchPosition,
  switchStaticPose,
  type SwitchCircle,
  type SwitchEffect,
  type SwitchEffects,
  type SwitchFeel,
  type SwitchGeometry,
  type SwitchHandle,
  type SwitchOptions,
  type SwitchPose,
} from './switch'
export {
  EMERGE_CIRCLES,
  EMERGE_CLOSE_VAR,
  EMERGE_CONTENT_VAR,
  EMERGE_FEEL,
  EMERGE_NECK_LUMPS,
  EMERGE_STATE_ATTR,
  EMERGE_STILL_ATTR,
  attachEmerge,
  emergeBridge,
  emergeGooParams,
  emergeJelly,
  emergeOverflow,
  emergePose,
  emergeRestPose,
  emergeSnapTime,
  type EmergeBody,
  type EmergeBridge,
  type EmergeCircle,
  type EmergeEffects,
  type EmergeFeel,
  type EmergeHandle,
  type EmergeOptions,
  type EmergePhase,
  type EmergePoint,
  type EmergePose,
  type EmergeRect,
  type EmergeSide,
  type EmergeState,
} from './emerge'
export {
  EMERGE_MOMENTUM,
  EMERGE_MOMENTUM_CIRCLES,
  EMERGE_MOMENTUM_DRIPS,
  emergeCloseSlosh,
  emergeMomentum,
  emergeMomentumEnd,
  emergeMomentumStrength,
  emergeSloshOffset,
  type EmergeMomentumContext,
  type EmergeMomentumEffects,
} from './emerge-momentum'

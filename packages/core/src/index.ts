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
export { gooCanvasBackend, gooCanvasRefCount, type CanvasBackend } from './renderers/shared'
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

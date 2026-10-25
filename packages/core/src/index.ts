// @goopui/core — framework-agnostic engine.
// Everything here must be plain TS + DOM: no Vue, React, or Svelte imports.
// Framework packages (@goopui/vue, @goopui/react, @goopui/svelte) wrap these primitives.
// Nothing in this module graph touches `document`/`window` at import time (SSR-safe).

import { GOOP_DEFAULTS } from './constants'

export const VERSION = '0.0.0'

export { attachGoop, type GoopHandle, type GoopOptions } from './goop'
export {
  GOOP_CSS_VARS,
  GOOP_DEFAULTS,
  GOOP_LIMITS,
  GOOP_PHYSICS,
  type GoopTuning,
  type SpringFeel,
} from './constants'
export { readTuning } from './tuning'
export {
  GOO_DEFS_ATTR,
  GOO_FILTER_REGION,
  acquireGooFilter,
  gooColorMatrix,
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
  type GoopLayerPadding,
  type GoopRenderer,
  type GoopRendererFactory,
} from './renderer'
export { DripField, type Drip, type DripContext, type SpawnOptions } from './drips'
export {
  clampDt,
  isSpringSettled,
  springConfig,
  stepFall,
  stepSpring,
  type SpringConfig,
  type SpringState,
} from './spring'
export { activeTickerCount, isLoopRunning, removeTicker, setGoopTimeScale, wakeTicker, type Ticker } from './loop'
export { isReducedMotion, watchReducedMotion } from './reduced-motion'

/** @deprecated Use GOOP_DEFAULTS. Kept so existing imports keep compiling. */
export const defaultGoopOptions = GOOP_DEFAULTS
export { trackPointer, type PointerSample, type PointerTracker } from './pointer'

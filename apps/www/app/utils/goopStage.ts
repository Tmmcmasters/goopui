// A "stage" is any element marked `data-goop-stage` (demo frames, the tuner, the
// components card). Every <GoopHost> inside one listens to it, so a frame's controls can
// reach all of its goo at once without knowing what's inside:
//   dripStage(el)                       -> every goo drips
//   setStageOptions(el, { timeScale })  -> merged over each host's own options
// New engine toggles (round 4: gloss, taffy, reach, ...) slot in as more stage options.
import type { GoopOptions } from '@goopui/core'

const overrides = new WeakMap<Element, GoopOptions>()

export const STAGE_ATTR = 'data-goop-stage'
export const STAGE_DRIP = 'goop:drip'
export const STAGE_OPTIONS = 'goop:options'

export function stageOptions(stage: Element | null): GoopOptions {
  return (stage && overrides.get(stage)) || {}
}

export function setStageOptions(stage: Element | null, opts: GoopOptions) {
  if (!stage) return
  overrides.set(stage, { ...stageOptions(stage), ...opts })
  stage.dispatchEvent(new CustomEvent(STAGE_OPTIONS))
}

export function dripStage(stage: Element | null) {
  stage?.dispatchEvent(new CustomEvent(STAGE_DRIP))
}

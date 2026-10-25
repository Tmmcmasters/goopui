// @goopui/core — framework-agnostic engine.
// Everything here must be plain TS + DOM: no Vue, React, or Svelte imports.
// Framework packages (@goopui/vue, @goopui/react, @goopui/svelte) wrap these primitives.

export const VERSION = '0.0.0'

export interface GoopOptions {
  /** Blur radius fed to the gooey SVG filter. Higher = blobbier merges. */
  blur?: number
  /** Alpha contrast applied after the blur. Higher = sharper edges. */
  contrast?: number
  /** Respect `prefers-reduced-motion` and disable drip/wobble animation. */
  respectReducedMotion?: boolean
}

export const defaultGoopOptions: Required<GoopOptions> = {
  blur: 10,
  contrast: 20,
  respectReducedMotion: true,
}

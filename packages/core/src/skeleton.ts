// Skeleton goo shimmer: instead of a grey pulse, a soft, low mound of slightly lighter goo
// drifts across the skeleton shape.
//
// Deliberately cheap so a page full of skeletons stays smooth: no script runs per frame and
// nothing is filtered. The mound is one radial gradient on a pseudo-element (goop.css) that
// moves with a compositor-only transform. This module only resolves the feel into CSS vars,
// so it is a pure function (SSR-safe, no DOM access). Reduced motion (the OS setting, the
// `data-reduced-motion` attribute on <html>, or `reducedMotion: true`) stops the drift and
// the skeleton is a plain static shape.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'

/** Individually toggleable skeleton effects (boolean or multiplier). */
export const SKELETON_EFFECTS = ['shimmer'] as const
export type SkeletonEffect = (typeof SKELETON_EFFECTS)[number]

export interface SkeletonFeel {
  /** Seconds for the mound to drift across once (including the rest off-shape). */
  period: number
  /** Brightness of the mound's crest, as a multiplier of the theme's highlight strength. */
  lift: number
  /** Mound width as a fraction of the skeleton's width (it is low and wide). */
  width: number
}

export const SKELETON_FEEL: Readonly<Record<GoopPreset, Readonly<SkeletonFeel>>> = Object.freeze({
  subtle: Object.freeze({ period: 2.8, lift: 0.7, width: 0.7 }),
  playful: Object.freeze({ period: 2.4, lift: 1, width: 0.6 }),
  wild: Object.freeze({ period: 1.9, lift: 1.35, width: 0.5 }),
})

export interface SkeletonOptions {
  /** The drifting mound. `false`: off; `true`: the preset's strength; a number scales it. */
  shimmer?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` forces the static skeleton; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

/** Strength of a toggle: false/0 -> 0, true/undefined -> 1, a number -> itself (>= 0). */
export const effectStrength = (v: boolean | number | undefined): number =>
  v === undefined || v === true ? 1 : v === false ? 0 : Number.isFinite(v) ? Math.max(0, v) : 0

/** Whether the skeleton shows the goo shimmer at all (off: the plain shadcn pulse). */
export function skeletonShimmerOn(options: SkeletonOptions = {}): boolean {
  return effectStrength(options.shimmer) > 0
}

/**
 * CSS custom properties for a shimmering skeleton host (empty when the shimmer is off):
 * `--goop-shimmer-period` (s), `--goop-shimmer-lift` (0..2) and `--goop-shimmer-width` (%).
 */
export function skeletonStyle(options: SkeletonOptions = {}): Record<string, string> {
  const s = effectStrength(options.shimmer)
  if (s <= 0) return {}
  const feel = SKELETON_FEEL[options.preset ?? GOOP_DEFAULT_PRESET] ?? SKELETON_FEEL[GOOP_DEFAULT_PRESET]
  const speed = options.speed && options.speed > 0 ? options.speed : 1
  return {
    '--goop-shimmer-period': `${round(feel.period / speed)}s`,
    '--goop-shimmer-lift': `${round(Math.min(2, feel.lift * s))}`,
    '--goop-shimmer-width': `${round(feel.width * 100)}%`,
  }
}

const round = (v: number): number => Math.round(v * 1000) / 1000

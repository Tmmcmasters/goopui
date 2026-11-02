// Badge goo swell: an interactive badge (a link or button, e.g. through `asChild`) swells a
// tiny bit (~1px on playful) when hovered, with a soft overshoot, like a drop of goo
// plumping up. A plain badge stays static.
//
// Cheap on purpose: the swell is a box-shadow ring in the badge's own colour that grows on
// hover (a CSS transition in goop.css), so nothing runs per frame and nothing is filtered.
// This module only resolves the feel into CSS vars: a pure function, SSR-safe. Reduced
// motion (OS setting, `data-reduced-motion` on <html>, or `reducedMotion: true`) keeps the
// badge static.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { effectStrength } from './skeleton'

/** Individually toggleable badge effects (boolean or multiplier). */
export const BADGE_EFFECTS = ['swell'] as const
export type BadgeEffect = (typeof BADGE_EFFECTS)[number]

export interface BadgeFeel {
  /** How far the badge swells on hover (px). */
  swell: number
  /** Seconds the swell takes, overshoot included. */
  duration: number
}

export const BADGE_FEEL: Readonly<Record<GoopPreset, Readonly<BadgeFeel>>> = Object.freeze({
  subtle: Object.freeze({ swell: 0.75, duration: 0.3 }),
  playful: Object.freeze({ swell: 1, duration: 0.36 }),
  wild: Object.freeze({ swell: 1.6, duration: 0.44 }),
})

export interface BadgeOptions {
  /** The hover swell. `false`: off; `true`: the preset's size; a number scales it. */
  swell?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the badge static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

/** Whether the badge swells at all. */
export function badgeSwellOn(options: BadgeOptions = {}): boolean {
  return effectStrength(options.swell) > 0
}

/** CSS custom properties for a badge host: `--goop-badge-swell-size` (px) and
 *  `--goop-badge-duration` (s). Empty when the swell is off. */
export function badgeStyle(options: BadgeOptions = {}): Record<string, string> {
  const s = effectStrength(options.swell)
  if (s <= 0) return {}
  const feel = BADGE_FEEL[options.preset ?? GOOP_DEFAULT_PRESET] ?? BADGE_FEEL[GOOP_DEFAULT_PRESET]
  const speed = options.speed && options.speed > 0 ? options.speed : 1
  return {
    '--goop-badge-swell-size': `${round(Math.min(4, feel.swell * s))}px`,
    '--goop-badge-duration': `${round(feel.duration / speed)}s`,
  }
}

const round = (v: number): number => Math.round(v * 1000) / 1000

// Avatar goo settle: when the image (or the fallback) appears, it plops in with a small
// gooey settle: a quick scale-in that overshoots softly, squashes a touch and settles.
//
// Cheap on purpose: a CSS animation (goop.css) that runs when the image or fallback element
// is inserted, transform-only, once. This module only resolves the feel into CSS vars: a
// pure function, SSR-safe. Reduced motion (OS setting, `data-reduced-motion` on <html>, or
// `reducedMotion: true`) shows the avatar at once, static.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { effectStrength } from './skeleton'

/** Individually toggleable avatar effects (boolean or multiplier). */
export const AVATAR_EFFECTS = ['settle'] as const
export type AvatarEffect = (typeof AVATAR_EFFECTS)[number]

export interface AvatarFeel {
  /** Scale it starts from (0..1). */
  from: number
  /** Peak overshoot past full size (fraction, e.g. 0.06 = 106%). */
  overshoot: number
  /** Seconds for the whole settle. */
  duration: number
}

export const AVATAR_FEEL: Readonly<Record<GoopPreset, Readonly<AvatarFeel>>> = Object.freeze({
  subtle: Object.freeze({ from: 0.88, overshoot: 0.03, duration: 0.42 }),
  playful: Object.freeze({ from: 0.8, overshoot: 0.06, duration: 0.52 }),
  wild: Object.freeze({ from: 0.68, overshoot: 0.1, duration: 0.64 }),
})

export interface AvatarOptions {
  /** The settle on appear. `false`: off; `true`: the preset's; a number scales the overshoot. */
  settle?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` shows it static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

/** Whether the avatar settles in at all. */
export function avatarSettleOn(options: AvatarOptions = {}): boolean {
  return effectStrength(options.settle) > 0
}

/**
 * CSS custom properties for an avatar host: `--goop-settle-from`, `--goop-settle-over`
 * (peak scale), `--goop-settle-under` (the rebound), `--goop-settle-squash` (the peak's
 * vertical scale, a touch flatter) and `--goop-settle-duration` (s). Empty when off.
 */
export function avatarStyle(options: AvatarOptions = {}): Record<string, string> {
  const s = effectStrength(options.settle)
  if (s <= 0) return {}
  const feel = AVATAR_FEEL[options.preset ?? GOOP_DEFAULT_PRESET] ?? AVATAR_FEEL[GOOP_DEFAULT_PRESET]
  const speed = options.speed && options.speed > 0 ? options.speed : 1
  const over = Math.min(0.2, feel.overshoot * s)
  return {
    '--goop-settle-from': `${round(Math.max(0.3, 1 - (1 - feel.from) * Math.min(s, 2)))}`,
    '--goop-settle-over': `${round(1 + over)}`,
    '--goop-settle-squash': `${round(1 + over * 0.45)}`,
    '--goop-settle-under': `${round(1 - over * 0.35)}`,
    '--goop-settle-duration': `${round(feel.duration / speed)}s`,
  }
}

const round = (v: number): number => Math.round(v * 1000) / 1000

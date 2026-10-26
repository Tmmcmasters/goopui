// The promo's script: timings, geometry, cursor paths, clicks and goo option changes.
// Everything is in composition px (480 x 480, rendered at 2.25x = 1080) and seconds.

import type { GoopOptions } from '@goopui/core'
import { cursorPath, ease, type Pt } from './goo/path'
import type { GooScript } from './goo/replay'

export const FPS = 60
export const SIZE = 480
export const DURATION = 15

export const COLORS = {
  slime: '#1fa64a',
  ink: '#09090b',
  night: '#0b0d0c',
  paper: '#f3eee3',
  chalk: '#f4f4f0',
}

/** Scene windows (global seconds). */
export const T = {
  aEnd: 10.88, // dark scene ends under the paper curtain
  curtain: [10.5, 10.88] as const,
  b: 10.88, // oil scene
  bEnd: 13.15,
  cardIn: 13.1,
}

/** The button: the core demo's hero button (56px tall, 40px side padding, 10px radius,
 *  17px label), centered a bit above the middle so drips have room to fall. Its width
 *  follows the label. */
export const BTN = { cx: SIZE / 2, cy: 246, h: 56, padX: 40, radius: 10, fontSize: 17 }

/**
 * Engine options: the demo's defaults (preset 'playful', splash 'near', hit effect
 * 'shockwave', SVG renderer, label ride via [data-goop-label]). Nothing is tuned, so hovers
 * and clicks look exactly like the demo at default settings; only the 2.25x device scale
 * differs. `random` (seeded) and reducedMotion: false are added by the replayer.
 */
const demoDefaults: GoopOptions = {}

// ---- Scene A: dark, slime button ---------------------------------------------------

/** Wiggle while hovering: horizontal sweeps with a figure-8 bob, easing out at the end. */
const wiggle = (t0: number, t1: number, cx: number, cy: number, ax: number, ay: number, f: number) => (t: number): Pt => {
  const u = t - t0
  const tail = 0.6
  const env = t > t1 - tail ? 1 - ease.smooth((t - (t1 - tail)) / tail) : 1
  // Slight speed-up through the middle feels like a hand getting into it.
  const ph = 2 * Math.PI * f * u + 0.35 * Math.sin((Math.PI * u) / (t1 - t0))
  return { x: cx + ax * env * Math.cos(ph), y: cy + ay * env * Math.sin(2 * ph) }
}

// Unhurried enough that each jelly wobble rings out before the next hit.
const clicksA = [5.15, 5.6, 6.03, 6.43, 6.8].map((d, i) => ({ down: d, up: d + 0.09 + (i % 2) * 0.015 }))
/** Small hand drift between clicks. */
const clickOffsets: Pt[] = [
  { x: 0, y: 0 },
  { x: -7, y: 3 },
  { x: 6, y: -2 },
  { x: -3, y: 5 },
  { x: 9, y: 1 },
  { x: -5, y: -3 },
  { x: 3, y: 3 },
]
const CLICK_AT: Pt = { x: 258, y: 250 }

export const PUNCH = { from: { x: 200, y: 372 }, to: { x: 312, y: -40 }, t0: 9.02, t1: 9.32 }

export const cursorA = cursorPath(
  { x: 452, y: 446 },
  0,
  [
    // Glide in from the bottom right, decelerating onto the button.
    { t0: 0.12, t1: 1.3, via: { x: 400, y: 380 }, to: { x: 302, y: 262 }, ease: ease.outQuart },
    { t0: 1.3, t1: 2.3, to: { x: 302, y: 264 }, ease: ease.inOutSine },
    // Wiggle: the goo leans, skews and sloshes against the acceleration.
    { t0: 2.3, t1: 4.5, fn: wiggle(2.3, 4.5, 240, 264, 84, 6, 1.4) },
    { t0: 4.5, t1: 5.05, to: CLICK_AT, ease: ease.inOutSine },
    // Tiny moves between clicks.
    ...clicksA.slice(1).map((c, i) => ({
      t0: clicksA[i]!.up + 0.01,
      t1: c.down - 0.03,
      to: { x: CLICK_AT.x + clickOffsets[i + 1]!.x, y: CLICK_AT.y + clickOffsets[i + 1]!.y },
      ease: ease.inOutSine,
    })),
    // Pull back out the bottom, slowly (no yank), to a wind-up below the button.
    { t0: 7.55, t1: 8.6, via: { x: 262, y: 330 }, to: PUNCH.from, ease: ease.inOutSine },
    // Anticipation: a small dip back before the strike.
    { t0: 8.6, t1: 8.96, to: { x: 193, y: 384 }, ease: ease.outCubic },
    // Punch up through the button at an angle; the goo erupts out of the top.
    { t0: PUNCH.t0, t1: PUNCH.t1, to: PUNCH.to, ease: ease.inOutCubic },
  ],
  0.7,
)

export const scriptA: GooScript = {
  seed: 1337,
  // Busier hover: more drips hanging/falling at once on a quicker rhythm (demo: 3 / 0.9s / 10).
  options: { ...demoDefaults, dripCount: 7, dripInterval: 0.3, maxDrips: 18 },
  cursor: cursorA,
  clicks: clicksA,
  // No overrides anywhere: the punch-through fires the default momentum hit (an aimed
  // shockwave at the contact point, splash 'near'), so nothing scatters across the frame.
}

// ---- Scene B: paper, ink button with the oil finish ---------------------------------

const clicksB = [{ down: 1.42, up: 1.5 }]
export const cursorB = cursorPath(
  { x: 540, y: 330 },
  0.2,
  [
    { t0: 0.25, t1: 1.05, via: { x: 420, y: 320 }, to: { x: 286, y: 236 }, ease: ease.outQuart },
    { t0: 1.05, t1: 1.38, to: { x: 268, y: 230 }, ease: ease.inOutSine },
    { t0: 1.55, t1: 2.2, to: { x: 228, y: 236 }, ease: ease.inOutSine },
  ],
  0.7,
)

export const scriptB: GooScript = {
  seed: 4242,
  options: { ...demoDefaults, finish: 'oil' },
  cursor: cursorB,
  clicks: clicksB,
}

// ---- Captions ---------------------------------------------------------------------

export interface Caption {
  text: string
  from: number
  to: number
  dark: boolean
}

export const CAPTIONS: Caption[] = [
  { text: 'hover', from: 0.9, to: 4.6, dark: true },
  { text: 'click', from: 4.95, to: 7.45, dark: true },
  { text: 'punch through', from: 8.2, to: 9.08, dark: true },
  { text: 'oil finish', from: T.b + 0.45, to: T.bEnd - 0.24, dark: false },
]


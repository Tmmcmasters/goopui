// Staging area for the round-3 engine (branch `core-feel-1`, not merged yet).
//
// The landing page already asks for these features through `nextOptions()`. While
// GOOP_NEXT is false they're dropped and the page runs on today's engine. When the new
// core lands:
//   1. TODO(core-feel-1): rename the fields below to match the real GoopOptions names.
//   2. TODO(core-feel-1): flip GOOP_NEXT to true (or delete this file and inline the
//      options at each call site; grep for `nextOptions(`).
//   3. TODO(core-feel-1): replace the fallbacks marked "today:" in Hero.vue with the real
//      calls (splash on hard swipes, shockwave on clicks).
import type { GoopOptions } from '@goopui/core'

export const GOOP_NEXT = false

/** Planned round-3 options. Names are provisional. */
export interface GoopNextOptions {
  /** Directional goo that carries pointer momentum. */
  momentum?: boolean
  /** Hard impacts splash through as a particle fluid. 'escape' lets particles fly across
   *  the page through the engine's shared page overlay. */
  splash?: 'off' | 'contain' | 'escape'
  /** Click shockwave through the goo body. */
  shockwave?: boolean
  /** Surface finish. 'oil' = iridescent. */
  finish?: 'flat' | 'oil'
}

/** Merge round-3 options into today's options once the engine supports them. */
export function nextOptions(base: GoopOptions, next: GoopNextOptions): GoopOptions {
  return GOOP_NEXT ? ({ ...base, ...next } as GoopOptions) : base
}

/** px/s of pointer travel that counts as a "hard swipe" (splash trigger). */
export const HARD_SWIPE_SPEED = 2200

// The open and end cards' live logo: a SceneScript that mounts the coming-soon page's lockup
// (logo.ts) over a `[data-logo-slot]` placeholder laid out by React, so the puddle is real goo
// on the replay clock. On the end card the cursor swipes across the puddle and pokes it.

import { cursorPath, ease, type CursorPath } from '../goo/path'
import type { Click } from '../goo/replay'
import type { SceneScript } from '../goo/scene'
import { outCubic, smooth, springy } from '../v7/dom'
import { SIZE } from '../timeline'
import { LOGO_HOST, mountLogo } from './logo'
import { SOON } from './parts'

interface LogoRt {
  wrap: HTMLElement
  destroy(): void
}

/** Where a slot sits in composition px (the stage spans the composition). */
function slotBox(root: HTMLElement, slot: string): { x: number; y: number; h: number } {
  const el = document.querySelector<HTMLElement>(`[data-logo-slot='${slot}']`)
  if (!el) throw new Error(`[promo] logo slot ${slot} missing`)
  const sr = root.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const k = sr.width / SIZE
  return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, h: r.height / k }
}

/** Pop-in: fade + springy rise. Frame 0 (before `at`) is fully transparent. */
function pop(wrap: HTMLElement, t: number, at: number): void {
  const u = (t - at) / 0.5
  wrap.style.opacity = String(smooth(u * 2.2))
  const y = (1 - springy(Math.max(0, u))) * 18 + (1 - outCubic(u)) * 4
  wrap.style.transform = Math.abs(y) > 0.01 ? `translateY(${y.toFixed(2)}px)` : ''
}

export interface LogoBeatSpec {
  slot: string
  seed: number
  /** When the logo pops in (scene-local s). */
  at: number
  cursor?: CursorPath
  clicks?: readonly Click[]
}

export function logoBeat(s: LogoBeatSpec): SceneScript<LogoRt> {
  return {
    seed: s.seed,
    cursor: s.cursor ?? cursorPath({ x: -100, y: -100 }, 999, []),
    clicks: s.clicks ?? [],
    build(root) {
      const b = slotBox(root, s.slot)
      const { wrap, handle } = mountLogo(root, { x: b.x, y: b.y, height: b.h, ink: SOON.ink, slime: SOON.slime, seed: s.seed })
      pop(wrap, 0, s.at)
      return { wrap, destroy: () => handle.destroy() }
    },
    step(rt, t) {
      pop(rt.wrap, t, s.at)
    },
  }
}

/** Open card: logo height 48 centred; no cursor. */
export const OPEN_LOGO_H = 48
export const openLogoBeat = logoBeat({ slot: 'open', seed: 31, at: 0.05 })

/** End card logo height and its puddle's centre (composition px), fixed by the End layout. */
export const END_LOGO_H = 64
/** End card logo top (composition px): see End in SneakPeek.tsx. */
export const END_LOGO_TOP = 104
const END_W = END_LOGO_H * (450.31 / 101.1)
const END_X = SIZE / 2 - END_W / 2
const PUDDLE = {
  x: END_X + END_W * (LOGO_HOST.left + LOGO_HOST.width / 2),
  y: END_LOGO_TOP + END_LOGO_H * (LOGO_HOST.top + LOGO_HOST.height / 2),
}

export const END_CLICKS: Click[] = [{ down: 1.42, up: 1.52 }]

export const endLogoBeat = logoBeat({
  slot: 'end',
  seed: 32,
  at: 0.08,
  clicks: END_CLICKS,
  cursor: cursorPath(
    { x: 420, y: 330 },
    0.45,
    [
      // Glide in under the puddle, swipe fast up-left across it (tears drops off), come back
      // and poke it, then drift away.
      { t0: 0.5, t1: 0.86, via: { x: 300, y: 250 }, to: { x: PUDDLE.x + 46, y: PUDDLE.y + 30 }, ease: ease.outQuart },
      { t0: 0.9, t1: 1.04, to: { x: PUDDLE.x - 40, y: PUDDLE.y - 22 }, ease: ease.inOutCubic },
      { t0: 1.1, t1: 1.36, via: { x: PUDDLE.x - 30, y: PUDDLE.y + 24 }, to: { x: PUDDLE.x + 2, y: PUDDLE.y + 3 }, ease: ease.inOutCubic },
      { t0: 1.75, t1: 2.3, to: { x: PUDDLE.x + 70, y: PUDDLE.y + 92 }, ease: ease.inOutSine },
    ],
    0.5,
  ),
})

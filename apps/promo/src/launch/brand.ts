// The live puddle logo for the launch clip's open and end card: the sneak peek's lockup
// (sneak/logo.ts, a real @goopui/core body on the replay clock) in the dark theme's ink,
// mounted over a `[data-logo-slot]` placeholder that React lays out.

import { cursorPath, type CursorPath } from '../goo/path'
import type { Click } from '../goo/replay'
import type { SceneScript } from '../goo/scene'
import { mountLogo } from '../sneak/logo'
import { outCubic, smooth, springy } from '../v7/dom'
import { DARK, W } from './theme'

interface LogoRt {
  wrap: HTMLElement
  destroy(): void
}

function slotBox(root: HTMLElement, slot: string): { x: number; y: number; h: number } {
  const el = document.querySelector<HTMLElement>(`[data-logo-slot='${slot}']`)
  if (!el) throw new Error(`[promo] logo slot ${slot} missing`)
  const sr = root.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  const k = sr.width / W
  return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, h: r.height / k }
}

/** Fade + springy rise; fully transparent before `at`. */
function pop(wrap: HTMLElement, t: number, at: number): void {
  const u = (t - at) / 0.5
  wrap.style.opacity = String(smooth(u * 2.2))
  const y = (1 - springy(Math.max(0, u))) * 14 + (1 - outCubic(u)) * 3
  wrap.style.transform = Math.abs(y) > 0.01 ? `translateY(${y.toFixed(2)}px)` : ''
}

export interface LaunchLogoSpec {
  slot: string
  seed: number
  at: number
  cursor?: CursorPath
  clicks?: readonly Click[]
}

export function launchLogo(s: LaunchLogoSpec): SceneScript<LogoRt> {
  return {
    seed: s.seed,
    cursor: s.cursor ?? cursorPath({ x: -100, y: -100 }, 999, []),
    clicks: s.clicks ?? [],
    build(root) {
      const b = slotBox(root, s.slot)
      const { wrap, handle } = mountLogo(root, { x: b.x, y: b.y, height: b.h, ink: DARK.fg, slime: DARK.slime, seed: s.seed })
      pop(wrap, 0, s.at)
      return { wrap, destroy: () => handle.destroy() }
    },
    step(rt, t) {
      pop(rt.wrap, t, s.at)
    },
  }
}

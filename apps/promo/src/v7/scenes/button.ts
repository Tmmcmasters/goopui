// Scene 1 (night): the v6 hero button, trimmed to its best beat. Glide in (hover drips),
// a wiggle, one click (squish + ripple), pull back, then the fast punch-through that tears
// the far edge off in shockwave droplets.

import { attachGoop, type GoopHandle } from '@goopui/core'
import { seededRandom } from '../../goo/fake-env'
import { cursorPath, ease, type Pt } from '../../goo/path'
import type { SceneScript } from '../../goo/scene'
import { DYNAPUFF } from '../../fonts'
import { BTN, COLORS } from '../../timeline'
import { el } from '../dom'

interface Rt {
  handle: GoopHandle
  destroy(): void
}

const wiggle = (t0: number, t1: number, cx: number, cy: number, ax: number, ay: number, f: number) => (t: number): Pt => {
  const u = t - t0
  const tail = 0.3
  const env = t > t1 - tail ? 1 - ease.smooth((t - (t1 - tail)) / tail) : Math.min(1, u / 0.2)
  const ph = 2 * Math.PI * f * u
  return { x: cx + ax * env * Math.sin(ph), y: cy + ay * env * Math.sin(2 * ph) }
}

const PUNCH = { from: { x: 200, y: 372 }, to: { x: 312, y: -40 }, t0: 2.42, t1: 2.72 }
export const clicks = [{ down: 1.52, up: 1.61 }]

export const cursor = cursorPath(
  { x: 470, y: 452 },
  0,
  [
    { t0: 0.05, t1: 0.75, via: { x: 410, y: 380 }, to: { x: 282, y: 258 }, ease: ease.outQuart },
    { t0: 0.75, t1: 1.42, fn: wiggle(0.75, 1.42, 262, 258, 54, 5, 1.5) },
    { t0: 1.42, t1: 1.5, to: { x: 258, y: 250 }, ease: ease.inOutSine },
    // Pull back out the bottom to a wind-up below the button.
    { t0: 1.72, t1: 2.18, via: { x: 250, y: 330 }, to: PUNCH.from, ease: ease.inOutSine },
    { t0: 2.18, t1: 2.38, to: { x: 193, y: 384 }, ease: ease.outCubic },
    { t0: PUNCH.t0, t1: PUNCH.t1, to: PUNCH.to, ease: ease.inOutCubic },
  ],
  0.7,
)

export const buttonScene: SceneScript<Rt> = {
  seed: 1337,
  cursor,
  clicks,
  build(root) {
    const btn = el(
      'button',
      {
        attrs: { tabindex: '-1' },
        style:
          `height:${BTN.h}px;padding:0 ${BTN.padX}px;border-radius:${BTN.radius}px;border:0;margin:0;background:transparent;` +
          `color:${COLORS.ink};font:600 ${BTN.fontSize}px/1 ${DYNAPUFF};display:inline-flex;align-items:center;justify-content:center;cursor:none;outline:none;`,
      },
      [el('span', { attrs: { 'data-goop-label': '' }, style: 'display:inline-flex;align-items:center', text: 'Get started' })],
    )
    btn.style.setProperty('--goop-color', COLORS.slime)
    root.append(
      el('div', { style: `position:absolute;left:0;right:0;top:${BTN.cy - BTN.h / 2}px;display:flex;justify-content:center;` }, [btn]),
    )
    const handle = attachGoop(btn, {
      dripCount: 8,
      dripInterval: 0.16,
      maxDrips: 20,
      restingDrips: 0,
      dripLength: 30,
      dripSize: 9,
      random: seededRandom(1337 ^ 0x9e3779b9),
      reducedMotion: false,
    })
    return { handle, destroy: () => handle.destroy() }
  },
}

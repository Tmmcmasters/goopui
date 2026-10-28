// Scene 2 (paper): the five GoopSpinner variants in a row. The cursor sloshes the orbit,
// grabs the ring and drags it out in lumps, then clicks the pulse (pop).

import { attachSpinner, type SpinnerHandle, type SpinnerVariant } from '@goopui/core'
import { cursorPath, ease, type Pt } from '../../goo/path'
import type { SceneScript } from '../../goo/scene'
import { COLORS } from '../../timeline'
import { el, entrance } from '../dom'

const VARIANTS: SpinnerVariant[] = ['orbit', 'comet', 'ring', 'dots', 'pulse']
const SIZE = 66
const CY = 236
const xOf = (i: number): number => 240 + (i - 2) * 86

interface Rt {
  items: HTMLElement[]
  handles: SpinnerHandle[]
  destroy(): void
}

const slosh = (t0: number, t1: number, c: Pt, ax: number, ay: number, f: number) => (t: number): Pt => {
  const u = t - t0
  const env = Math.min(1, u / 0.15) * (t > t1 - 0.2 ? 1 - ease.smooth((t - (t1 - 0.2)) / 0.2) : 1)
  const ph = 2 * Math.PI * f * u
  return { x: c.x + ax * env * Math.sin(ph), y: c.y + ay * env * Math.sin(2 * ph + 0.6) }
}

export const clicks = [
  { down: 1.98, up: 2.62 }, // grab + drag the ring
  { down: 3.08, up: 3.16 }, // pop the pulse
]

export const cursor = cursorPath(
  { x: 300, y: 520 },
  0.25,
  [
    { t0: 0.3, t1: 0.86, via: { x: 160, y: 380 }, to: { x: xOf(0) + 8, y: CY + 6 }, ease: ease.outQuart },
    { t0: 0.86, t1: 1.58, fn: slosh(0.86, 1.58, { x: xOf(0) + 4, y: CY + 4 }, 30, 7, 2.1) },
    { t0: 1.58, t1: 1.94, via: { x: 170, y: 290 }, to: { x: xOf(2) + 4, y: CY + 2 }, ease: ease.inOutCubic },
    // Drag out (grab lumps follow), a little circle, then back toward home before letting go.
    { t0: 2.02, t1: 2.36, to: { x: xOf(2) + 52, y: CY + 74 }, ease: ease.inOutSine },
    { t0: 2.36, t1: 2.6, to: { x: xOf(2) + 28, y: CY + 92 }, ease: ease.inOutSine },
    { t0: 2.66, t1: 3.02, via: { x: 360, y: 330 }, to: { x: xOf(4) + 3, y: CY + 3 }, ease: ease.inOutCubic },
    { t0: 3.2, t1: 3.9, to: { x: xOf(4) + 30, y: CY + 70 }, ease: ease.inOutSine },
  ],
  0.6,
)

export const spinnerScene: SceneScript<Rt> = {
  seed: 2024,
  cursor,
  clicks,
  build(root) {
    const items: HTMLElement[] = []
    const handles: SpinnerHandle[] = []
    VARIANTS.forEach((v, i) => {
      const host = el('span', {
        attrs: { role: 'status', 'data-variant': v },
        style: `position:absolute;left:${xOf(i) - SIZE / 2}px;top:${CY - SIZE / 2}px;width:${SIZE}px;height:${SIZE}px;display:block;color:${COLORS.slime};--goop-color:currentColor;pointer-events:auto;`,
      })
      const label = el('div', {
        class: 'muted',
        text: v,
        style: `position:absolute;left:${xOf(i) - 50}px;width:100px;top:${CY + 52}px;text-align:center;font-size:14px;font-weight:500;letter-spacing:0.01em;`,
      })
      const wrap = el('div', { style: 'position:absolute;inset:0;pointer-events:none;' }, [host, label])
      root.append(wrap)
      items.push(wrap)
      handles.push(attachSpinner(host, { variant: v, renderer: 'svg', reducedMotion: false }))
    })
    return { items, handles, destroy: () => handles.forEach((h) => h.destroy()) }
  },
  step(rt, t) {
    rt.items.forEach((w, i) => {
      const [o, y] = entrance(t, 0.04 + i * 0.05)
      w.style.opacity = String(o)
      w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
    })
  },
}

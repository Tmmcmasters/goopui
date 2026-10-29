// The sneak peek's five interactive scenes: one beat per coming-soon component (button,
// switch, slider, tooltip), then all four in the page's grid. Times are scene-local seconds;
// each scene is ~3s and the slime curtain covers its last 0.5s.

import type { EmergeHandle, GoopHandle, SliderHandle, SwitchHandle } from '@goopui/core'
import { cursorPath, ease, type Pt, type Segment } from '../goo/path'
import type { Click } from '../goo/replay'
import type { SceneScript } from '../goo/scene'
import { entrance } from '../v7/dom'
import { mountButton, mountSlider, mountSwitch, mountTooltip, peekCard, plural, sliderX, syncTip, type Box } from './parts'

interface Rt {
  cards: HTMLElement[]
  tips: { host: HTMLElement; emerge: EmergeHandle }[]
  destroy(): void
}

const enter = (rt: Rt, t: number) =>
  rt.cards.forEach((w, i) => {
    const [o, y] = entrance(t, 0.02 + i * 0.07, 0.36)
    w.style.opacity = String(o)
    w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
  })
const step = (rt: Rt, t: number) => {
  enter(rt, t)
  for (const p of rt.tips) syncTip(p.host, p.emerge)
}

const clicksAt = (downs: number[], hold = 0.085): Click[] => downs.map((d) => ({ down: d, up: d + hold }))

/** The solo beats' card. */
const SOLO: Box = { x: 70, y: 150, w: 340, h: 236 }
const SOLO_CY = SOLO.y + SOLO.h / 2 + 2

// ---- 1. button: hover swipe (drips), a poke, then a punch-through ----------------------------

const wiggle = (t0: number, t1: number, cx: number, cy: number, ax: number, ay: number, f: number) => (t: number): Pt => {
  const u = t - t0
  const tail = 0.25
  const env = t > t1 - tail ? 1 - ease.smooth((t - (t1 - tail)) / tail) : Math.min(1, u / 0.15)
  const ph = 2 * Math.PI * f * u
  return { x: cx + ax * env * Math.sin(ph), y: cy + ay * env * Math.sin(2 * ph) }
}

const BTN_CLICKS = clicksAt([1.1], 0.09)

export const buttonBeat: SceneScript<Rt> = {
  seed: 4242,
  clicks: BTN_CLICKS,
  cursor: cursorPath(
    { x: 470, y: 452 },
    0.05,
    [
      { t0: 0.06, t1: 0.5, via: { x: 410, y: 380 }, to: { x: 282, y: SOLO_CY }, ease: ease.outQuart },
      { t0: 0.5, t1: 0.98, fn: wiggle(0.5, 0.98, 262, SOLO_CY, 48, 4, 1.7) },
      { t0: 0.98, t1: 1.06, to: { x: 252, y: SOLO_CY - 4 }, ease: ease.inOutSine },
      // Pull back out the bottom to a wind-up under the button, then punch up through it.
      { t0: 1.26, t1: 1.58, via: { x: 248, y: SOLO_CY + 64 }, to: { x: 206, y: SOLO_CY + 70 }, ease: ease.inOutSine },
      { t0: 1.58, t1: 1.7, to: { x: 199, y: SOLO_CY + 80 }, ease: ease.outCubic },
      { t0: 1.76, t1: 2.02, to: { x: 312, y: -40 }, ease: ease.inOutCubic },
    ],
    0.7,
  ),
  build(root) {
    let pokes = 0
    const card = peekCard(root, SOLO, 'Button', 'Click or swipe it', true)
    const { btn, handle } = mountButton(card.wrap, {
      cx: SOLO.w / 2,
      cy: SOLO_CY - SOLO.y,
      h: 56,
      padX: 40,
      radius: 12,
      fontSize: 19,
      label: 'Poke me',
      seed: 4242,
      // v7's hero drips: falling drips while hovered, none resting.
      options: { dripCount: 8, dripInterval: 0.16, maxDrips: 20, dripLength: 30, dripSize: 9 },
    })
    btn.addEventListener('click', () => (card.hint.textContent = plural(++pokes, 'poke')))
    return { cards: [card.wrap], tips: [], destroy: () => handle.destroy() }
  },
  step,
}

// ---- 2. switch: flip it a few times -----------------------------------------------------------

const SW = { w: 88, h: 50, x: 140 }
const SW_DOWNS = [0.58, 1.22, 1.86]

function flipPath(downs: number[], target: (i: number) => Pt, enterFrom: Pt, exitTo: Pt, hold = 0.085) {
  const segs: Segment[] = []
  let prevUp = 0.1
  downs.forEach((d, i) => {
    const c = target(i)
    const jitter = { x: ((i * 37) % 11) - 5, y: ((i * 23) % 7) - 3 }
    const to = { x: c.x + jitter.x, y: c.y + jitter.y }
    const t0 = i === 0 ? 0.12 : prevUp + 0.05
    const t1 = d - 0.06
    if (i === 0) segs.push({ t0, t1, via: enterFrom, to, ease: ease.outQuart })
    else segs.push({ t0, t1, via: { x: to.x + 14, y: to.y + 12 }, to, ease: ease.inOutCubic })
    prevUp = d + hold
  })
  segs.push({ t0: prevUp + 0.2, t1: prevUp + 0.8, to: exitTo, ease: ease.inOutSine })
  return segs
}

export const switchBeat: SceneScript<Rt> = {
  seed: 808,
  clicks: clicksAt(SW_DOWNS),
  cursor: cursorPath(
    { x: 500, y: 420 },
    0.1,
    flipPath(SW_DOWNS, (i) => ({ x: SW.x + (i % 2 === 0 ? 22 : SW.w - 22), y: SOLO_CY + 2 }), { x: 420, y: 360 }, { x: 430, y: 420 }),
    0.6,
  ),
  build(root) {
    const card = peekCard(root, SOLO, 'Switch', 'Flip it a few times', true)
    const { handle } = mountSwitch(card.wrap, { x: SW.x - SOLO.x, cy: SOLO_CY - SOLO.y, w: SW.w, h: SW.h, checked: false, fontSize: 22 })
    return { cards: [card.wrap], tips: [], destroy: () => handle.destroy() }
  },
  step,
}

// ---- 3. slider: drag it back and forth --------------------------------------------------------

const SL = { x0: 112, x1: 368 }
const slX = (v: number) => sliderX(SL, v)

export const sliderBeat: SceneScript<Rt> = {
  seed: 909,
  clicks: [{ down: 0.55, up: 1.84 }],
  cursor: cursorPath(
    { x: 300, y: 520 },
    0.08,
    [
      { t0: 0.1, t1: 0.48, via: { x: 190, y: 380 }, to: { x: slX(62) + 1, y: SOLO_CY + 2 }, ease: ease.outQuart },
      { t0: 0.62, t1: 0.92, to: { x: slX(96), y: SOLO_CY + 5 }, ease: ease.inOutCubic },
      { t0: 0.98, t1: 1.34, to: { x: slX(10), y: SOLO_CY }, ease: ease.inOutCubic },
      { t0: 1.4, t1: 1.7, to: { x: slX(72), y: SOLO_CY + 3 }, ease: ease.inOutCubic },
      { t0: 1.98, t1: 2.6, to: { x: 430, y: 430 }, ease: ease.inOutSine },
    ],
    0.6,
  ),
  build(root) {
    const card = peekCard(root, SOLO, 'Slider', 'Gooeyness 62%', true)
    card.hint.style.fontVariantNumeric = 'tabular-nums'
    const { handle } = mountSlider(card.wrap, {
      x0: SL.x0 - SOLO.x,
      x1: SL.x1 - SOLO.x,
      cy: SOLO_CY - SOLO.y,
      value: 62,
      onChange: (v) => (card.hint.textContent = `Gooeyness ${v}%`),
    })
    return { cards: [card.wrap], tips: [], destroy: () => handle.destroy() }
  },
  step,
}

// ---- 4. tooltip: hover, leave, hover again ----------------------------------------------------

const TIP_CY = SOLO_CY + 26

export const tooltipBeat: SceneScript<Rt> = {
  seed: 7070,
  clicks: [],
  cursor: cursorPath(
    { x: 470, y: 470 },
    0.05,
    [
      { t0: 0.08, t1: 0.46, via: { x: 400, y: 420 }, to: { x: 252, y: TIP_CY + 4 }, ease: ease.outQuart },
      { t0: 1.3, t1: 1.56, to: { x: 352, y: TIP_CY + 58 }, ease: ease.inOutCubic },
      { t0: 1.66, t1: 1.96, via: { x: 300, y: TIP_CY + 40 }, to: { x: 236, y: TIP_CY + 2 }, ease: ease.inOutCubic },
    ],
    0.6,
  ),
  build(root) {
    const card = peekCard(root, SOLO, 'Tooltip', 'Hover or focus it', true)
    const tip = mountTooltip(card.wrap, {
      cx: SOLO.w / 2,
      cy: TIP_CY - SOLO.y,
      h: 46,
      padX: 22,
      fontSize: 17,
      text: 'Dripping with details',
      tipSize: 16,
      seed: 7070,
    })
    return {
      cards: [card.wrap],
      tips: [{ host: tip.host, emerge: tip.emerge }],
      destroy() {
        tip.emerge.destroy()
        tip.button.destroy()
      },
    }
  },
  step,
}

// ---- 5. all four, the page's grid --------------------------------------------------------------

const G = { w: 200, h: 146, gap: 16, x: 32, y: 112 }
const gbox = (col: number, row: number): Box => ({ x: G.x + col * (G.w + G.gap), y: G.y + row * (G.h + G.gap), w: G.w, h: G.h })
const GB = [gbox(0, 0), gbox(1, 0), gbox(0, 1), gbox(1, 1)] as const
const gc = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 + 2 })
const GSL = { x0: GB[2].x + 24, x1: GB[2].x + G.w - 24 }
const GSW = { w: 60, h: 34, x: GB[1].x + 40 }

export const gridBeat: SceneScript<Rt> = {
  seed: 2026,
  clicks: [
    { down: 0.3, up: 0.38 }, // button
    { down: 0.66, up: 0.74 }, // switch
    { down: 0.98, up: 1.34 }, // slider drag
  ],
  cursor: cursorPath(
    { x: 250, y: 480 },
    0.0,
    [
      { t0: 0.02, t1: 0.26, via: { x: 160, y: 330 }, to: { x: gc(GB[0]).x + 6, y: gc(GB[0]).y + 2 }, ease: ease.outQuart },
      { t0: 0.42, t1: 0.62, via: { x: 250, y: 150 }, to: { x: GSW.x + 18, y: gc(GB[1]).y + 1 }, ease: ease.inOutCubic },
      { t0: 0.76, t1: 0.94, via: { x: 200, y: 280 }, to: { x: sliderX(GSL, 40), y: gc(GB[2]).y + 1 }, ease: ease.inOutCubic },
      { t0: 1.0, t1: 1.28, to: { x: sliderX(GSL, 92), y: gc(GB[2]).y + 3 }, ease: ease.inOutCubic },
      { t0: 1.38, t1: 1.6, via: { x: 280, y: 400 }, to: { x: gc(GB[3]).x + 8, y: gc(GB[3]).y + 22 }, ease: ease.inOutCubic },
    ],
    0.6,
  ),
  build(root) {
    let pokes = 0
    const cb = peekCard(root, GB[0], 'Button', 'Click or swipe it')
    const { btn, handle: button } = mountButton(cb.wrap, {
      cx: G.w / 2,
      cy: G.h / 2 + 2,
      h: 40,
      padX: 22,
      radius: 9,
      fontSize: 15,
      label: 'Poke me',
      seed: 11,
    })
    btn.addEventListener('click', () => (cb.hint.textContent = plural(++pokes, 'poke')))

    const cs = peekCard(root, GB[1], 'Switch', 'Flip it a few times')
    const { handle: sw } = mountSwitch(cs.wrap, { x: GSW.x - GB[1].x, cy: G.h / 2 + 2, w: GSW.w, h: GSW.h, checked: true, fontSize: 15 })

    const cl = peekCard(root, GB[2], 'Slider', 'Gooeyness 40%')
    cl.hint.style.fontVariantNumeric = 'tabular-nums'
    const { handle: sl } = mountSlider(cl.wrap, {
      x0: GSL.x0 - GB[2].x,
      x1: GSL.x1 - GB[2].x,
      cy: G.h / 2 + 2,
      value: 40,
      onChange: (v) => (cl.hint.textContent = `Gooeyness ${v}%`),
    })

    const ct = peekCard(root, GB[3], 'Tooltip', 'Hover or focus it')
    const tip = mountTooltip(ct.wrap, {
      cx: G.w / 2,
      cy: G.h / 2 + 22,
      h: 36,
      padX: 16,
      fontSize: 14,
      text: 'Dripping with details',
      tipSize: 13,
      seed: 12,
    })

    const handles: { destroy(): void }[] = [button, sw, sl, tip.emerge, tip.button]
    return {
      cards: [cb.wrap, cs.wrap, cl.wrap, ct.wrap],
      tips: [{ host: tip.host, emerge: tip.emerge }],
      destroy: () => handles.forEach((h) => h.destroy()),
    }
  },
  step,
}

// Keep handle types referenced for editors.
export type { GoopHandle, SliderHandle, SwitchHandle }

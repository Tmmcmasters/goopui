// Scene 6 (paper): form controls. The cursor drags the GoopSlider back and forth (jelly thumb,
// sloshing fill) while a GoopProgress fills with liquid and drips; then a GoopCheckbox click
// (the drop splats into the box) and two GoopRadioGroup picks (the blob jumps and splats).

import {
  attachCheckbox,
  attachProgress,
  attachRadioGroup,
  attachSlider,
  type CheckboxHandle,
  type ProgressHandle,
  type RadioGroupHandle,
  type SliderHandle,
} from '@goopui/core'
import { cursorPath, ease } from '../../goo/path'
import type { Click } from '../../goo/replay'
import type { SceneAction, SceneScript } from '../../goo/scene'
import { el, entrance, svg } from '../dom'

const X0 = 90
const X1 = 390
const SLIDER_Y = 164
const PROGRESS_Y = 238
const CHECK_Y = 304
const RADIO_Y = 362
const RADIO_X = [X0 + 12, X0 + 122, X0 + 240]
const RADIOS = ['Small', 'Medium', 'Large']

const sliderX = (v: number): number => X0 + (v / 100) * (X1 - X0)

interface Rt {
  rows: HTMLElement[]
  slider: SliderHandle
  progress: ProgressHandle
  progressLabel: HTMLElement
  checkbox: CheckboxHandle
  radio: RadioGroupHandle
  destroy(): void
}

export const clicks: Click[] = [
  { down: 0.62, up: 1.6 }, // slider drag
  { down: 2.02, up: 2.1 }, // checkbox
  { down: 2.46, up: 2.54 }, // radio: Medium
  { down: 2.98, up: 3.06 }, // radio: Large
]

export const cursor = cursorPath(
  { x: 300, y: 520 },
  0.2,
  [
    { t0: 0.22, t1: 0.56, via: { x: 160, y: 300 }, to: { x: sliderX(30) + 1, y: SLIDER_Y + 2 }, ease: ease.outQuart },
    // Drag: fling right, back left, settle (the fill sloshes against each stop).
    { t0: 0.68, t1: 0.98, to: { x: sliderX(86), y: SLIDER_Y + 5 }, ease: ease.inOutCubic },
    { t0: 1.02, t1: 1.28, to: { x: sliderX(44), y: SLIDER_Y + 1 }, ease: ease.inOutCubic },
    { t0: 1.3, t1: 1.52, to: { x: sliderX(70), y: SLIDER_Y + 3 }, ease: ease.inOutCubic },
    { t0: 1.66, t1: 1.96, via: { x: 150, y: 250 }, to: { x: X0 + 14, y: CHECK_Y + 2 }, ease: ease.inOutCubic },
    { t0: 2.14, t1: 2.4, via: { x: 160, y: 340 }, to: { x: RADIO_X[1]! + 2, y: RADIO_Y + 1 }, ease: ease.inOutCubic },
    { t0: 2.6, t1: 2.92, to: { x: RADIO_X[2]! + 1, y: RADIO_Y + 2 }, ease: ease.inOutCubic },
    { t0: 3.15, t1: 3.9, to: { x: 430, y: 430 }, ease: ease.inOutSine },
  ],
  0.6,
)

const PROGRESS_STEPS: [number, number][] = [
  [0.45, 38],
  [1.15, 63],
  [1.85, 84],
  [2.6, 100],
]

const actions: SceneAction<Rt>[] = PROGRESS_STEPS.map(([t, v]) => ({
  t,
  run(rt) {
    rt.progress.update({ value: v })
    rt.progressLabel.textContent = `${v}%`
  },
}))

export const formScene: SceneScript<Rt> = {
  seed: 909,
  cursor,
  clicks,
  actions,
  build(root) {
    const rows: HTMLElement[] = []
    const row = (children: Node[]) => {
      const r = el('div', { style: 'position:absolute;inset:0;pointer-events:none;' }, children)
      root.append(r)
      rows.push(r)
      return r
    }

    // ---- slider ----
    let value = 30
    const range = el('div', { class: 'slider-range', attrs: { 'data-slot': 'slider-range' }, style: `width:${value}%;` })
    const track = el('div', { class: 'slider-track', attrs: { 'data-slot': 'slider-track' } }, [range])
    const thumb = el('div', { class: 'slider-thumb', attrs: { 'data-slot': 'slider-thumb', role: 'slider' }, style: `left:${value}%;` })
    const slider = el('div', { class: 'slider', attrs: { 'data-slot': 'slider' }, style: `position:absolute;left:${X0}px;width:${X1 - X0}px;top:${SLIDER_Y - 14}px;pointer-events:auto;` }, [track, thumb])
    const volLabel = el('div', { class: 'lbl', style: `position:absolute;left:${X0}px;top:${SLIDER_Y - 40}px;` }, ['Volume'])
    const volValue = el('div', { class: 'lbl muted', style: `position:absolute;right:${480 - X1}px;top:${SLIDER_Y - 40}px;font-variant-numeric:tabular-nums;` }, [`${value}`])
    row([volLabel, volValue, slider])

    // ---- progress ----
    const indicator = el('div', { attrs: { 'data-slot': 'progress-indicator' }, style: 'position:absolute;inset:0;background:transparent;' })
    const progressEl = el('div', { class: 'progress', attrs: { role: 'progressbar' }, style: `position:absolute;left:${X0}px;width:${X1 - X0}px;top:${PROGRESS_Y - 6}px;` }, [indicator])
    const progressLabel = el('div', { class: 'lbl muted', style: `position:absolute;right:${480 - X1}px;top:${PROGRESS_Y - 34}px;font-variant-numeric:tabular-nums;` }, ['12%'])
    row([el('div', { class: 'lbl', style: `position:absolute;left:${X0}px;top:${PROGRESS_Y - 34}px;` }, ['Uploading']), progressLabel, progressEl])

    // ---- checkbox ----
    const mark = el('span', { attrs: { 'data-goop-mark': '' }, style: 'display:grid;place-items:center;opacity:0;' }, [
      svg('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'),
    ])
    const box = el('div', { class: 'check', attrs: { role: 'checkbox', 'aria-checked': 'false', 'data-state': 'unchecked' }, style: `position:absolute;left:${X0}px;top:${CHECK_Y - 13}px;pointer-events:auto;` }, [mark])
    row([box, el('div', { class: 'lbl', style: `position:absolute;left:${X0 + 40}px;top:${CHECK_Y - 8}px;` }, ['Accept terms and conditions'])])

    // ---- radio group ----
    const group = el('div', { class: 'radio-group', attrs: { role: 'radiogroup' }, style: `position:absolute;left:${X0}px;top:${RADIO_Y - 12}px;width:${X1 - X0}px;height:24px;pointer-events:auto;` })
    const items: HTMLElement[] = []
    RADIOS.forEach((name, i) => {
      const on = i === 0
      const item = el('div', { class: 'radio', attrs: { role: 'radio', 'aria-checked': String(on), 'data-state': on ? 'checked' : 'unchecked', 'data-value': name }, style: `position:absolute;left:${RADIO_X[i]! - X0 - 12}px;top:0;` }, [
        el('span', { class: 'dot', attrs: { 'data-goop-mark': '' } }),
      ])
      const label = el('div', { class: 'lbl', style: `position:absolute;left:${RADIO_X[i]! - X0 + 20}px;top:4px;`, text: name })
      group.append(item, label)
      items.push(item)
    })
    row([group])

    // ---- attach ----
    const common = { renderer: 'svg' as const, reducedMotion: false as const }
    const sliderH = attachSlider(slider, common)
    const progress = attachProgress(progressEl, { ...common, value: 12, max: 100, seed: 3 })
    const checkbox = attachCheckbox(box, { ...common, checked: false })
    const radio = attachRadioGroup(group, { ...common, value: RADIOS[0] })

    // ---- behaviour (what reka does) ----
    let dragging = false
    const setFromX = (clientX: number) => {
      const r = slider.getBoundingClientRect()
      const v = Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)))
      if (v === value) return
      value = v
      thumb.style.left = `${v}%`
      range.style.width = `${v}%`
      volValue.textContent = String(v)
    }
    slider.addEventListener('pointerdown', (e) => {
      dragging = true
      setFromX(e.clientX)
    })
    slider.addEventListener('pointermove', (e) => dragging && setFromX(e.clientX))
    slider.addEventListener('pointerup', () => (dragging = false))
    let checked = false
    box.addEventListener('click', () => {
      checked = !checked
      box.setAttribute('aria-checked', String(checked))
      box.setAttribute('data-state', checked ? 'checked' : 'unchecked')
      mark.style.opacity = checked ? '' : '0'
      checkbox.update({ checked })
    })
    items.forEach((item, i) => {
      item.addEventListener('click', () => {
        items.forEach((o, j) => {
          o.setAttribute('aria-checked', String(i === j))
          o.setAttribute('data-state', i === j ? 'checked' : 'unchecked')
        })
        radio.update({ value: RADIOS[i] })
      })
    })

    return {
      rows,
      slider: sliderH,
      progress,
      progressLabel,
      checkbox,
      radio,
      destroy() {
        sliderH.destroy()
        progress.destroy()
        checkbox.destroy()
        radio.destroy()
      },
    }
  },
  step(rt, t) {
    rt.rows.forEach((w, i) => {
      const [o, y] = entrance(t, 0.04 + i * 0.06)
      w.style.opacity = String(o)
      w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
    })
  },
}

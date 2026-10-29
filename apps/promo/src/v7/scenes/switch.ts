// Scene 3 (night): a little settings list of GoopSwitches. Each flip throws the thumb into
// the far wall (splat + droplets) and the track color floods in as a wave on impact.

import { attachSwitch, type SwitchHandle } from '@goopui/core'
import { cursorPath, ease, type Pt, type Segment } from '../../goo/path'
import type { Click } from '../../goo/replay'
import type { SceneScript } from '../../goo/scene'
import { el, entrance } from '../dom'

const W = 88
const H = 50
const RIGHT = 376
const ROWS = [
  { y: 170, label: 'Wi-Fi', on: false },
  { y: 244, label: 'Dark mode', on: true },
  { y: 318, label: 'Goo mode', on: false },
]
const center = (i: number): Pt => ({ x: RIGHT - W / 2, y: ROWS[i]!.y })

interface Rt {
  rows: HTMLElement[]
  handles: SwitchHandle[]
  destroy(): void
}

// (row, click time)
const PLAN: [number, number][] = [
  [0, 0.62],
  [2, 1.2],
  [1, 1.78],
  [1, 2.42],
  [0, 3.02],
]

export const clicks: Click[] = PLAN.map(([, d]) => ({ down: d, up: d + 0.085 }))

const segs: Segment[] = []
{
  let prevUp = 0.12
  PLAN.forEach(([row, d], i) => {
    const c = center(row)
    // Land a little off-center (a hand is never exact), then click.
    const jitter = { x: ((i * 37) % 11) - 5 + 6, y: ((i * 23) % 7) - 3 }
    const to = { x: c.x + jitter.x, y: c.y + jitter.y }
    const t0 = i === 0 ? 0.15 : prevUp + 0.06
    const t1 = d - 0.07
    if (i === 0) segs.push({ t0, t1, via: { x: 450, y: 300 }, to, ease: ease.outQuart })
    else segs.push({ t0, t1, via: { x: to.x + 34, y: (to.y + center(PLAN[i - 1]![0]).y) / 2 }, to, ease: ease.inOutCubic })
    prevUp = d + 0.085
  })
  segs.push({ t0: 3.2, t1: 3.9, to: { x: 420, y: 400 }, ease: ease.inOutSine })
}

export const cursor = cursorPath({ x: 520, y: 380 }, 0.1, segs, 0.6)

export const switchScene: SceneScript<Rt> = {
  seed: 808,
  cursor,
  clicks,
  build(root) {
    const rows: HTMLElement[] = []
    const handles: SwitchHandle[] = []
    ROWS.forEach((r) => {
      let checked = r.on
      const track = el('div', {
        class: 'switch',
        attrs: { role: 'switch', 'aria-checked': String(checked), 'data-state': checked ? 'checked' : 'unchecked' },
        style: `position:absolute;left:${RIGHT - W}px;top:${r.y - H / 2}px;width:${W}px;height:${H}px;`,
      })
      const label = el('div', {
        text: r.label,
        style: `position:absolute;left:104px;top:${r.y - 11}px;font-size:21px;font-weight:500;line-height:22px;pointer-events:none;`,
      })
      const row = el('div', { style: 'position:absolute;inset:0;pointer-events:none;' }, [label, track])
      track.style.pointerEvents = 'auto'
      root.append(row)
      rows.push(row)
      const handle = attachSwitch(track, { checked, renderer: 'svg', reducedMotion: false })
      track.addEventListener('click', () => {
        checked = !checked
        track.setAttribute('aria-checked', String(checked))
        track.setAttribute('data-state', checked ? 'checked' : 'unchecked')
        handle.update({ checked })
      })
      handles.push(handle)
    })
    // Hairlines between the rows, like a settings list.
    for (const y of [207, 281]) root.append(el('div', { style: `position:absolute;left:104px;width:${RIGHT - 104}px;top:${y}px;height:1px;background:var(--border);pointer-events:none;` }))
    return { rows, handles, destroy: () => handles.forEach((h) => h.destroy()) }
  },
  step(rt, t) {
    rt.rows.forEach((w, i) => {
      const [o, y] = entrance(t, 0.04 + i * 0.06)
      w.style.opacity = String(o)
      w.style.transform = y ? `translateY(${y.toFixed(2)}px)` : ''
    })
  },
}

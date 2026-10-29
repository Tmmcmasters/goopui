// Scene 5 (night): GoopToaster. Three toasts drop in as blobs and inflate; the collapsed
// stack is merged by goo necks; hovering expands it (necks stretch and snap); one toast is
// dismissed and drips away; leaving collapses the stack and the necks re-form.
//
// The markup is sonner's ([data-sonner-toaster] list, [data-sonner-toast] items with
// data-y-position / data-removed / data-expanded). Sonner's layout transitions are replaced
// by a stepped smoothing on the replay clock, so every frame is deterministic.

import { attachToaster, type ToasterHandle } from '@goopui/core'
import { cursorPath, ease } from '../../goo/path'
import type { Click } from '../../goo/replay'
import type { SceneScript } from '../../goo/scene'
import { COLORS } from '../../timeline'
import { el, entrance, svg } from '../dom'

const LEFT = 84
const WIDTH = 312
const BOTTOM = 384
const TH = 64
const GAP = 14
const PEEK = 14

interface ToastSpec {
  at: number
  title: string
  desc: string
}
const TOASTS: ToastSpec[] = [
  { at: 0.3, title: 'Event created', desc: 'Sunday, Dec 3 at 9:00 AM' },
  { at: 0.9, title: 'Changes saved', desc: 'Your profile is up to date.' },
  { at: 1.5, title: 'Message sent', desc: 'Ada will see it in a moment.' },
]

interface Live {
  spec: ToastSpec
  el: HTMLElement
  content: HTMLElement
  y: number
  s: number
  /** Text visibility (older toasts hide theirs while collapsed), smoothed. */
  o: number
  removedAt: number | null
  gone: boolean
}

interface Rt {
  list: HTMLElement
  handle: ToasterHandle
  toasts: Live[]
  expanded: boolean
  last: number
  destroy(): void
}

// Expanded layout: front toast at the bottom, the rest stacked above it (newest first).
const expandedY = (i: number): number => -i * (TH + GAP)
const collapsedY = (i: number): number => -i * PEEK

// Cursor: wait, hover the stack (expands), click the middle toast's close, leave (collapses).
const X_BTN = { x: LEFT + WIDTH - 20, y: BOTTOM - TH + 20 } // close button of a toast at y offset 0
const xAt = (i: number) => ({ x: X_BTN.x, y: X_BTN.y + expandedY(i) })

export const clicks: Click[] = [{ down: 2.66, up: 2.74 }]

export const cursor = cursorPath(
  { x: 520, y: 140 },
  0.4,
  [
    { t0: 1.75, t1: 2.15, via: { x: 420, y: 200 }, to: { x: 300, y: BOTTOM - 40 }, ease: ease.outQuart },
    { t0: 2.24, t1: 2.6, to: { x: xAt(0).x + 1, y: xAt(0).y + 1 }, ease: ease.inOutCubic },
    { t0: 2.84, t1: 3.12, to: { x: 318, y: BOTTOM - TH - 50 }, ease: ease.inOutSine },
    { t0: 3.2, t1: 3.6, via: { x: 440, y: 300 }, to: { x: 470, y: 160 }, ease: ease.inOutSine },
  ],
  0.6,
)

const check = () =>
  svg(
    `<svg width="22" height="22" viewBox="0 0 24 24" style="flex-shrink:0"><circle cx="12" cy="12" r="11" fill="${COLORS.slime}"/><path d="m7.5 12.3 3 3 6-6.3" fill="none" stroke="${COLORS.ink}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  )
const cross = () =>
  svg('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>')

export const toastScene: SceneScript<Rt> = {
  seed: 5150,
  cursor,
  clicks,
  build(root) {
    const list = el('ol', {
      attrs: { 'data-sonner-toaster': '', 'data-y-position': 'bottom' },
      style: `left:${LEFT}px;top:${BOTTOM - TH}px;width:${WIDTH}px;height:${TH}px;`,
    })
    root.append(list)
    const handle = attachToaster(list, { reducedMotion: false })
    // The goo layer lives in <body> as a fixed overlay; keep it inside the scene (same
    // coordinates: nothing above it is transformed) so the cursor and captions stay on top.
    root.append(handle.layer)
    const rt: Rt = { list, handle, toasts: [], expanded: false, last: 0, destroy: () => handle.destroy() }
    list.addEventListener('pointerenter', () => {
      rt.expanded = true
    })
    list.addEventListener('pointerleave', () => {
      rt.expanded = false
    })
    return rt
  },
  step(rt, t) {
    const dt = t - rt.last
    rt.last = t
    // Mount toasts on schedule.
    for (const spec of TOASTS) {
      if (t >= spec.at && !rt.toasts.some((x) => x.spec === spec)) {
        const x = el('button', { class: 'x', attrs: { tabindex: '-1', 'aria-label': 'Close' } }, [cross()])
        const content = el('div', { style: 'display:flex;align-items:center;gap:11px;width:100%;' }, [
          check(),
          el('div', { style: 'display:flex;flex-direction:column;gap:3px;' }, [el('div', { class: 'ttl', text: spec.title }), el('div', { class: 'dsc', text: spec.desc })]),
          x,
        ])
        const node = el('li', {
          attrs: { 'data-sonner-toast': '', 'data-y-position': 'bottom', 'data-mounted': 'true', 'data-expanded': String(rt.expanded) },
          style: `height:${TH}px;`,
        }, [content])
        // Newest first in the list (sonner renders them in that order).
        rt.list.prepend(node)
        const live: Live = { spec, el: node, content, y: 0, s: 1, o: 1, removedAt: null, gone: false }
        x.style.border = '0'
        x.style.background = 'transparent'
        x.style.padding = '0'
        x.addEventListener('click', () => {
          if (live.removedAt !== null) return
          live.removedAt = rt.last
          node.setAttribute('data-removed', 'true')
          // The dismissed toast's goo (body + drips) is slime: core reads the toast's own
          // background when its class changes, so cream drips don't glow on the dark stage.
          node.classList.add('dismissed')
        })
        rt.toasts.unshift(live)
      }
    }
    // Layout (sonner's offsets), smoothed like its 400ms transitions.
    // A dismissed toast keeps its slot for a beat while it drips away (sonner re-flows at
    // once; holding it lets the drops fall clear of the toast sliding into its place).
    const alive = rt.toasts.filter((x) => x.removedAt === null || t - x.removedAt < 0.3)
    const k = 1 - Math.exp(-dt * 13)
    for (const x of rt.toasts) {
      if (x.gone) continue
      if (x.removedAt !== null) {
        const age = t - x.removedAt
        x.content.style.opacity = String(Math.max(0, 1 - age / 0.12))
        // Out of the stack's way once its slot is released.
        if (age >= 0.3) x.el.style.zIndex = '0'
        if (age > 0.42) {
          x.gone = true
          x.el.remove()
        }
        continue
      }
      const i = alive.indexOf(x)
      const ty = rt.expanded ? expandedY(i) : collapsedY(i)
      const ts = rt.expanded ? 1 : 1 - i * 0.05
      const age = t - x.spec.at
      if (age < 0.01) {
        x.y = ty
        x.s = ts
      } else {
        x.y += (ty - x.y) * k
        x.s += (ts - x.s) * k
      }
      x.el.style.transform = `translateY(${x.y.toFixed(2)}px) scale(${x.s.toFixed(4)})`
      x.el.style.zIndex = String(10 - i)
      // Text fades in as the blob inflates; older collapsed toasts hide their text.
      const [fadeIn] = entrance(age, 0.14, 0.3)
      const show = rt.expanded || i === 0 ? 1 : 0
      x.o += (show - x.o) * (1 - Math.exp(-dt * 22))
      x.content.style.opacity = String(Math.round(fadeIn * x.o * 1000) / 1000)
      const exp = String(rt.expanded)
      if (x.el.getAttribute('data-expanded') !== exp) x.el.setAttribute('data-expanded', exp)
      if (x.el.getAttribute('data-front') !== String(i === 0)) x.el.setAttribute('data-front', String(i === 0))
    }
  },
}

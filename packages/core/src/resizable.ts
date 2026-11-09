// Resizable goo handle: while a panel divider is dragged its grip is a goo bead that swells a
// little and bulges toward the drag direction (a low, wide mound on its leading side, the
// trailing side drawn in a touch), and on release it wobbles back to rest like jelly. A handle
// with no grip gets the same mound on the divider line itself, under the pointer.
//
// Cheap on purpose: no filter. The bead is one aria-hidden <svg> path inside the handle (filled
// in the grip's own colour, or the line's), drawn only while dragging or settling, on the shared
// frame loop; the real grip is hidden (visibility, inline) only while the bead shows. At rest
// nothing runs and the handle is exactly the primitive's. The bead is painted overflow: no
// layout shift, no scroll growth, and it stays well inside the panel group. Dragging is read
// from the primitive's own state attribute (reka Splitter: `data-state="drag"`;
// react-resizable-panels: `data-separator="active"`), the speed from the handle's movement.
// Reduced motion: a plain handle. No DOM access until `attachResizableHandle` is called
// (SSR-safe); `resizableBeadPath` is pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { clamp, isSpringSettled, springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable resizable handle effects (boolean or multiplier). */
export const RESIZABLE_EFFECTS = ['bulge', 'wobble'] as const
export type ResizableEffect = (typeof RESIZABLE_EFFECTS)[number]

export interface ResizableFeel {
  /** How much the bead swells while dragged (fraction of its thickness). */
  swell: number
  /** Bulge (px) per px/s of drag speed. */
  gain: number
  /** Most the bead bulges toward the drag (px). Low. */
  max: number
  /** Length of the mound on a bare divider line (px). */
  mound: number
  /** While dragging: the bulge follows the speed, a little soft. */
  drag: { response: number; dampingRatio: number }
  /** On release (wobble on): under-damped, so it jiggles back once or twice. */
  release: { response: number; dampingRatio: number }
}

export const RESIZABLE_FEEL: Readonly<Record<GoopPreset, Readonly<ResizableFeel>>> = Object.freeze({
  subtle: Object.freeze({
    swell: 0.25,
    gain: 0.004,
    max: 2,
    mound: 36,
    drag: { response: 0.16, dampingRatio: 0.8 },
    release: { response: 0.34, dampingRatio: 0.42 },
  }),
  playful: Object.freeze({
    swell: 0.4,
    gain: 0.006,
    max: 3,
    mound: 44,
    drag: { response: 0.16, dampingRatio: 0.72 },
    release: { response: 0.38, dampingRatio: 0.3 },
  }),
  wild: Object.freeze({
    swell: 0.6,
    gain: 0.009,
    max: 4.5,
    mound: 56,
    drag: { response: 0.18, dampingRatio: 0.62 },
    release: { response: 0.42, dampingRatio: 0.22 },
  }),
})

/** Set on the grip element inside a handle (the bead takes its place while it moves). */
export const RESIZABLE_GRIP_ATTR = 'data-goop-grip'

export interface ResizableOptions {
  /** The bead swells and bulges toward the drag. `false`: off; `true`: the preset's; a number scales it. */
  bulge?: boolean | number
  /** On release the bead wobbles back like jelly (off: it eases back). A number scales the wobble. */
  wobble?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the handle static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface ResizableHandle {
  update(options: ResizableOptions): void
  /** Current bulge (px, signed: + toward right / down) and swell (fraction). */
  readonly pose: { bulge: number; swell: number }
  readonly dragging: boolean
  readonly running: boolean
  destroy(): void
}

export interface ResizableBeadShape {
  /** Centre of the bead in the handle's own coordinates (px). */
  cx: number
  cy: number
  /** Length along the divider and thickness across it (px). */
  length: number
  thickness: number
  /** Mound on the leading side (px, signed: + toward right / down). */
  bulge: number
  /** Extra thickness (fraction). */
  swell: number
  /** `true`: the divider runs top to bottom (it bulges along x). */
  vertical: boolean
}

const fmt = (v: number): string => (Math.round(v * 100) / 100).toString()

/**
 * SVG path of a goo bead: a capsule `length` long and `thickness` (times 1 + swell) thick,
 * whose leading side rises in a raised-cosine mound of `bulge` px (zero slope at both ends, so
 * no kink, never a knob) while the trailing side draws in a little. Pure.
 */
export function resizableBeadPath(shape: ResizableBeadShape): string {
  const { cx, cy, vertical } = shape
  const length = Math.max(1, shape.length)
  const half = length / 2
  const r = Math.max(0.25, (shape.thickness / 2) * (1 + Math.max(0, shape.swell)))
  const cap = Math.min(r, half)
  const b = shape.bulge
  const steps = Math.max(12, 2 * Math.ceil(length / 3))
  const lead: Array<[number, number]> = []
  const trail: Array<[number, number]> = []
  for (let k = 0; k <= steps; k++) {
    const s = -half + (length * k) / steps
    // Capsule half-width at s (round ends).
    const e = Math.abs(s) - (half - cap)
    const w = e > 0 ? Math.sqrt(Math.max(0, cap * cap - e * e)) * (r / cap) : r
    const m = 0.5 * (1 + Math.cos((Math.PI * s) / half))
    const out = w + Math.abs(b) * m
    const inn = Math.max(w * 0.4, w - Math.abs(b) * 0.3 * m)
    const sign = b >= 0 ? 1 : -1
    const a = vertical ? cy + s : cx + s
    const p = (off: number): [number, number] => (vertical ? [cx + off, a] : [a, cy + off])
    lead.push(p(sign * out))
    trail.push(p(-sign * inn))
  }
  const pts = [...lead, ...trail.reverse()]
  return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${fmt(x)} ${fmt(y)}`).join('') + 'Z'
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const transparent = (c: string): boolean => !c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)'

/** Whether the primitive marks the handle as being dragged. */
export const isResizableDragging = (el: Element): boolean =>
  el.getAttribute('data-state') === 'drag' || el.getAttribute('data-separator') === 'active'

/** Attach the goo bead to a resize handle (reka `SplitterResizeHandle` or react-resizable-panels'
 *  `Separator`; its grip, if any: `[data-goop-grip]`). */
export function attachResizableHandle(handle: HTMLElement, initial: ResizableOptions = {}): ResizableHandle {
  const doc = handle.ownerDocument
  const win = doc.defaultView
  let options: ResizableOptions = { ...initial }
  const readReduced = (): boolean =>
    options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('data-goop', 'resizable')
  svg.setAttribute('focusable', 'false')
  svg.style.cssText =
    'position:absolute;left:0;top:0;width:1px;height:1px;overflow:visible;pointer-events:none;display:none;z-index:10;'
  const path = doc.createElementNS(SVG_NS, 'path')
  svg.append(path)
  handle.append(svg)

  let feel: ResizableFeel = RESIZABLE_FEEL[GOOP_DEFAULT_PRESET]
  let dragCfg: SpringConfig = springConfig(feel.drag)
  let releaseCfg: SpringConfig = springConfig(feel.release)
  let easeCfg: SpringConfig = springConfig({ response: feel.release.response, dampingRatio: 1 })
  const resolveFeel = (): void => {
    feel = RESIZABLE_FEEL[readPreset(handle, options.preset)] ?? RESIZABLE_FEEL[GOOP_DEFAULT_PRESET]
    const sp = options.speed && options.speed > 0 ? options.speed : 1
    dragCfg = springConfig({ response: feel.drag.response / sp, dampingRatio: feel.drag.dampingRatio })
    const w = Math.min(3, effectStrength(options.wobble ?? true))
    // A stronger wobble is a looser spring (never past critical the other way).
    const ratio = w > 0 ? clamp(feel.release.dampingRatio / Math.sqrt(w), 0.12, 0.95) : 1
    releaseCfg = springConfig({ response: feel.release.response / sp, dampingRatio: ratio })
    easeCfg = springConfig({ response: feel.release.response / sp, dampingRatio: 1 })
  }
  resolveFeel()

  const bulge: SpringState = { x: 0, v: 0 }
  const swell: SpringState = { x: 0, v: 0 }
  let dragging = false
  let vertical = true
  let lastPos: number | null = null
  let vel = 0
  /** Where along the bare line the mound sits (px from the handle's start). */
  let along: number | null = null
  let shown = false
  let hiddenGrip: HTMLElement | null = null

  const bulgeOn = (): number => (reduced ? 0 : effectStrength(options.bulge))
  const wobbleOn = (): number => (reduced ? 0 : effectStrength(options.wobble ?? true))
  const gripEl = (): HTMLElement | null => handle.querySelector<HTMLElement>(`[${RESIZABLE_GRIP_ATTR}]`)

  const posOf = (): number => {
    const r = handle.getBoundingClientRect()
    return vertical ? r.left + r.width / 2 : r.top + r.height / 2
  }

  const show = (on: boolean): void => {
    if (on === shown) return
    shown = on
    if (on) {
      const g = gripEl()
      const src = g ?? handle
      const color = win?.getComputedStyle(src).backgroundColor ?? ''
      path.setAttribute('fill', transparent(color) ? 'currentColor' : color)
      if (g) {
        hiddenGrip = g
        g.style.visibility = 'hidden'
      }
      svg.style.display = ''
    } else {
      svg.style.display = 'none'
      if (hiddenGrip) hiddenGrip.style.visibility = ''
      hiddenGrip = null
    }
  }

  const paint = (): void => {
    const b = bulge.x
    const sw = swell.x
    if (Math.abs(b) < 0.03 && Math.abs(sw) < 0.01) {
      show(false)
      return
    }
    show(true)
    const hr = handle.getBoundingClientRect()
    const g = gripEl()
    let shape: ResizableBeadShape
    if (g) {
      const gr = g.getBoundingClientRect()
      // The grip may be rotated 90deg (horizontal handles): measure its box, not its CSS size.
      const long = vertical ? gr.height : gr.width
      const thick = vertical ? gr.width : gr.height
      shape = {
        cx: gr.left - hr.left + gr.width / 2,
        cy: gr.top - hr.top + gr.height / 2,
        length: long * (1 + sw * 0.2),
        thickness: thick,
        bulge: b,
        swell: sw,
        vertical,
      }
    } else {
      const extent = vertical ? hr.height : hr.width
      const len = Math.min(feel.mound, extent)
      const at = clamp(along ?? extent / 2, len / 2, Math.max(len / 2, extent - len / 2))
      shape = {
        cx: vertical ? hr.width / 2 : at,
        cy: vertical ? at : hr.height / 2,
        length: len,
        thickness: Math.max(1, vertical ? hr.width : hr.height),
        bulge: b,
        swell: sw,
        vertical,
      }
    }
    path.setAttribute('d', resizableBeadPath(shape))
  }

  const tick: Ticker = (dt) => {
    const strength = Math.min(3, bulgeOn())
    let bulgeTarget = 0
    let swellTarget = 0
    if (dragging && strength > 0) {
      const p = posOf()
      if (lastPos !== null && dt > 0) vel = vel * 0.55 + ((p - lastPos) / dt) * 0.45
      lastPos = p
      // The leading side bulges toward the drag.
      bulgeTarget = clamp(vel * feel.gain, -feel.max, feel.max) * strength
      swellTarget = feel.swell * strength
    }
    const cfg = dragging ? dragCfg : wobbleOn() > 0 ? releaseCfg : easeCfg
    stepSpring(bulge, bulgeTarget, cfg, dt)
    stepSpring(swell, swellTarget, cfg, dt)
    const settled = isSpringSettled(bulge, bulgeTarget, 0.03, 0.3) && isSpringSettled(swell, swellTarget, 0.005, 0.05)
    if (!dragging && settled) {
      bulge.x = bulge.v = swell.x = swell.v = 0
      paint()
      return false
    }
    paint()
    return true
  }

  const onPointer = (e: PointerEvent): void => {
    if (!dragging && e.type === 'pointermove') return
    const r = handle.getBoundingClientRect()
    along = vertical ? e.clientY - r.top : e.clientX - r.left
  }

  const sync = (): void => {
    const now = isResizableDragging(handle)
    if (now === dragging) return
    dragging = now
    if (now) {
      vertical = handle.offsetHeight >= handle.offsetWidth
      lastPos = posOf()
      vel = 0
      win?.addEventListener('pointermove', onPointer, { passive: true })
    } else {
      lastPos = null
      vel = 0
      win?.removeEventListener('pointermove', onPointer)
    }
    if (bulgeOn() > 0) wakeTicker(tick)
  }
  handle.addEventListener('pointerdown', onPointer, { passive: true })
  const MO = win?.MutationObserver
  const mo = MO ? new MO(() => sync()) : undefined
  mo?.observe(handle, { attributes: true, attributeFilter: ['data-state', 'data-separator'] })

  const reset = (): void => {
    removeTicker(tick)
    bulge.x = bulge.v = swell.x = swell.v = 0
    show(false)
  }

  const stopWatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) reset()
  })

  return {
    update(next) {
      options = { ...next }
      reduced = readReduced()
      resolveFeel()
      if (bulgeOn() <= 0) reset()
    },
    get pose() {
      return { bulge: bulge.x, swell: swell.x }
    },
    get dragging() {
      return dragging
    },
    get running() {
      return dragging || Math.abs(bulge.x) > 0.03 || Math.abs(swell.x) > 0.01
    },
    destroy() {
      reset()
      mo?.disconnect()
      stopWatch()
      handle.removeEventListener('pointerdown', onPointer)
      win?.removeEventListener('pointermove', onPointer)
      svg.remove()
    },
  }
}

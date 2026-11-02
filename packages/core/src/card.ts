// Card goo edge: while the pointer is over a card, the card's edge nearest to it swells
// gently toward the pointer in a low, wide mound (a raised cosine, never a knob) that
// trails the pointer with a soft spring and settles back flat when it leaves.
//
// Cheap on purpose: one aria-hidden <svg> with a single path, inside the card behind its
// content (z-index -1 in the card's own stacking context, so it paints over the card's
// background and border but under its content). No filter. The path redraws the card's own
// rounded box (its background colour, border colour and width, and corner radius read from
// the card) with the mound pushed out of the edge, so where there is no mound it lies
// exactly on the card. It is drawn only while the mound moves on the shared frame loop and
// hidden again once it has settled flat. Mouse / pen hover only (touch has no hover).
// The mound is painted past the svg box (overflow: visible), which is ink overflow, so it
// never grows the page's scroll size. Reduced motion: no swell, the card stays static.
// No DOM access until `attachCard` is called (SSR-safe); `cardPath` is pure.

import { GOOP_DEFAULT_PRESET, type GoopPreset } from './constants'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { effectStrength } from './skeleton'
import { isSpringSettled, springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Individually toggleable card effects (boolean or multiplier). */
export const CARD_EFFECTS = ['swell'] as const
export type CardEffect = (typeof CARD_EFFECTS)[number]

export interface CardFeel {
  /** Mound height at full strength (px). Low. */
  height: number
  /** Mound half-width as a fraction of the edge's length (wide), clamped to 40..160px. */
  width: number
  /** How far in from an edge the pointer starts to pull it (px). */
  reach: number
  /** Spring response (s) and damping ratio of the mound (a little under 1: soft overshoot). */
  response: number
  damping: number
}

export const CARD_FEEL: Readonly<Record<GoopPreset, Readonly<CardFeel>>> = Object.freeze({
  subtle: Object.freeze({ height: 2.5, width: 0.3, reach: 72, response: 0.34, damping: 0.75 }),
  playful: Object.freeze({ height: 3.5, width: 0.34, reach: 88, response: 0.32, damping: 0.6 }),
  wild: Object.freeze({ height: 5.5, width: 0.38, reach: 108, response: 0.3, damping: 0.48 }),
})

export interface CardOptions {
  /** The edge swell toward the pointer. `false`: off; `true`: the preset's; a number scales it. */
  swell?: boolean | number
  /** Animation speed multiplier. */
  speed?: number
  preset?: GoopPreset
  /** `true` keeps the card static; 'auto' (default) follows the OS / page setting. */
  reducedMotion?: boolean | 'auto'
}

export interface CardHandle {
  update(options: CardOptions): void
  destroy(): void
}

/** The four edges, clockwise from the top. */
export type CardEdge = 'top' | 'right' | 'bottom' | 'left'
export const CARD_EDGES: readonly CardEdge[] = ['top', 'right', 'bottom', 'left']

/** One edge's mound: `amp` px outward, centred `at` px along the edge (from its start). */
export interface CardMound {
  amp: number
  at: number
}

export interface CardShape {
  width: number
  height: number
  radius: number
  /** Border width: the path runs down the middle of the border. */
  border: number
  /** Mound half-width (px). */
  spread: number
  mounds: Readonly<Record<CardEdge, CardMound>>
}

/** Raised cosine bump, 1 at t = 0, 0 at |t| >= 1, smooth both ends. */
const bump = (t: number): number => (t <= -1 || t >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * t)))
const fmt = (v: number): string => (Math.round(v * 100) / 100).toString()

/** Mound half-width for an edge of `length` px. */
export function cardSpread(feel: CardFeel, length: number): number {
  return Math.min(160, Math.max(40, feel.width * length))
}

/**
 * Pull of an edge on the pointer: 1 at the edge, easing to 0 `reach` px in. `d` is the
 * pointer's distance in from that edge.
 */
export function cardPull(d: number, reach: number): number {
  if (!(reach > 0) || d >= reach) return 0
  return bump(Math.max(0, d) / reach)
}

/**
 * SVG path of the card's rounded box with each edge's mound pushed out, in the card's own
 * coordinates (0,0 = its top-left border corner). Pure.
 */
export function cardPath(shape: CardShape): string {
  const { width: w, height: h, border, spread } = shape
  const i = border / 2
  const r = Math.max(0, Math.min(shape.radius - i, (w - border) / 2, (h - border) / 2))
  const x0 = i
  const y0 = i
  const x1 = w - i
  const y1 = h - i
  let d = `M${fmt(x0 + r)} ${fmt(y0)}`
  // Walk one straight edge from `a` to `b` (along-edge coords), offsetting outward.
  const edge = (e: CardEdge, len: number, point: (s: number, out: number) => [number, number]): void => {
    const m = shape.mounds[e]
    const end = point(len, 0)
    if (!(m.amp > 0.02) || len <= 0) {
      d += `L${fmt(end[0])} ${fmt(end[1])}`
      return
    }
    // The mound fades out over the last stretch before each corner, so the corners never move.
    const fade = Math.min(len / 2, Math.max(8, spread * 0.35))
    const from = Math.max(0, m.at - spread)
    const to = Math.min(len, m.at + spread)
    const start = point(from, 0)
    d += `L${fmt(start[0])} ${fmt(start[1])}`
    const steps = Math.max(8, Math.ceil((to - from) / 3))
    for (let k = 1; k <= steps; k++) {
      const s = from + ((to - from) * k) / steps
      const edgeFade = Math.min(1, s / fade, (len - s) / fade)
      const out = m.amp * bump((s - m.at) / spread) * Math.max(0, edgeFade) ** 2
      const p = point(s, out)
      d += `L${fmt(p[0])} ${fmt(p[1])}`
    }
    d += `L${fmt(end[0])} ${fmt(end[1])}`
  }
  const arc = (x: number, y: number): void => {
    d += r > 0 ? `A${fmt(r)} ${fmt(r)} 0 0 1 ${fmt(x)} ${fmt(y)}` : `L${fmt(x)} ${fmt(y)}`
  }
  const hx = x1 - x0 - 2 * r
  const vy = y1 - y0 - 2 * r
  edge('top', hx, (s, out) => [x0 + r + s, y0 - out])
  arc(x1, y0 + r)
  edge('right', vy, (s, out) => [x1 + out, y0 + r + s])
  arc(x1 - r, y1)
  edge('bottom', hx, (s, out) => [x1 - r - s, y1 + out])
  arc(x0, y1 - r)
  edge('left', vy, (s, out) => [x0 - out, y1 - r - s])
  arc(x0 + r, y0)
  return `${d}Z`
}

const SVG_NS = 'http://www.w3.org/2000/svg'
const px = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '')
  return Number.isFinite(n) ? n : 0
}

/** Attach the goo edge to a card element. */
export function attachCard(host: HTMLElement, initial: CardOptions = {}): CardHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let options: CardOptions = { ...initial }
  let reduced = options.reducedMotion === true || (options.reducedMotion !== false && isReducedMotion(doc))

  const svg = doc.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('data-goop', 'card')
  svg.setAttribute('focusable', 'false')
  svg.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:-1;display:none;'
  const path = doc.createElementNS(SVG_NS, 'path')
  svg.append(path)
  host.prepend(svg)

  type EdgeState = { amp: SpringState; at: SpringState; target: number; aim: number; shown: boolean }
  const edges = Object.fromEntries(
    CARD_EDGES.map((e) => [e, { amp: { x: 0, v: 0 }, at: { x: 0, v: 0 }, target: 0, aim: 0, shown: false }]),
  ) as Record<CardEdge, EdgeState>

  let feel: CardFeel = CARD_FEEL[GOOP_DEFAULT_PRESET]
  let ampCfg: SpringConfig = springConfig({ response: feel.response, dampingRatio: feel.damping })
  let atCfg: SpringConfig = springConfig({ response: feel.response * 0.8, dampingRatio: 1 })
  let box = { w: 0, h: 0, radius: 0, border: 0 }

  const strength = (): number => effectStrength(options.swell)
  const resolveFeel = (): void => {
    feel = CARD_FEEL[readPreset(host, options.preset)] ?? CARD_FEEL[GOOP_DEFAULT_PRESET]
    const speed = options.speed && options.speed > 0 ? options.speed : 1
    ampCfg = springConfig({ response: feel.response / speed, dampingRatio: feel.damping })
    atCfg = springConfig({ response: (feel.response * 0.8) / speed, dampingRatio: 1 })
  }

  /** Read the card's box and paint (on pointer enter: cheap, and follows theme changes). */
  const measure = (): void => {
    const cs = win?.getComputedStyle(host)
    box = {
      w: host.offsetWidth,
      h: host.offsetHeight,
      radius: px(cs?.borderTopLeftRadius),
      border: px(cs?.borderTopWidth),
    }
    const bg = cs?.backgroundColor ?? ''
    const stroke = cs?.borderTopColor ?? ''
    path.setAttribute('fill', bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : 'transparent')
    if (box.border > 0) {
      path.setAttribute('stroke', stroke)
      path.setAttribute('stroke-width', String(box.border))
    } else path.removeAttribute('stroke')
    resolveFeel()
  }

  const draw = (): void => {
    // One half-width for every edge, from the longer side, never wider than half of it.
    const long = Math.max(box.w, box.h)
    const spread = Math.min(cardSpread(feel, long), long / 2)
    const mounds = {} as Record<CardEdge, CardMound>
    let any = false
    const r = Math.max(0, Math.min(box.radius - box.border / 2, box.w / 2, box.h / 2))
    for (const e of CARD_EDGES) {
      const s = edges[e]
      const amp = Math.max(0, s.amp.x)
      if (amp > 0.02) any = true
      // `at` is stored in edge coords from the edge's start corner (clockwise), minus the radius.
      mounds[e] = { amp, at: s.at.x - r }
    }
    if (!any) {
      svg.style.display = 'none'
      return
    }
    svg.style.display = ''
    path.setAttribute(
      'd',
      cardPath({ width: box.w, height: box.h, radius: box.radius, border: box.border, spread, mounds }),
    )
  }

  const tick: Ticker = (dt) => {
    let moving = false
    for (const e of CARD_EDGES) {
      const s = edges[e]
      stepSpring(s.amp, s.target, ampCfg, dt)
      stepSpring(s.at, s.aim, atCfg, dt)
      if (!isSpringSettled(s.amp, s.target, 0.02, 0.1) || (s.amp.x > 0.02 && !isSpringSettled(s.at, s.aim, 0.2, 1))) moving = true
    }
    draw()
    if (!moving) {
      // Settled: snap exactly onto the targets (so a flat card hides its layer).
      for (const e of CARD_EDGES) {
        const s = edges[e]
        s.amp.x = s.target
        s.amp.v = 0
      }
      draw()
    }
    return moving
  }

  const active = (): boolean => !reduced && strength() > 0

  const aimAt = (clientX: number, clientY: number): void => {
    const rect = host.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    const height = feel.height * Math.min(3, strength())
    // Along-edge coordinate, clockwise from each edge's start corner.
    const along: Record<CardEdge, number> = { top: x, right: y, bottom: box.w - x, left: box.h - y }
    const dist: Record<CardEdge, number> = { top: y, right: box.w - x, bottom: box.h - y, left: x }
    for (const e of CARD_EDGES) {
      const s = edges[e]
      const target = height * cardPull(dist[e], feel.reach)
      // A mound that is (nearly) gone re-forms right under the pointer instead of sliding in.
      if (s.amp.x < 0.05 && target > 0) {
        s.at.x = along[e]
        s.at.v = 0
      }
      s.aim = along[e]
      s.target = target
    }
    wakeTicker(tick)
  }

  const release = (): void => {
    for (const e of CARD_EDGES) edges[e].target = 0
    wakeTicker(tick)
  }

  const onEnter = (ev: PointerEvent): void => {
    if (ev.pointerType === 'touch' || !active()) return
    measure()
    aimAt(ev.clientX, ev.clientY)
  }
  const onMove = (ev: PointerEvent): void => {
    if (ev.pointerType === 'touch' || !active()) return
    if (box.w === 0) measure()
    aimAt(ev.clientX, ev.clientY)
  }
  const onLeave = (): void => release()

  host.addEventListener('pointerenter', onEnter)
  host.addEventListener('pointermove', onMove)
  host.addEventListener('pointerleave', onLeave)

  const settleFlat = (): void => {
    removeTicker(tick)
    for (const e of CARD_EDGES) {
      const s = edges[e]
      s.amp.x = s.amp.v = s.target = 0
    }
    svg.style.display = 'none'
  }

  const stopWatch =
    options.reducedMotion === 'auto' || options.reducedMotion === undefined
      ? watchReducedMotion(doc, (r) => {
          reduced = r
          if (r) settleFlat()
        })
      : () => {}

  return {
    update(next) {
      options = { ...next }
      if (options.reducedMotion === true) reduced = true
      else if (options.reducedMotion === false) reduced = false
      else reduced = isReducedMotion(doc)
      resolveFeel()
      if (!active()) settleFlat()
    },
    destroy() {
      removeTicker(tick)
      stopWatch()
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      svg.remove()
    },
  }
}

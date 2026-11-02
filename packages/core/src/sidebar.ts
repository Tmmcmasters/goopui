// Sidebar goo (GoopSidebar): two engines for a dashboard sidebar.
//
// Edge slosh (`attachSidebarEdge`): when the sidebar collapses or expands (icon mode's width
// change, offcanvas sliding out), its inner edge is goo with inertia. Every frame core reads
// where the edge is and how fast it moves; the change of that velocity is handed to a string
// of sprung columns along the edge (an inertial kick), and a little drag makes the goo trail
// the motion. So a collapse pushes low, wide mounds out of the edge while it travels and lets
// them slosh back when it stops; an expand lands with an overshoot that wobbles out. The
// mounds are one or two raised-cosine humps whose place, width and height are re-rolled for
// every motion (never a centred knob), and each column's stiffness varies a little so the
// edge ripples. Inward offsets draw nothing: at rest the goo is invisible and the sidebar's
// own edge and border show. Nothing ticks once the edge is still and the goo has settled.
//
// Menu highlight (`attachSidebarHighlight`): the dropdown's goo blob (`attachMenuHighlight`)
// on the sidebar's menu buttons. Sidebar buttons are plain buttons and links, so core marks
// the hovered (or keyboard-focused) one `data-highlighted` itself; the blob glides between
// them with momentum and its soft swell follows the cursor along the item.
//
// The goo is aria-hidden, behind the sidebar's real content, colored by `--goop-color` on the
// edge element (`[data-goop="sidebar-edge"]`). Reduced motion: no slosh (the edge just moves)
// and the highlight snaps. No DOM access until an attach runs (SSR-safe).

import type { GoopPreset } from './constants'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { attachMenuHighlight, findMenuHighlight, type MenuHighlightHandle, type MenuHighlightOptions } from './menu'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'

/** Every individually toggleable sidebar effect (GoopSidebar props). Core runs `slosh` and
 *  `highlight`; `pill` (the active item's soft fill), `submenus` (Collapsible flood + jelly),
 *  `tooltips` (GoopTooltip goo in icon mode) and `bloom` (the mobile sheet's bloom) are the
 *  adapters' wiring of other engines. */
export const SIDEBAR_EFFECTS = ['highlight', 'pill', 'slosh', 'submenus', 'tooltips', 'bloom'] as const
export type SidebarEffect = (typeof SIDEBAR_EFFECTS)[number]

/** Which side of the screen the sidebar is on (shadcn's `side`). Its inner edge faces away. */
export type SidebarSide = 'left' | 'right'

/** Per-preset feel of the edge slosh. Lengths in px, times in s. */
export interface SidebarEdgeFeel {
  /** Sim column spacing along the edge. */
  spacing: number
  /** Render circle radius (keep 2 * radius above the largest bulge so mounds stay solid). */
  radius: number
  /** Largest outward bulge. */
  bulge: number
  /** Largest inward offset (drawn as nothing; only shapes the rebound). */
  dip: number
  /** Column spring period. */
  response: number
  /** Damping ratio at slosh 1 (0 = critical). */
  damping: number
  /** Neighbour tension, 0..1 (higher: the edge moves more as one sheet). */
  coupling: number
  /** Share of the edge's velocity change (px/s) handed to the goo as a kick. */
  kick: number
  /** Trailing offset per px/s of edge velocity (drag while it travels). */
  lag: number
  /** Goo blur. */
  softness: number
}

export const SIDEBAR_EDGE_FEEL: Readonly<Record<GoopPreset, Readonly<SidebarEdgeFeel>>> = Object.freeze({
  subtle: Object.freeze({ spacing: 34, radius: 12, bulge: 7, dip: 6, response: 0.36, damping: 0.55, coupling: 0.4, kick: 0.09, lag: 0.0035, softness: 4 }),
  playful: Object.freeze({ spacing: 30, radius: 14, bulge: 13, dip: 10, response: 0.42, damping: 0.34, coupling: 0.36, kick: 0.17, lag: 0.0065, softness: 5 }),
  wild: Object.freeze({ spacing: 28, radius: 16, bulge: 21, dip: 14, response: 0.5, damping: 0.22, coupling: 0.32, kick: 0.26, lag: 0.01, softness: 6 }),
})

/** Goo filter for the edge. */
export function sidebarEdgeGooParams(feel: SidebarEdgeFeel = SIDEBAR_EDGE_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.45 }
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// ---- edge sim (pure) ------------------------------------------------------------------------

/** Sprung columns along the inner edge. `d` > 0 is outward (away from the sidebar), px. */
export interface SidebarEdge {
  d: number[]
  v: number[]
  /** Per-column stiffness factor (varied so the edge ripples instead of moving as a slab). */
  k: number[]
  /** Per-column share of the kick, 0..1: the mounds of the current motion. */
  shape: number[]
}

/** Columns for an edge `length` px long. */
export function sidebarEdgeCount(length: number, feel: Readonly<SidebarEdgeFeel> = SIDEBAR_EDGE_FEEL.playful): number {
  return clamp(Math.ceil(Math.max(0, length) / feel.spacing) + 1, 4, 64)
}

/** Seeded 0..1 random (deterministic for tests). */
export function sidebarRandom(seed: number): () => number {
  let s = (Math.floor(seed * 1e6) ^ 0x9e3779b9) >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

/**
 * The mounds one motion pushes out of the edge (pure): per column 0..1. One or two low, wide
 * raised-cosine humps, off-centre and of different heights (from `rand`), over a small base so
 * the whole edge moves a little; the ends taper so the corners stay put. Never a single sharp
 * centred knob.
 */
export function sidebarSloshShape(n: number, rand: () => number = Math.random): number[] {
  const humps = rand() < 0.55 ? 2 : 1
  const list: { c: number; w: number; a: number }[] = []
  for (let h = 0; h < humps; h++) {
    // Two humps sit in different halves so they read as two lumps, not one.
    const lo = humps === 2 ? (h === 0 ? 0.18 : 0.52) : 0.25
    const hi = humps === 2 ? (h === 0 ? 0.48 : 0.82) : 0.75
    list.push({ c: lo + (hi - lo) * rand(), w: (humps === 2 ? 0.2 : 0.3) + 0.14 * rand(), a: 0.65 + 0.35 * rand() })
  }
  const out: number[] = []
  let max = 0
  for (let i = 0; i < n; i++) {
    const f = n <= 1 ? 0.5 : i / (n - 1)
    let v = 0.14
    for (const m of list) {
      const x = (f - m.c) / m.w
      if (Math.abs(x) < 1) v += m.a * 0.5 * (1 + Math.cos(Math.PI * x))
    }
    v *= smooth(0, 0.1, f) * smooth(1, 0.9, f)
    out.push(v)
    if (v > max) max = v
  }
  return out.map((v) => (max > 0 ? v / max : 0))
}

export function createSidebarEdge(n: number, rand: () => number = Math.random): SidebarEdge {
  return {
    d: Array.from({ length: n }, () => 0),
    v: Array.from({ length: n }, () => 0),
    k: Array.from({ length: n }, () => 0.85 + 0.3 * rand()),
    shape: sidebarSloshShape(n, rand),
  }
}

/** Re-roll the mounds (each new motion bulges differently). Keeps the goo's current motion. */
export function rerollSidebarEdge(edge: SidebarEdge, rand: () => number = Math.random): void {
  edge.shape = sidebarSloshShape(edge.d.length, rand)
}

/** Hand the edge a change of its velocity `dv` (px/s, + = outward): the goo keeps going the
 *  old way, so it's kicked the opposite way, shaped by the current mounds. */
export function kickSidebarEdge(edge: SidebarEdge, dv: number, feel: Readonly<SidebarEdgeFeel>, slosh = 1): void {
  if (!Number.isFinite(dv) || slosh <= 0) return
  const u = -dv * feel.kick * clamp(slosh, 0, 2)
  for (let i = 0; i < edge.d.length; i++) edge.v[i] = edge.v[i]! + u * (edge.shape[i] ?? 0)
}

const SUB_DT = 1 / 240

/**
 * Advance the edge by `dt` s (mutates). `velocity` is the edge's own speed (px/s, + = outward):
 * the goo trails it by `lag`. `slosh` 0..2 scales the drag and bounciness (0 = critically
 * damped, nothing trails).
 */
export function stepSidebarEdge(edge: SidebarEdge, dt: number, feel: Readonly<SidebarEdgeFeel>, velocity = 0, slosh = 1): void {
  if (!(dt > 0)) return
  const n = edge.d.length
  const s = clamp(slosh, 0, 2)
  const w = (2 * Math.PI) / feel.response
  const w2 = w * w
  const zeta = s <= 1 ? 1 + (feel.damping - 1) * s : feel.damping * (1 - 0.4 * (s - 1))
  const coup = feel.coupling * 0.6
  const lo = -feel.dip
  const hi = feel.bulge * (1 + 0.25 * Math.max(0, s - 1))
  const trail = Number.isFinite(velocity) ? clamp(-velocity * feel.lag * s, lo, hi) : 0
  let left = dt
  while (left > 1e-6) {
    const h = Math.min(SUB_DT, left)
    left -= h
    for (let i = 0; i < n; i++) {
      const kf = edge.k[i] ?? 1
      const d = edge.d[i]!
      const prev = edge.d[i - 1] ?? d
      const next = edge.d[i + 1] ?? d
      const target = trail * (edge.shape[i] ?? 0)
      const a = w2 * kf * (target - d) - 2 * zeta * w * Math.sqrt(kf) * edge.v[i]! + coup * w2 * (prev + next - 2 * d)
      edge.v[i] = edge.v[i]! + a * h
    }
    for (let i = 0; i < n; i++) {
      let d = edge.d[i]! + edge.v[i]! * h
      if (d < lo) {
        d = lo
        if (edge.v[i]! < 0) edge.v[i] = edge.v[i]! * -0.2
      } else if (d > hi) {
        d = hi
        if (edge.v[i]! > 0) edge.v[i] = edge.v[i]! * -0.2
      }
      edge.d[i] = d
    }
  }
}

export function sidebarEdgeSettled(edge: SidebarEdge, eps = 0.12): boolean {
  for (let i = 0; i < edge.d.length; i++) if (Math.abs(edge.d[i]!) > eps || Math.abs(edge.v[i]!) > eps * 4) return false
  return true
}

/** Largest outward offset right now (px). */
export function sidebarEdgeBulge(edge: SidebarEdge): number {
  let m = 0
  for (const d of edge.d) if (d > m) m = d
  return m
}

/** Interpolated offset at fraction f (0..1) along the edge. */
export function sidebarEdgeAt(edge: SidebarEdge, f: number): number {
  const n = edge.d.length
  if (n === 0) return 0
  if (n === 1) return edge.d[0]!
  const x = clamp(f, 0, 1) * (n - 1)
  const i = Math.min(n - 2, Math.floor(x))
  const t = x - i
  const s = t * t * (3 - 2 * t)
  return edge.d[i]! + (edge.d[i + 1]! - edge.d[i]!) * s
}

/** Render circles along an edge `length` long with radius r. */
export function sidebarCircleCount(length: number, r: number): number {
  return clamp(Math.ceil(Math.max(0, length) / (r * 0.6)) + 1, 2, 160)
}

export interface SidebarCircle {
  x: number
  y: number
  r: number
}

/**
 * The goo circles in the edge element's space (x = 0 on the inner edge, y down the edge): each
 * reaches `d` past the edge where the goo bulges out (pure). Where it sits at or inside the
 * edge nothing is drawn (r = 0), so the sidebar's own edge shows at rest.
 */
export function sidebarEdgeCircles(edge: SidebarEdge, side: SidebarSide, length: number, r: number, count?: number): SidebarCircle[] {
  const m = count ?? sidebarCircleCount(length, r)
  const out: SidebarCircle[] = []
  const dir = side === 'left' ? 1 : -1
  for (let i = 0; i < m; i++) {
    const f = m <= 1 ? 0.5 : i / (m - 1)
    const d = sidebarEdgeAt(edge, f)
    if (d <= 0.35) {
      out.push({ x: 0, y: 0, r: 0 })
      continue
    }
    out.push({ x: dir * (d - r), y: f * length, r })
  }
  return out
}

// ---- DOM: edge ------------------------------------------------------------------------------

/** `data-goop` value of the edge element core inserts into the sidebar panel. */
export const SIDEBAR_EDGE_PART = 'sidebar-edge'

export interface SidebarEdgeOptions {
  /** The edge slosh: `true` (default), `false` or a 0..2 strength. */
  slosh?: boolean | number
  /** Screen side of the sidebar. Default: the closest `[data-side]`, then 'left'. */
  side?: SidebarSide | (() => SidebarSide | null | undefined)
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the panel, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
  /** Per-preset feel table. Default SIDEBAR_EDGE_FEEL. */
  feel?: Readonly<Record<GoopPreset, Readonly<SidebarEdgeFeel>>>
  /** Seed for the mounds (tests). Default random. */
  seed?: number
}

export interface SidebarEdgeHandle {
  /** The sidebar is about to move (collapse / expand): follow its edge until it settles. */
  track(): void
  update(opts?: SidebarEdgeOptions): void
  /** Largest outward bulge right now (px). */
  readonly bulge: number
  /** The edge is being followed or the goo is still sloshing. */
  readonly active: boolean
  readonly reducedMotion: boolean
  /** The aria-hidden edge element. */
  readonly element: HTMLElement
  destroy(): void
}

const strength = (v: boolean | number | undefined): number => (v === false ? 0 : v === true || v === undefined ? 1 : clamp(Number(v) || 0, 0, 2))
const isSide = (s: unknown): s is SidebarSide => s === 'left' || s === 'right'

/** How long the edge may sit still after `track()` before core stops following it (s). */
const TRACK_GRACE = 0.35

/**
 * Attach the edge slosh to `panel` (the sidebar's inner panel, whose inner edge moves when it
 * collapses). Inserts an aria-hidden `[data-goop="sidebar-edge"]` element on that edge and
 * makes the panel `position: relative` (if static) and isolated. Call `track()` when the
 * sidebar starts to move; a width change of the panel also starts it.
 */
export function attachSidebarEdge(panel: HTMLElement, options: SidebarEdgeOptions = {}): SidebarEdgeHandle {
  const doc = panel.ownerDocument
  const win = doc.defaultView
  let opts: SidebarEdgeOptions = { ...options }
  let rand = sidebarRandom(opts.seed ?? Math.random())
  const feelOf = (): SidebarEdgeFeel => (opts.feel ?? SIDEBAR_EDGE_FEEL)[readPreset(panel, opts.preset)]
  let feel = feelOf()
  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  let destroyed = false

  const side = (): SidebarSide => {
    const s = typeof opts.side === 'function' ? opts.side() : opts.side
    if (isSide(s)) return s
    const attr = panel.closest('[data-side]')?.getAttribute('data-side')
    return isSide(attr) ? attr : 'left'
  }

  const el = doc.createElement('span')
  el.setAttribute('data-goop', SIDEBAR_EDGE_PART)
  el.setAttribute('aria-hidden', 'true')
  const place = (): void => {
    const left = side() === 'left'
    el.style.cssText = `position:absolute;top:0;${left ? 'left:100%' : 'right:100%'};width:0;height:100%;pointer-events:none;z-index:-1;`
  }
  place()
  panel.append(el)
  const prevPosition = panel.style.position
  const prevIsolation = panel.style.isolation
  if (win?.getComputedStyle(panel).position === 'static') panel.style.position = 'relative'
  panel.style.isolation = 'isolate'

  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let length = 0
  let edge = createSidebarEdge(4, rand)
  let pad = -1

  const measureLength = (): number => el.offsetHeight || panel.clientHeight || 0
  const ensureEdge = (): void => {
    const L = measureLength()
    if (Math.abs(L - length) < 1 && blobs.length) return
    length = L
    const n = sidebarEdgeCount(L, feel)
    if (n !== edge.d.length) edge = createSidebarEdge(n, rand)
    const m = sidebarCircleCount(L, feel.radius)
    while (blobs.length < m && renderer) blobs.push(renderer.createBlob())
    while (blobs.length > m) blobs.pop()!.remove()
  }

  const draw = (): void => {
    if (!renderer) return
    const circles = sidebarEdgeCircles(edge, side(), length, feel.radius, blobs.length)
    for (let i = 0; i < blobs.length; i++) {
      const c = circles[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r)
      else blobs[i]!.set(0, 0, 0)
    }
    renderer.flush()
  }

  const build = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    renderer?.destroy()
    renderer = resolveRenderer(opts.renderer)(el, sidebarEdgeGooParams(feel))
    renderer.setBodyScale(0, 0)
    pad = -1
    length = 0
    const px = Math.ceil(feel.bulge * 1.5 + feel.radius * 2 + feel.softness * 3)
    if (px !== pad) {
      pad = px
      renderer.setPadding({ side: px, bottom: px })
    }
    ensureEdge()
    draw()
  }

  /** Inner-edge position along the outward axis (px; + = outward). */
  const edgePos = (): number => {
    const r = el.getBoundingClientRect()
    return side() === 'left' ? r.left : -r.right
  }
  let last: number | null = null
  let vel = 0
  let still = 0

  const tick: Ticker = (rawDt) => {
    if (destroyed || !renderer) return false
    const dt = rawDt * Math.max(0.05, opts.speed ?? 1)
    const slosh = strength(opts.slosh)
    ensureEdge()
    const pos = edgePos()
    const v = last === null || !(rawDt > 0) ? 0 : (pos - last) / rawDt
    last = pos
    if (reduced || slosh <= 0) {
      for (let i = 0; i < edge.d.length; i++) edge.d[i] = edge.v[i] = 0
      vel = 0
      draw()
      return false
    }
    const dv = v - vel
    // A new motion from rest bulges differently each time.
    if (Math.abs(vel) < 1 && Math.abs(v) >= 1) rerollSidebarEdge(edge, rand)
    if (Math.abs(dv) > 1) kickSidebarEdge(edge, dv, feel, slosh)
    vel = v
    stepSidebarEdge(edge, dt, feel, v, slosh)
    draw()
    still = Math.abs(v) < 1 ? still + rawDt : 0
    return !(still >= TRACK_GRACE && sidebarEdgeSettled(edge))
  }

  const track = (): void => {
    if (destroyed || reduced || strength(opts.slosh) <= 0) return
    if (still >= TRACK_GRACE || last === null) {
      last = edgePos()
      vel = 0
    }
    still = 0
    wakeTicker(tick)
  }

  build()

  let lastWidth = panel.offsetWidth
  const ro = win?.ResizeObserver
    ? new win.ResizeObserver(() => {
        const w = panel.offsetWidth
        if (Math.abs(w - lastWidth) >= 1) track()
        else if (Math.abs(measureLength() - length) >= 1) {
          ensureEdge()
          draw()
        }
        lastWidth = w
      })
    : null
  ro?.observe(panel)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) {
      removeTicker(tick)
      for (let i = 0; i < edge.d.length; i++) edge.d[i] = edge.v[i] = 0
      draw()
    }
  })

  return {
    track,
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      if ('seed' in next && next.seed !== undefined) rand = sidebarRandom(next.seed)
      const nextFeel = feelOf()
      const rebuild = rendererChanged || nextFeel !== feel
      feel = nextFeel
      reduced = readReduced()
      place()
      if (rebuild) build()
      if (reduced || strength(opts.slosh) <= 0) {
        removeTicker(tick)
        for (let i = 0; i < edge.d.length; i++) edge.d[i] = edge.v[i] = 0
        draw()
      }
    },
    get bulge() {
      return sidebarEdgeBulge(edge)
    },
    get active() {
      return !(still >= TRACK_GRACE && sidebarEdgeSettled(edge)) && last !== null
    },
    get reducedMotion() {
      return reduced
    },
    get element() {
      return el
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      ro?.disconnect()
      unwatch()
      for (const b of blobs) b.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      el.remove()
      panel.style.position = prevPosition
      panel.style.isolation = prevIsolation
    },
  }
}

// ---- DOM: highlight -------------------------------------------------------------------------

/** The sidebar's menu buttons the highlight blob rides. */
export const SIDEBAR_MENU_BUTTONS = '[data-sidebar="menu-button"],[data-sidebar="menu-sub-button"]'

/** The highlighted sidebar button of `container`: the one core marked `data-highlighted`
 *  (hover / keyboard focus), else an open dropdown trigger (`findMenuHighlight`). */
export function findSidebarHighlight(container: Element): Element | null {
  return findMenuHighlight(container)
}

export interface SidebarHighlightOptions extends Omit<MenuHighlightOptions, 'find'> {}

/**
 * Attach the goo highlight to a sidebar panel (`container`, usually the inner
 * `[data-sidebar="sidebar"]` element). Marks the hovered or keyboard-focused menu button
 * `data-highlighted` and lets core's menu highlight blob follow it. Disabled buttons are
 * skipped. Returns the menu highlight handle.
 */
export function attachSidebarHighlight(container: HTMLElement, options: SidebarHighlightOptions = {}): MenuHighlightHandle {
  const doc = container.ownerDocument
  let lit: Element | null = null
  const usable = (b: Element | null): b is HTMLElement =>
    !!b &&
    container.contains(b) &&
    !b.hasAttribute('disabled') &&
    b.getAttribute('aria-disabled') !== 'true' &&
    b.getAttribute('data-disabled') === null
  const light = (b: Element | null): void => {
    if (b === lit) return
    lit?.removeAttribute('data-highlighted')
    lit = b
    lit?.setAttribute('data-highlighted', '')
  }
  const buttonOf = (t: EventTarget | null): Element | null => {
    const b = t instanceof doc.defaultView!.Element ? t.closest(SIDEBAR_MENU_BUTTONS) : null
    return usable(b) ? b : null
  }
  const onOver = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return
    light(buttonOf(e.target))
  }
  const onLeave = (): void => {
    if (lit && lit === doc.activeElement && lit.matches(':focus-visible')) return
    light(null)
  }
  const onFocus = (e: FocusEvent): void => {
    const b = buttonOf(e.target)
    if (b && b.matches(':focus-visible')) light(b)
  }
  const onBlur = (e: FocusEvent): void => {
    if (buttonOf(e.target) === lit && !lit?.matches(':hover')) light(null)
  }
  container.addEventListener('pointerover', onOver, { passive: true })
  container.addEventListener('pointerleave', onLeave, { passive: true })
  container.addEventListener('focusin', onFocus)
  container.addEventListener('focusout', onBlur)
  const handle = attachMenuHighlight(container, { ...options, find: findSidebarHighlight })
  return {
    pop: () => handle.pop(),
    refresh: () => handle.refresh(),
    update: (next) => handle.update(next),
    get target() {
      return handle.target
    },
    get reducedMotion() {
      return handle.reducedMotion
    },
    get element() {
      return handle.element
    },
    destroy() {
      container.removeEventListener('pointerover', onOver)
      container.removeEventListener('pointerleave', onLeave)
      container.removeEventListener('focusin', onFocus)
      container.removeEventListener('focusout', onBlur)
      light(null)
      handle.destroy()
    },
  }
}

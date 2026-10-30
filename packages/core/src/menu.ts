// Menu highlight: the item highlight of a menu (dropdown, context menu, select...) as a goo
// blob that slides between items with momentum, stretches and necks as it travels, and gives a
// small jelly squish when an item is selected.
//
// The blob is a head (the highlight bar, a damped spring on the highlighted item's center and
// size) and a tail (a softer spring that chases the head). While travelling, the body
// elongates toward the tail and a few fat lumps join them: globby, never a thin string (the
// tail is held on a short rope so the lumps always overlap). Everything that shapes the goo is
// pure: `menuHighlightStep` (physics) and `menuHighlightPose` (geometry).
//
// `attachMenuHighlight(container)` follows the item carrying `data-highlighted` (reka-ui and
// Radix set it for pointer hover AND keyboard focus) inside `container`, which is the menu's
// item list. Nothing here touches `document`/`window` until it runs.
//
// Follow the pointer: the swell of the goo (the neck and tail while travelling, and a soft
// bulge while the pointer slides along an item) sits under the cursor's position along the
// item, on a spring of its own so it trails the cursor a little. Keyboard navigation (no
// pointer since the last key) keeps it centred.

import type { GoopPreset } from './constants'
import {
  emergeJelly,
  emergeOverflow,
  type EmergeBody,
  type EmergeCircle,
  type EmergeRect,
} from './emerge'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { markMovingGooHost } from './page-edge'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { springConfig, stepSpring, type SpringConfig, type SpringState } from './spring'
import { readPreset } from './tuning'

/** Per-preset feel of the menu highlight. Times in seconds. */
export interface MenuFeel {
  /** Head spring (the bar): response (s) and damping ratio. Under 1 overshoots (momentum). */
  head: { response: number; dampingRatio: number }
  /** Tail spring: chases the head, softer, so the blob stretches as it travels. */
  tail: { response: number; dampingRatio: number }
  /** Longest the tail may lag behind the head, in item heights (the rope). */
  lag: number
  /** Most the body elongates toward the tail, in item heights. */
  stretch: number
  /** Select pop: squish amount (fraction of the size) and duration. */
  squish: number
  pop: number
  /** Grow-in when the highlight first appears, shrink-out when it leaves. */
  appear: number
  hide: number
  /** Jelly decay of the grow-in (lower = wobblier). */
  decay: number
  /** Goo blur (px). */
  softness: number
  /** Pointer-follow bulge: how far it swells (fraction of the item's half height) at full
   *  pointer speed. Default 0 (no bulge; tabs). */
  swell?: number
}

export const MENU_FEEL: Readonly<Record<GoopPreset, Readonly<MenuFeel>>> = Object.freeze({
  subtle: Object.freeze({
    head: { response: 0.2, dampingRatio: 0.9 },
    tail: { response: 0.26, dampingRatio: 0.95 },
    lag: 0.8,
    stretch: 0.3,
    squish: 0.07,
    pop: 0.18,
    appear: 0.18,
    hide: 0.12,
    decay: 7,
    softness: 3,
    swell: 0.07,
  }),
  playful: Object.freeze({
    head: { response: 0.24, dampingRatio: 0.62 },
    tail: { response: 0.34, dampingRatio: 0.72 },
    lag: 1.3,
    stretch: 0.55,
    squish: 0.13,
    pop: 0.24,
    appear: 0.26,
    hide: 0.14,
    decay: 4.5,
    softness: 3.5,
    swell: 0.13,
  }),
  wild: Object.freeze({
    head: { response: 0.3, dampingRatio: 0.45 },
    tail: { response: 0.44, dampingRatio: 0.55 },
    lag: 1.9,
    stretch: 0.85,
    squish: 0.2,
    pop: 0.3,
    appear: 0.32,
    hide: 0.16,
    decay: 3,
    softness: 4,
    swell: 0.19,
  }),
})

/** Menu effects, each a prop in the adapters. All default true. */
export const MENU_EFFECTS = ['highlight', 'pop', 'submenus'] as const
export type MenuEffect = (typeof MENU_EFFECTS)[number]

/** Highlight toggles. `wobble`: head overshoot + jelly grow-in. `momentum`: tail, stretch and
 *  neck while travelling. `pop`: the select squish. `followPointer`: the swell sits under the
 *  pointer instead of the item's center. All default true. */
export interface MenuHighlightEffects {
  wobble?: boolean
  momentum?: boolean
  pop?: boolean
  followPointer?: boolean
}

/** Neck lumps between the body and the tail. */
export const MENU_NECK_LUMPS = 3
/** Circles a pose returns: tail + neck lumps + the pointer swell. */
export const MENU_HIGHLIGHT_CIRCLES = 1 + MENU_NECK_LUMPS + 1
/** Pointer speed (px/s along the item) at which the swell is full. */
export const MENU_SWELL_SPEED = 700
/** Smallest neck lump radius, as a fraction of the item's half height: never a string. */
export const MENU_NECK_MIN = 0.6

/** Mutable highlight physics state. Positions are centers, in the container's coordinates. */
export interface MenuHighlightState {
  x: SpringState
  y: SpringState
  w: SpringState
  h: SpringState
  tx: SpringState
  ty: SpringState
  /** Bulge x: where the swell sits along the item (springs toward the pointer). */
  bx: SpringState
  /** Where `bx` is heading (the pointer, clamped into the item; else the item's center). */
  bt: number
  /** 0..1 progress of the grow-in. */
  appear: number
  /** 1 = shown, 0 = hidden (shrinks out). */
  fade: number
  /** 0..1 progress of the select pop; 1 = idle. */
  pop: number
  /** A target is highlighted. */
  shown: boolean
}

export interface MenuHighlightPose {
  body: EmergeBody
  /** Tail, neck lumps, then the pointer swell (MENU_HIGHLIGHT_CIRCLES), zero-radius when
   *  unused. */
  circles: EmergeCircle[]
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
const spring = (x = 0): SpringState => ({ x, v: 0 })
const fxOf = (fx: MenuHighlightEffects = {}): Required<MenuHighlightEffects> => ({
  wobble: fx.wobble !== false,
  momentum: fx.momentum !== false,
  pop: fx.pop !== false,
  followPointer: fx.followPointer !== false,
})

/** A hidden highlight with nothing to show. */
export function menuHighlightInit(): MenuHighlightState {
  return {
    x: spring(),
    y: spring(),
    w: spring(),
    h: spring(),
    tx: spring(),
    ty: spring(),
    bx: spring(),
    bt: 0,
    appear: 1,
    fade: 0,
    pop: 1,
    shown: false,
  }
}

/** Where the swell aims on `r`: the pointer x (container coordinates) clamped so a round
 *  swell stays inside the item, or the center when there is no pointer. */
export function menuBulgeTarget(r: EmergeRect, pointer?: number | null): number {
  const cx = r.x + r.width / 2
  if (pointer == null || !Number.isFinite(pointer)) return cx
  const inset = Math.min(r.height / 2, r.width / 2)
  return clamp(pointer, r.x + inset, r.x + r.width - inset)
}

/** Snap the whole blob onto `r` at rest (no motion). `pointer`: where the swell rests. */
export function menuHighlightSnap(s: MenuHighlightState, r: EmergeRect, pointer?: number | null): void {
  const cx = r.x + r.width / 2
  const cy = r.y + r.height / 2
  s.x = spring(cx)
  s.y = spring(cy)
  s.w = spring(r.width)
  s.h = spring(r.height)
  s.tx = spring(cx)
  s.ty = spring(cy)
  s.bt = menuBulgeTarget(r, pointer)
  s.bx = spring(s.bt)
  s.appear = 1
  s.fade = 1
  s.shown = true
}

const configs = new WeakMap<object, SpringConfig>()
const cfgOf = (feel: { response: number; dampingRatio: number }): SpringConfig => {
  let c = configs.get(feel)
  if (!c) {
    c = springConfig(feel)
    configs.set(feel, c)
  }
  return c
}
const CRITICAL = (response: number) => ({ response, dampingRatio: 1 })
const critical = new Map<number, { response: number; dampingRatio: number }>()
const criticalOf = (response: number) => {
  let f = critical.get(response)
  if (!f) critical.set(response, (f = CRITICAL(response)))
  return f
}

/**
 * Advance the highlight by `dt` seconds toward `target` (container coordinates; null = no
 * item highlighted). `pointer`: the pointer's x in container coordinates (null: keyboard,
 * the swell centres). Mutates `s`. Pure apart from that: same inputs, same result.
 */
export function menuHighlightStep(
  s: MenuHighlightState,
  target: EmergeRect | null,
  dt: number,
  feel: MenuFeel = MENU_FEEL.playful,
  effects?: MenuHighlightEffects,
  pointer?: number | null,
): void {
  const fx = fxOf(effects)
  if (s.pop < 1) s.pop = Math.min(1, s.pop + dt / Math.max(1e-3, feel.pop))
  if (!target) {
    s.shown = false
    s.fade = Math.max(0, s.fade - dt / Math.max(1e-3, feel.hide))
    return
  }
  if (!s.shown && s.fade <= 0.01) {
    // Appearing from nothing: grow in place instead of flying in from the last spot.
    menuHighlightSnap(s, target, fx.followPointer ? pointer : null)
    s.appear = 0
  }
  s.shown = true
  s.fade = Math.min(1, s.fade + dt / Math.max(1e-3, feel.hide))
  s.appear = Math.min(1, s.appear + dt / Math.max(1e-3, feel.appear))
  const head = cfgOf(fx.wobble ? feel.head : criticalOf(feel.head.response))
  const tail = cfgOf(fx.wobble ? feel.tail : criticalOf(feel.tail.response))
  stepSpring(s.x, target.x + target.width / 2, head, dt)
  stepSpring(s.y, target.y + target.height / 2, head, dt)
  stepSpring(s.w, target.width, head, dt)
  stepSpring(s.h, target.height, head, dt)
  // The swell trails the pointer on the tail's (softer) spring: springy, not glued.
  s.bt = menuBulgeTarget(target, fx.followPointer ? pointer : null)
  stepSpring(s.bx, s.bt, tail, dt)
  if (!fx.momentum) {
    s.tx = { x: s.x.x, v: s.x.v }
    s.ty = { x: s.y.x, v: s.y.v }
    return
  }
  stepSpring(s.tx, s.x.x, tail, dt)
  stepSpring(s.ty, s.y.x, tail, dt)
  // The rope: the tail never falls more than `lag` item heights behind.
  const dx = s.tx.x - s.x.x
  const dy = s.ty.x - s.y.x
  const d = Math.hypot(dx, dy)
  const max = feel.lag * Math.max(1, target.height)
  if (d > max) {
    s.tx.x = s.x.x + (dx / d) * max
    s.ty.x = s.y.x + (dy / d) * max
    s.tx.v = s.x.v
    s.ty.v = s.y.v
  }
}

/** True once the highlight has come to rest on `target` (or fully hidden). */
export function menuHighlightSettled(s: MenuHighlightState, target: EmergeRect | null): boolean {
  if (s.pop < 1) return false
  if (!target) return s.fade <= 0
  const near = (sp: SpringState, to: number) => Math.abs(sp.x - to) < 0.05 && Math.abs(sp.v) < 0.5
  const cx = target.x + target.width / 2
  const cy = target.y + target.height / 2
  return (
    s.fade >= 1 &&
    s.appear >= 1 &&
    near(s.x, cx) &&
    near(s.y, cy) &&
    near(s.w, target.width) &&
    near(s.h, target.height) &&
    near(s.tx, cx) &&
    near(s.ty, cy) &&
    near(s.bx, s.bt)
  )
}

/** Select pop: body scale at progress `u` (0..1). A quick squash, then a decaying jelly
 *  rebound (one squash without `wobble`). Volume-ish: sx widens as sy squashes. */
export function menuPopSquish(u: number, amount: number, wobble = true): { sx: number; sy: number } {
  const t = clamp(u)
  if (t <= 0 || t >= 1 || amount <= 0) return { sx: 1, sy: 1 }
  const v = wobble ? -amount * Math.sin(Math.PI * 2.5 * t) * (1 - t) ** 1.5 : -amount * Math.sin(Math.PI * t)
  return { sx: 1 - v * 0.45, sy: 1 + v }
}

const zero = (): EmergeCircle => ({ x: 0, y: 0, r: 0 })
const hidden = (): MenuHighlightPose => ({
  body: { cx: 0, cy: 0, w: 0, h: 0 },
  circles: Array.from({ length: MENU_HIGHLIGHT_CIRCLES }, zero),
})

/** The goo for state `s`, in the container's coordinates. Pure. */
export function menuHighlightPose(
  s: MenuHighlightState,
  feel: MenuFeel = MENU_FEEL.playful,
  effects?: MenuHighlightEffects,
): MenuHighlightPose {
  const fx = fxOf(effects)
  const show = smooth(s.fade)
  const w0 = Math.max(0, s.w.x)
  const h0 = Math.max(0, s.h.x)
  if (show <= 0 || w0 < 0.5 || h0 < 0.5) return hidden()
  const grow = lerp(0.55, 1, emergeJelly(s.appear, feel.decay, fx.wobble)) * lerp(0.4, 1, show)
  const sq = fx.pop ? menuPopSquish(s.pop, feel.squish, fx.wobble) : { sx: 1, sy: 1 }
  let cx = s.x.x
  let cy = s.y.x
  let w = w0 * grow * sq.sx
  let h = h0 * grow * sq.sy
  const circles: EmergeCircle[] = Array.from({ length: MENU_HIGHLIGHT_CIRCLES }, zero)
  const half = (h0 / 2) * grow
  // Where the swell sits along the body (pointer-follow), kept inside it.
  const bulge = fx.followPointer ? clamp(s.bx.x, cx - w / 2 + half, cx + w / 2 - half) : s.x.x
  const swell = fx.followPointer ? (feel.swell ?? 0) * smooth(Math.abs(s.bx.v) / MENU_SWELL_SPEED) : 0
  if (swell > 0.005 && w > 2 * half) {
    circles[MENU_HIGHLIGHT_CIRCLES - 1] = { x: bulge, y: cy, r: half * (1 + swell) }
  }
  const dx = s.tx.x - cx
  const dy = s.ty.x - cy
  const dist = Math.hypot(dx, dy)
  if (!fx.momentum || dist < 0.5) return { body: { cx, cy, w, h }, circles }

  // Travel: elongate toward the tail along the dominant axis, thin a little across it.
  const ux = dx / dist
  const uy = dy / dist
  const vertical = Math.abs(uy) >= Math.abs(ux)
  const thick = vertical ? h : w
  const reach = feel.stretch * h0
  const e = Math.min(dist * 0.6, reach)
  const k = reach > 0 ? e / reach : 0
  if (vertical) {
    h += e
    cy += (uy * e) / 2
    w *= 1 - 0.12 * k
  } else {
    w += e
    cx += (ux * e) / 2
    h *= 1 - 0.12 * k
  }
  // Tail blob and fat neck lumps from the body's trailing edge to it.
  const lagged = clamp(dist / Math.max(1e-6, feel.lag * h0))
  const tailR = half * lerp(0.95, 0.72, lagged)
  // Down a column the neck and tail ride the swell's x (under the pointer), not the center.
  const off = vertical ? bulge - s.x.x : 0
  circles[0] = { x: s.tx.x + off, y: s.ty.x, r: tailR }
  const edge = vertical ? h / 2 : w / 2
  const ex = vertical ? bulge : cx + ux * edge
  const ey = vertical ? cy + uy * edge : s.y.x
  const neckR = half * Math.max(MENU_NECK_MIN, 0.88 - 0.24 * lagged)
  for (let i = 0; i < MENU_NECK_LUMPS; i++) {
    const f = (i + 1) / (MENU_NECK_LUMPS + 1)
    const wob = i === 1 ? 1.08 : 1
    circles[1 + i] = { x: lerp(ex, s.tx.x + off, f), y: lerp(ey, s.ty.x, f), r: Math.min(neckR * wob, thick) }
  }
  return { body: { cx, cy, w, h }, circles }
}

/** Goo filter for the highlight. */
export function menuGooParams(feel: MenuFeel = MENU_FEEL.playful): GooFilterParams {
  return { blur: feel.softness, contrast: 20, threshold: 0.4 }
}

// ---- DOM ----------------------------------------------------------------------------------

/** `data-goop` value of the highlight element core inserts into the container. */
export const MENU_HIGHLIGHT_PART = 'highlight'
/** Marks a container that owns a highlight (nested menus pick only their own items). */
export const MENU_CONTAINER_ATTR = 'data-goop-menu'

/** The highlighted item of `container`: reka/Radix `data-highlighted`, else an open submenu
 *  trigger (it stays lit while focus is in its submenu). Items of nested menus are skipped. */
export function findMenuHighlight(container: Element): Element | null {
  const own = (el: Element) => el.closest(`[${MENU_CONTAINER_ATTR}]`) === container
  for (const el of container.querySelectorAll('[data-highlighted]')) if (own(el)) return el
  for (const el of container.querySelectorAll('[aria-haspopup="menu"][data-state="open"]')) if (own(el)) return el
  return null
}

export interface MenuHighlightOptions extends MenuHighlightEffects {
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the container, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion, live. */
  reducedMotion?: boolean | 'auto'
  /** The highlighted item. Default `findMenuHighlight`. */
  find?: (container: HTMLElement) => Element | null
  /** Per-preset feel table. Default MENU_FEEL (GoopTabs passes TABS_FEEL). */
  feel?: Readonly<Record<GoopPreset, Readonly<MenuFeel>>>
}

export interface MenuHighlightHandle {
  /** Play the select pop. Returns its duration in ms (0 when off or under reduced motion). */
  pop(): number
  /** Re-read the highlighted item and redraw. */
  refresh(): void
  update(opts?: MenuHighlightOptions): void
  /** The element being highlighted, if any. */
  readonly target: Element | null
  readonly reducedMotion: boolean
  /** The aria-hidden highlight element. */
  readonly element: HTMLElement
  destroy(): void
}

/**
 * Attach a goo highlight to a menu's item list (`container`). Inserts an aria-hidden
 * `[data-goop="highlight"]` element behind the items (colored by `--goop-color` on it; its
 * `data-variant` mirrors the item's). Makes the container `position: relative` and isolated.
 * Reduced motion: the blob snaps to the item, no travel, no pop.
 */
export function attachMenuHighlight(container: HTMLElement, options: MenuHighlightOptions = {}): MenuHighlightHandle {
  const doc = container.ownerDocument
  const win = doc.defaultView
  let opts: MenuHighlightOptions = { ...options }
  const feelOf = (): MenuFeel => (opts.feel ?? MENU_FEEL)[readPreset(container, opts.preset)]
  let feel = feelOf()
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let destroyed = false
  let pad = -1
  let size = { w: -1, h: -1 }
  /** Container client size at the last measure (the element is kept inside it). */
  let box = { w: Infinity, h: Infinity }
  let target: Element | null = null
  let rect: EmergeRect | null = null
  /** Last pointer clientX over the container; null after a key press (keyboard: centred). */
  let pointerX: number | null = null
  let aim: number | null = null
  const s = menuHighlightInit()

  const readReduced = (): boolean =>
    opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const el = doc.createElement('span')
  el.setAttribute('data-goop', MENU_HIGHLIGHT_PART)
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:-1;pointer-events:none;'
  // It rides the active item every frame: its goo layer re-cuts at the page edge per frame.
  markMovingGooHost(el)
  container.prepend(el)
  container.setAttribute(MENU_CONTAINER_ATTR, '')
  const prevPosition = container.style.position
  const prevIsolation = container.style.isolation
  if (win?.getComputedStyle(container).position === 'static') container.style.position = 'relative'
  container.style.isolation = 'isolate'

  const speed = (): number => Math.max(0.05, opts.speed ?? 1)
  const find = (): Element | null => (opts.find ?? findMenuHighlight)(container)

  const measure = (item: Element): EmergeRect => {
    const c = container.getBoundingClientRect()
    const r = item.getBoundingClientRect()
    aim = pointerX === null ? null : pointerX - c.left - container.clientLeft + container.scrollLeft
    box = { w: container.clientWidth || Infinity, h: container.clientHeight || Infinity }
    return {
      x: r.left - c.left - container.clientLeft + container.scrollLeft,
      y: r.top - c.top - container.clientTop + container.scrollTop,
      width: r.width,
      height: r.height,
    }
  }

  const draw = (): void => {
    if (!renderer) return
    const pose = menuHighlightPose(s, feel, opts)
    const { body } = pose
    // The element is item-sized so the body keeps the item's corner radius; it rides the
    // head, and the body transform does the stretch / squish / grow.
    const W = Math.max(1, Math.round(rect?.width ?? s.w.x))
    const H = Math.max(1, Math.round(rect?.height ?? s.h.x))
    if (W !== size.w || H !== size.h) {
      size = { w: W, h: H }
      el.style.width = `${W}px`
      el.style.height = `${H}px`
    }
    // Keep the element's own box inside the container (its spring overshoot would otherwise
    // poke past the container and could grow the page at its edge). The body transform and
    // circles are relative to it, so this doesn't move the goo.
    const keep = (v: number, size: number, room: number, item: number | undefined): number =>
      Math.min(Math.max(v, Math.min(0, item ?? 0)), Math.max(room - size, item ?? 0))
    const ox = keep(Math.round(s.x.x - W / 2), W, box.w, rect?.x)
    const oy = keep(Math.round(s.y.x - H / 2), H, box.h, rect?.y)
    el.style.transform = `translate(${ox}px, ${oy}px)`
    const off = body.w <= 0 || body.h <= 0
    const t = off
      ? { tx: 0, ty: 0, skew: 0, sx: 0, sy: 0 }
      : { tx: body.cx - ox - W / 2, ty: body.cy - oy - H / 2, skew: 0, sx: body.w / W, sy: body.h / H }
    if (renderer.setBodyTransform) renderer.setBodyTransform(t)
    else renderer.setBodyScale(t.sx, t.sy)
    const local = pose.circles.map((c) => ({ x: c.x - ox, y: c.y - oy, r: c.r }))
    for (let i = 0; i < blobs.length; i++) {
      const c = local[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r)
      else blobs[i]!.set(0, 0, 0)
    }
    renderer.flush()
    const blur = Math.ceil(menuGooParams(feel).blur * 3)
    const need = Math.ceil(
      emergeOverflow(
        { body: { ...body, cx: body.cx - ox, cy: body.cy - oy }, circles: local, content: 1 },
        W,
        H,
      ),
    )
    const px = need > 0 ? blur + Math.ceil(need / 8) * 8 : blur
    if (px !== pad) {
      pad = px
      renderer.setPadding({ side: px, bottom: px })
    }
  }

  const build = (): void => {
    for (const b of blobs) b.remove()
    renderer?.destroy()
    renderer = resolveRenderer(opts.renderer)(el, menuGooParams(feel))
    pad = -1
    blobs = Array.from({ length: MENU_HIGHLIGHT_CIRCLES }, () => renderer!.createBlob())
    draw()
  }

  const syncTarget = (): void => {
    const next = find()
    if (next !== target) {
      target = next
      if (target) {
        el.setAttribute('data-variant', target.getAttribute('data-variant') ?? 'default')
        const radius = win?.getComputedStyle(target).borderRadius
        el.style.borderRadius = radius || ''
      }
    }
    rect = target ? measure(target) : null
    if (!rect) aim = null
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    syncTarget()
    if (reduced) {
      if (rect) menuHighlightSnap(s, rect)
      else s.fade = 0
      s.pop = 1
      draw()
      return false
    }
    menuHighlightStep(s, rect, dt * speed(), feel, opts, aim)
    draw()
    return !menuHighlightSettled(s, rect)
  }

  const kick = (): void => {
    if (destroyed) return
    if (reduced) tick(0)
    else wakeTicker(tick)
  }

  build()
  syncTarget()
  if (rect) menuHighlightSnap(s, rect)
  draw()

  // Pointer follow: track the pointer over the list; any key hands the swell back to the
  // center (keyboard navigation).
  const onPointer = (e: PointerEvent): void => {
    if (opts.followPointer === false) return
    if (pointerX === e.clientX) return
    pointerX = e.clientX
    if (target) kick()
  }
  const onKey = (): void => {
    if (pointerX === null) return
    pointerX = null
    kick()
  }
  container.addEventListener('pointermove', onPointer, { passive: true })
  container.addEventListener('pointerdown', onPointer, { passive: true })
  doc.addEventListener('keydown', onKey, true)

  const mo = win?.MutationObserver
    ? new win.MutationObserver(kick)
    : null
  mo?.observe(container, { subtree: true, attributes: true, attributeFilter: ['data-highlighted', 'data-state'] })
  // Items move when the container resizes (tabs reflowing, fonts loading): follow them.
  const ro = win?.ResizeObserver ? new win.ResizeObserver(kick) : null
  ro?.observe(container)

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) removeTicker(tick)
    kick()
  })

  return {
    pop() {
      if (destroyed || reduced || opts.pop === false) return 0
      s.pop = 0
      wakeTicker(tick)
      return Math.round((feel.pop * 1000) / speed())
    },
    refresh() {
      kick()
    },
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      const nextFeel = feelOf()
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      reduced = readReduced()
      if (reduced) removeTicker(tick)
      if (rebuild) build()
      kick()
    },
    get target() {
      return target
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
      container.removeEventListener('pointermove', onPointer)
      container.removeEventListener('pointerdown', onPointer)
      doc.removeEventListener('keydown', onKey, true)
      mo?.disconnect()
      ro?.disconnect()
      unwatch()
      for (const b of blobs) b.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      el.remove()
      container.removeAttribute(MENU_CONTAINER_ATTR)
      container.style.position = prevPosition
      container.style.isolation = prevIsolation
    },
  }
}

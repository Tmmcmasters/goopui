// Toast goo: a goo layer behind a whole toaster stack (vue-sonner / sonner markup).
//
// The toasts stay real, unfiltered DOM. Their backgrounds, borders and shadows move onto ONE
// shared, aria-hidden goo layer (one SVG goo filter for the whole stack), which draws a
// rounded body per toast plus a pool of circles, re-measured from the live toast rects:
//
//   1. Drop in: a new toast arrives as a round blob at its toaster edge that inflates into
//      the toast with a jelly overshoot, an ooze trail that stretches back toward the edge and
//      snaps, then the far edge sloshes (emerge-momentum's slosh).
//   2. Merge: neighbouring bodies are joined by fat goo necks where they touch (the collapsed
//      stack's peeking edges get globby fillets). As the stack expands the necks stretch and
//      thin, then snap and recoil into both bodies; they re-form when the stack collapses.
//   3. Drip away: a leaving toast's body sags and pinches while a few drops neck off its
//      bottom edge, fall and fade. A swipe-out flings the drops in the swipe direction.
//
// Pose math is pure (`toastDropPose`, `toastNeck`, `toastLeavePose`); `attachToaster` is the
// DOM side. Nothing here touches `document`/`window` until `attachToaster` runs.
//
// Performance: one layer + one filter for every toast, sized to the stack's bounding box
// (the filter never covers the viewport), only transform / size / radius writes per frame,
// and the shared rAF loop runs only while something moves (woken by mutations, transitions
// and pointer events on the toaster; it sleeps once rects have been still for a few frames).

import type { GoopPreset } from './constants'
import { emergeJelly, type EmergeRect } from './emerge'
import { emergeMomentumStrength, emergeSloshOffset } from './emerge-momentum'
import { acquireGooFilter, type GooFilterLease, type GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import { readPreset } from './tuning'

/** Toaster edge a toast enters from (sonner's y position). */
export type ToastEdge = 'top' | 'bottom'
/** Swipe-out direction (sonner's `data-swipe-direction`). */
export type ToastSwipe = 'left' | 'right' | 'up' | 'down'

/** Per-preset feel. Times in seconds (at speed 1), lengths in px unless noted. */
export interface ToastFeel {
  /** Drop-in: inflate duration. */
  drop: number
  /** Jelly decay of the inflate (lower = wobblier, bigger overshoot). */
  decay: number
  /** Starting blob diameter as a fraction of the toast height. */
  blob: number
  /** Ooze trail length at its longest, in toast heights. */
  ooze: number
  /** Far-edge slosh size basis (px), fed to emerge-momentum's slosh. */
  slosh: number
  /** Merge neck radius. */
  neck: number
  /** A neck snaps once the gap between two toasts passes this; re-forms below `mergeGap`.
   *  Keep `snapGap` under sonner's `gap` (14 by default) so expanded stacks separate. */
  snapGap: number
  mergeGap: number
  /** Snapped neck stubs recoil into their bodies over this long. */
  recoil: number
  /** Drip away: body sag/pinch duration. */
  leave: number
  /** Drops shed on leaving (+-1 by seed). */
  drips: number
  /** Drop radius (px, varied +-30% by seed). */
  dripSize: number
  /** Swipe fling launch speed (px/s). */
  fling: number
  /** Goo blur (px). */
  softness: number
}

export const TOAST_FEEL: Readonly<Record<GoopPreset, Readonly<ToastFeel>>> = Object.freeze({
  subtle: Object.freeze({
    drop: 0.42, decay: 7, blob: 0.7, ooze: 0.45, slosh: 9, neck: 8, snapGap: 7, mergeGap: 3,
    recoil: 0.14, leave: 0.3, drips: 2, dripSize: 5.5, fling: 700, softness: 4,
  }),
  playful: Object.freeze({
    drop: 0.55, decay: 4.5, blob: 0.8, ooze: 0.8, slosh: 12, neck: 11, snapGap: 10, mergeGap: 4,
    recoil: 0.18, leave: 0.36, drips: 3, dripSize: 8, fling: 950, softness: 5,
  }),
  wild: Object.freeze({
    drop: 0.7, decay: 3, blob: 0.9, ooze: 1.2, slosh: 15, neck: 14, snapGap: 12.5, mergeGap: 5,
    recoil: 0.22, leave: 0.44, drips: 4, dripSize: 10, fling: 1300, softness: 6,
  }),
})

/** Effect toggles: `true` (1) / `false` (0) or a 0..2 strength. All default true. */
export interface ToasterEffects {
  /** New toasts drop in as a blob from the toaster edge, overshoot and slosh. */
  dropIn?: boolean | number
  /** Stacked toasts merge with fat goo necks; expanding stretches and snaps them. */
  merge?: boolean | number
  /** Leaving toasts drip off; swipe-out flings the goo in the swipe direction. */
  drips?: boolean | number
}
export const TOASTER_EFFECTS = ['dropIn', 'merge', 'drips'] as const satisfies readonly (keyof ToasterEffects)[]
export type ToasterEffect = (typeof TOASTER_EFFECTS)[number]

/** A toast body: top-left corner, size and corner radius (px, viewport space). */
export interface ToastBody {
  x: number
  y: number
  w: number
  h: number
  r: number
}

/** A goo circle, optionally stretched (sx/sy) and faded (o). */
export interface ToastCircle {
  x: number
  y: number
  r: number
  sx?: number
  sy?: number
  o?: number
}

export interface ToastPose {
  /** null: nothing to draw. */
  body: ToastBody | null
  circles: ToastCircle[]
}

export interface ToastPoseOptions {
  preset?: GoopPreset
  /** Effect strength 0..2 (see `emergeMomentumStrength`). Default 1. */
  strength?: number
  /** Toast corner radius (px). Default 8. */
  radius?: number
  /** Varies sizes and spots per toast. Default 0. */
  seed?: number
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const hump = (u: number): number => (u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u))
function rand(seed: number, a: number, b: number): number {
  const s = Math.sin(seed * 127.1 + a * 311.7 + b * 74.7) * 43758.5453
  return s - Math.floor(s)
}
const feelOf = (o: ToastPoseOptions): Readonly<ToastFeel> => TOAST_FEEL[o.preset ?? 'playful']
const restBody = (rect: EmergeRect, radius: number): ToastBody => ({
  x: rect.x,
  y: rect.y,
  w: rect.width,
  h: rect.height,
  r: Math.min(radius, rect.width / 2, rect.height / 2),
})

/** Goo filter for a toaster. */
export function toastGooParams(preset: GoopPreset = 'playful'): GooFilterParams {
  return { blur: TOAST_FEEL[preset].softness, contrast: 20, threshold: 0.4 }
}

// ---- 1. drop in -----------------------------------------------------------------------------

/** When (s) the far-edge slosh is kicked: about when the inflate first reaches full size. */
const landAt = (f: ToastFeel): number => f.drop * 0.5
/** emerge-momentum's slosh starts its clock at this offset. */
const SLOSH_START = 0.14
const SLOSH_LEN = 0.75
const OOZE_SNAP = 0.42
const OOZE_LUMPS = [
  { f: 0.3, k: 1 },
  { f: 0.62, k: 0.82 },
  { f: 0.95, k: 1.06 },
] as const

/** Seconds (speed-scaled) after a toast appears by which its drop-in has settled. */
export function toastDropEnd(preset: GoopPreset = 'playful'): number {
  const f = TOAST_FEEL[preset]
  return Math.max(f.drop, landAt(f) + SLOSH_LEN)
}

/**
 * The drop-in at `sec` seconds for a toast whose (live) rect is `rect`, entering from `edge`.
 * Pure. Starts as a small round blob on the toast's edge-side, inflates into the toast with
 * an overshoot, trails an ooze neck toward the edge that snaps, then the far edge sloshes.
 * Settles to exactly the toast's rect (no circles) by `toastDropEnd`.
 */
export function toastDropPose(sec: number, rect: EmergeRect, edge: ToastEdge, o: ToastPoseOptions = {}): ToastPose {
  const f = feelOf(o)
  const k = clamp(o.strength ?? 1, 0, 2)
  const radius = o.radius ?? 8
  const seed = o.seed ?? 0
  const W = rect.width
  const H = rect.height
  if (k <= 0 || sec >= toastDropEnd(o.preset) || W <= 0 || H <= 0) return { body: restBody(rect, radius), circles: [] }
  const s = Math.max(0, sec)
  const u = clamp(s / f.drop)
  // Strength above 1 exaggerates the jelly (lower decay), below 1 blends toward plain.
  const decay = f.decay / Math.max(0.5, k)
  const gi = emergeJelly(u, decay)
  const gc = emergeJelly(clamp((u - 0.18) / 0.82), decay * 1.15)
  const blend = Math.min(1, k)
  const D = Math.min(W, H * f.blob)
  const grow = 0.3 + 0.7 * smooth(u / 0.16)
  let w = lerp(W, lerp(D, W, gc) * (u < 0.16 ? grow : 1), blend)
  let h = lerp(H, lerp(D, H, gi) * (u < 0.16 ? grow : 1), blend)
  w = Math.max(0, w)
  h = Math.max(0, h)
  const cx = rect.x + W / 2 + (rand(seed, 1, 1) - 0.5) * W * 0.3 * (1 - clamp(gc)) * blend
  // Near edge (toaster side) is anchored; the far edge grows away from the toaster.
  const fromBottom = edge === 'bottom'
  const near = fromBottom ? rect.y + H : rect.y
  const sign = fromBottom ? -1 : 1
  // Far-edge slosh once landed: + bulges out, - pulls in a little.
  const d = emergeSloshOffset(s - landAt(f) + SLOSH_START, f.slosh, Math.min(2, k), o.preset)
  if (d < 0) h = Math.max(1, h + Math.max(-5, d * 0.45))
  const top = fromBottom ? near - h : near
  const r = lerp(Math.min(w, h) / 2, Math.min(radius, w / 2, h / 2), smooth(gc))
  const body: ToastBody = { x: cx - w / 2, y: top, w, h, r }
  const circles: ToastCircle[] = []
  const far = fromBottom ? top : top + h
  if (d > 0.5) {
    // A dome of three circles pushing out of the far edge.
    const R = Math.max(1, Math.min(W * 0.2, H / 2, 40))
    const parts = [
      { dc: 0, kr: 1, dd: 1 },
      { dc: -0.75, kr: 0.72, dd: 0.45 },
      { dc: 0.75, kr: 0.72, dd: 0.45 },
    ]
    for (const p of parts) {
      const rr = R * p.kr
      const dk = Math.min(d * p.dd, rr)
      circles.push({ x: cx + p.dc * R, y: far + sign * (dk - rr), r: rr })
    }
  }
  // Ooze trail: lumps stretching back from the near edge toward the toaster edge.
  const lumpR = D * 0.34 * blend
  if (lumpR > 0.5 && u < OOZE_SNAP + 0.2) {
    const trailX = rect.x + W / 2 + (rand(seed, 2, 1) - 0.5) * W * 0.2
    if (u < OOZE_SNAP) {
      const q = u / OOZE_SNAP
      const len = H * f.ooze * Math.sin((Math.PI / 2) * smooth(q * 1.4)) * (1 - 0.35 * smooth((q - 0.6) / 0.4))
      for (const l of OOZE_LUMPS) {
        const rr = lumpR * l.k * (1 - 0.3 * q)
        circles.push({ x: lerp(cx, trailX, l.f), y: near - sign * len * l.f, r: rr })
      }
    } else {
      // Snapped: the lumps recoil into the near edge and shrink away.
      const q = clamp((u - OOZE_SNAP) / 0.2)
      const len = H * f.ooze * (1 - 0.35) * (1 - smooth(q))
      for (const l of OOZE_LUMPS) {
        const rr = lumpR * l.k * 0.7 * (1 - smooth(q))
        circles.push({ x: lerp(cx, trailX, l.f * (1 - q)), y: near - sign * len * l.f, r: rr })
      }
    }
  }
  return { body, circles }
}

/**
 * A settled toast's body while sonner fades the toast itself in or out (`opacity` is the
 * toast's live computed opacity: sonner fades toasts past `visibleToasts`, and the one that
 * becomes visible when a toast above it is removed). The goo filter thresholds alpha, so the
 * body can't fade with it: it inflates from a thin bar at the toast's middle instead (full
 * width at opacity 1, half at 0), so it never pops in or out ahead of the real toast.
 * null below a sliver. Pure.
 */
export function toastFadeBody(rect: EmergeRect, opacity: number, radius = 8): ToastBody | null {
  const op = Number.isFinite(opacity) ? clamp(opacity) : 1
  if (op >= 0.999) return restBody(rect, radius)
  const e = smooth(op)
  const w = rect.width * lerp(0.5, 1, e)
  const h = rect.height * e
  if (w <= 0.5 || h <= 0.5) return null
  return {
    x: rect.x + (rect.width - w) / 2,
    y: rect.y + (rect.height - h) / 2,
    w,
    h,
    r: Math.min(radius, w / 2, h / 2),
  }
}

// ---- 2. stack merge -------------------------------------------------------------------------

/** Neck columns across the shared width: fraction and size. Edge columns fill the corners
 *  where a peeking toast meets its neighbour; the middle one bridges a gap. */
const NECK_COLUMNS = [
  { f: 0, k: 1 },
  { f: 0.5, k: 1.3 },
  { f: 1, k: 1 },
] as const

/** Gap (px) between two bodies stacked vertically (negative = overlap). */
export function toastNeckGap(a: EmergeRect, b: EmergeRect): number {
  const [U, L] = a.y + a.height / 2 <= b.y + b.height / 2 ? [a, b] : [b, a]
  return L.y - (U.y + U.height)
}

export interface ToastNeckOptions {
  preset?: GoopPreset
  /** Neck size 0..2. Default 1. */
  strength?: number
  /** 0..1: neck growing in after (re)forming. Default 1. */
  grow?: number
  /** Seconds since the neck snapped; undefined while attached. */
  snapAge?: number
}

/**
 * Fat goo neck between two neighbouring toast rects. Pure. While attached: one stretched
 * circle per column across the shared width, centered on the seam (the gap's middle, or the
 * wider toast's edge when they overlap), thinning and elongating as the gap grows. After the
 * snap (`snapAge` set): each column splits into two stubs that recoil into their bodies.
 * Empty when the toasts don't share any width, or once the recoil is over.
 */
export function toastNeck(a: EmergeRect, b: EmergeRect, o: ToastNeckOptions = {}): ToastCircle[] {
  const f = TOAST_FEEL[o.preset ?? 'playful']
  const k = clamp(o.strength ?? 1, 0, 2)
  const [U, L] = a.y + a.height / 2 <= b.y + b.height / 2 ? [a, b] : [b, a]
  const x0 = Math.max(U.x, L.x)
  const x1 = Math.min(U.x + U.width, L.x + L.width)
  const r0 = f.neck * (0.6 + 0.4 * k) * clamp(o.grow ?? 1)
  if (k <= 0 || r0 < 0.5 || x1 - x0 < 4) return []
  const gap = toastNeckGap(U, L)
  const ub = U.y + U.height
  const out: ToastCircle[] = []
  const inset = Math.min(r0 * 0.7, (x1 - x0) / 2)
  const colX = (c: (typeof NECK_COLUMNS)[number]): number => lerp(x0 + inset, x1 - inset, c.f)
  if (o.snapAge !== undefined) {
    const q = clamp(o.snapAge / Math.max(0.01, f.recoil))
    if (q >= 1) return []
    const rr = r0 * 0.7 * (1 - smooth(q))
    // A little wobble as the stubs pull back in.
    const back = rr * (0.6 * (1 - q) + 0.15 * Math.sin(q * 3 * Math.PI))
    for (const c of NECK_COLUMNS) {
      const x = colX(c)
      out.push({ x, y: ub + back, r: rr * c.k }, { x, y: L.y - back, r: rr * c.k })
    }
    return out
  }
  const seam = gap >= 0 ? ub + gap / 2 : U.width <= L.width ? L.y : ub
  const stretch = clamp(gap / Math.max(1, f.snapGap))
  const r = r0 * (1 - 0.3 * stretch)
  // Tall enough to reach both edges; narrower as it stretches (globby, never a string).
  const sy = gap > 0 ? Math.max(1, (gap / 2 + r * 0.55) / r) : 1
  const sx = 1 - 0.3 * stretch
  for (const c of NECK_COLUMNS) out.push({ x: colX(c), y: seam, r: r * c.k, sx, sy })
  return out
}

// ---- 3. drip away ---------------------------------------------------------------------------

const DRIP_SWELL = 0.1
const DRIP_LIFE = 0.65
const FLING_LIFE = 0.55
const DRIP_GRAVITY = 1100
const FLING_DRAG = 3.2
const MAX_DRIPS = 5

const SWIPE_DIR: Readonly<Record<ToastSwipe, { x: number; y: number }>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
}

const dropCount = (f: ToastFeel, seed: number): number =>
  clamp(f.drips + Math.floor(rand(seed, 9, 9) * 3) - 1, 1, MAX_DRIPS)
const dropStart = (i: number, seed: number): number => 0.02 + 0.05 * i * (0.6 + 0.8 * rand(seed, i, 2))

/** Seconds (speed-scaled) after a toast starts leaving by which its goo is gone. */
export function toastLeaveEnd(preset: GoopPreset = 'playful'): number {
  const f = TOAST_FEEL[preset]
  return Math.max(f.leave, dropStart(MAX_DRIPS - 1, 0) * 1.4 + DRIP_SWELL + DRIP_LIFE)
}

export interface ToastLeaveOptions extends ToastPoseOptions {
  /** Swiped out in this direction (drops fling that way). */
  swipe?: ToastSwipe | null
  /** The toast's live rect (the body follows it); defaults to `rect`. */
  bodyRect?: EmergeRect
}

/**
 * The drip-away at `sec` seconds after the toast started leaving; `rect` is where it was
 * when it started (drops live in that space once they let go). Pure. The body sags and
 * pinches away by `leave`; a few drops neck off the bottom edge, fall and fade. Swiped:
 * the body stretches along the swipe and the drops fling off its leading edge. `strength`
 * scales the drops (0 = the body just pinches away).
 */
export function toastLeavePose(sec: number, rect: EmergeRect, o: ToastLeaveOptions = {}): ToastPose {
  const f = feelOf(o)
  const k = clamp(o.strength ?? 1, 0, 2)
  const radius = o.radius ?? 8
  const seed = o.seed ?? 0
  const s = Math.max(0, sec)
  const live = o.bodyRect ?? rect
  const dir = o.swipe ? SWIPE_DIR[o.swipe] : null
  const u = clamp(s / f.leave)
  let body: ToastBody | null = null
  if (u < 1 && live.width > 0 && live.height > 0) {
    const e = smooth(u)
    let w: number
    let h: number
    let cx = live.x + live.width / 2
    let cy = live.y + live.height / 2
    if (dir) {
      const along = 1 + 0.35 * hump(u)
      const across = 1 - 0.7 * e
      const shrink = 1 - e
      w = live.width * (dir.x ? along * shrink : across)
      h = live.height * (dir.y ? along * shrink : across)
      cx += dir.x * live.width * 0.2 * e
      cy += dir.y * live.height * 0.2 * e
    } else {
      // Sag: pinches in, drains toward the bottom edge.
      w = live.width * (1 - 0.5 * e)
      h = live.height * (1 - e) * (1 + 0.12 * hump(u))
      cy += live.height * 0.3 * e
    }
    if (w > 0.5 && h > 0.5) body = { x: cx - w / 2, y: cy - h / 2, w, h, r: Math.min(radius, w / 2, h / 2) }
  }
  const circles: ToastCircle[] = []
  if (k > 0 && rect.width > 0 && rect.height > 0) {
    const n = dropCount(f, seed)
    for (let i = 0; i < n; i++) {
      const s0 = dropStart(i, seed)
      const tau = s - s0
      const life = dir ? FLING_LIFE : DRIP_LIFE
      if (tau <= 0 || tau >= DRIP_SWELL + life) continue
      const r = f.dripSize * (0.7 + 0.6 * rand(seed, i, 1)) * (0.7 + 0.3 * k)
      const fr = (i + 0.5 + (rand(seed, i, 3) - 0.5) * 0.7) / n
      // Where the drop leaves: across the bottom edge, or the swipe's leading edge.
      let ex: number
      let ey: number
      let nx: number
      let ny: number
      if (dir && dir.x) {
        ex = dir.x > 0 ? rect.x + rect.width : rect.x
        ey = lerp(rect.y + r, rect.y + rect.height - r, fr)
        nx = dir.x
        ny = 0
      } else if (dir && dir.y < 0) {
        ex = lerp(rect.x + r, rect.x + rect.width - r, fr)
        ey = rect.y
        nx = 0
        ny = -1
      } else {
        ex = lerp(rect.x + r, rect.x + rect.width - r, fr)
        ey = rect.y + rect.height
        nx = 0
        ny = 1
      }
      if (tau < DRIP_SWELL) {
        // Necking out of the edge on a fat neck.
        const q = smooth(tau / DRIP_SWELL)
        const out = r * (-0.6 + 1.7 * q)
        circles.push({ x: ex + nx * out, y: ey + ny * out, r: r * (0.55 + 0.45 * q) })
        circles.push({ x: ex + nx * out * 0.45, y: ey + ny * out * 0.45, r: r * 0.72 * (1 - 0.5 * smooth((q - 0.6) / 0.4)) })
        continue
      }
      const tf = tau - DRIP_SWELL
      const lf = tf / life
      const fade = 1 - smooth((lf - 0.45) / 0.55)
      let x: number
      let y: number
      if (dir) {
        const v0 = f.fling * (0.7 + 0.6 * rand(seed, i, 4)) * Math.min(1.5, k)
        const travel = (v0 * (1 - Math.exp(-FLING_DRAG * tf))) / FLING_DRAG
        const spread = (rand(seed, i, 5) - 0.5) * 240 * tf
        x = ex + nx * (r * 1.1 + travel) + (dir.x ? 0 : spread)
        y = ey + ny * (r * 1.1 + travel) + (dir.y ? 0 : spread) + 0.5 * DRIP_GRAVITY * 0.6 * tf * tf
      } else {
        x = ex + (rand(seed, i, 5) - 0.5) * 40 * tf
        y = ey + r * 1.1 + 40 * tf + 0.5 * DRIP_GRAVITY * tf * tf
      }
      // Drops stretch along their motion a little while fast, then shrink and fade away.
      const fast = 1 - smooth(lf / 0.5)
      const vert = !dir || !!dir.y
      const st = 1 + 0.35 * fast
      circles.push({
        x,
        y,
        r: lf >= 0.995 ? 0 : r * fade,
        sx: vert ? 1 / Math.sqrt(st) : st,
        sy: vert ? st : 1 / Math.sqrt(st),
        o: fade,
      })
      // The snapped stub recoils into the edge.
      const kk = clamp(tf / 0.08)
      if (kk < 1) circles.push({ x: ex + nx * r * 0.3 * (1 - kk), y: ey + ny * r * 0.3 * (1 - kk), r: r * 0.4 * (1 - smooth(kk)) })
    }
  }
  return { body, circles }
}

// ---- DOM ----------------------------------------------------------------------------------

export interface ToasterOptions extends ToasterEffects {
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the root, then 'playful'. */
  preset?: GoopPreset
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. Reduced: static goo bodies only. */
  reducedMotion?: boolean | 'auto'
}

export interface ToasterHandle {
  /** Patch options in place. */
  update(opts?: ToasterOptions): void
  /** Re-scan toasts and redraw now. */
  refresh(): void
  /** The aria-hidden goo layer (in `document.body`). */
  readonly layer: HTMLElement
  /** Toasts (including leaving ones) the goo is tracking. */
  readonly count: number
  readonly reducedMotion: boolean
  destroy(): void
}

/** Selector for a toast (sonner / vue-sonner markup). */
export const TOAST_SELECTOR = '[data-sonner-toast]'
/** Attribute marking a toast whose background the goo paints. */
export const TOAST_GOO_ATTR = 'data-goop-toast'

const DEFAULT_SHADOW = 'drop-shadow(0 0 0.6px rgb(0 0 0 / 0.35)) drop-shadow(0 4px 8px rgb(0 0 0 / 0.1))'
/** Sonner's toaster z-index; the layer sits just under it. */
const DEFAULT_Z = 999999998
const BASE_R = 10
const STILL_FRAMES = 12
const NECK_GROW = 0.12
/** Inline overrides on a goo'd toast: the goo is its background. */
const OVERRIDES: readonly (readonly [string, string])[] = [
  ['background', 'transparent'],
  ['border-color', 'transparent'],
  ['box-shadow', 'none'],
]

interface ToastState {
  el: HTMLElement
  id: number
  seed: number
  /** Clock time it appeared, or -Infinity (no drop-in). */
  born: number
  /** Clock time it started leaving, or null. */
  left: number | null
  swipe: ToastSwipe | null
  /** Rect when it started leaving (drops live there). */
  leftRect: EmergeRect | null
  rect: EmergeRect
  /** The settled body as drawn this frame (rect, or shrunk while sonner fades the toast). */
  drawn: EmergeRect
  /** It started leaving while not drawn (faded out by sonner): no drip. */
  hidden: boolean
  radius: number
  color: string
  edge: ToastEdge
  goo: boolean
}

interface PairState {
  attached: boolean
  /** Seconds since it (re)formed or snapped. */
  age: number
  seen: boolean
}

const NONE: EmergeRect = Object.freeze({ x: 0, y: 0, width: 0, height: 0 })
const fmt = (n: number): string => (Math.round(n * 100) / 100).toString()
const isSwipe = (v: string | null): v is ToastSwipe => v === 'left' || v === 'right' || v === 'up' || v === 'down'
/** Fully transparent color: `transparent`, `rgba(r, g, b, 0)` or `... / 0)`. */
const transparent = (c: string): boolean =>
  !c || c === 'transparent' || /^rgba\((?:[^,]*,){3}\s*0(?:\.0*)?\s*\)$/.test(c) || /\/\s*0(?:\.0*)?%?\s*\)$/.test(c)

/**
 * Attach a goo layer to a toaster. `root` is the toaster's root element (vue-sonner's
 * `<section>`) or any ancestor of its `[data-sonner-toast]` items; toasts are found and
 * followed live (MutationObserver). Toasts already there when it attaches don't drop in.
 */
export function attachToaster(root: HTMLElement, options: ToasterOptions = {}): ToasterHandle {
  const doc = root.ownerDocument
  const win = doc.defaultView
  let opts: ToasterOptions = { ...options }
  let preset = readPreset(root, opts.preset)
  let feel = TOAST_FEEL[preset]
  let lease: GooFilterLease = acquireGooFilter(doc, toastGooParams(preset))
  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()
  let destroyed = false
  let clock = 0
  let still = 0
  let lastSig = ''
  let nextId = 1
  const toasts = new Map<HTMLElement, ToastState>()
  const pairs = new Map<string, PairState>()

  // Wrapper carries the outline shadow (applied to the thresholded goo), the layer the goo.
  const wrap = doc.createElement('div')
  wrap.setAttribute('data-goop', 'toaster')
  wrap.setAttribute('aria-hidden', 'true')
  wrap.style.cssText =
    `position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:${DEFAULT_Z};` +
    `filter:var(--goop-surface-shadow,${DEFAULT_SHADOW});contain:layout style;`
  const layer = doc.createElement('div')
  layer.setAttribute('data-goop', 'layer')
  layer.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;overflow:visible;'
  layer.style.filter = `url(#${lease.id})`
  wrap.append(layer)
  doc.body.append(wrap)

  // Element pools: bodies (rounded rects) and circles.
  const bodies: HTMLElement[] = []
  const dots: { el: HTMLElement; t: string; o: string; c: string }[] = []
  const bodyEl = (i: number): HTMLElement => {
    let el = bodies[i]
    if (!el) {
      el = doc.createElement('div')
      el.setAttribute('data-goop', 'body')
      el.style.cssText = 'position:absolute;left:0;top:0;transform-origin:0 0;'
      layer.append(el)
      bodies[i] = el
    }
    return el
  }
  const dot = (i: number) => {
    let d = dots[i]
    if (!d) {
      const el = doc.createElement('div')
      el.setAttribute('data-goop', 'blob')
      el.style.cssText = `position:absolute;left:${-BASE_R}px;top:${-BASE_R}px;width:${BASE_R * 2}px;height:${BASE_R * 2}px;border-radius:50%;transform:scale(0);`
      layer.append(el)
      d = { el, t: 'scale(0)', o: '1', c: '' }
      dots[i] = d
    }
    return d
  }

  const opacityOf = (el: Element): number => {
    const v = Number.parseFloat(win?.getComputedStyle(el).opacity ?? '')
    return Number.isFinite(v) ? v : 1
  }
  const rectOf = (el: Element): EmergeRect => {
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, width: r.width, height: r.height }
  }
  // Inline values our overrides replaced, restored when they come off.
  const saved = new WeakMap<HTMLElement, [string, string][]>()
  const setOverrides = (el: HTMLElement, on: boolean): void => {
    const st = el.style
    if (on) {
      if (!saved.has(el)) saved.set(el, OVERRIDES.map(([p]) => [st.getPropertyValue(p), st.getPropertyPriority(p)]))
      for (const [p, v] of OVERRIDES) st.setProperty(p, v, 'important')
      el.setAttribute(TOAST_GOO_ATTR, '')
      return
    }
    const prev = saved.get(el)
    if (!prev) return
    saved.delete(el)
    OVERRIDES.forEach(([p], i) => {
      const [v, prio] = prev[i]!
      if (v) st.setProperty(p, v, prio)
      else st.removeProperty(p)
    })
    el.removeAttribute(TOAST_GOO_ATTR)
  }
  /** The toast's own background, read with our overrides lifted. */
  const readLook = (s: ToastState): void => {
    const had = s.el.hasAttribute(TOAST_GOO_ATTR)
    if (had) setOverrides(s.el, false)
    const cs = win?.getComputedStyle(s.el)
    const color = cs?.backgroundColor ?? ''
    s.radius = Number.parseFloat(cs?.borderTopLeftRadius ?? '') || 8
    s.goo = !transparent(color)
    s.color = s.goo ? color : ''
    if (s.goo) setOverrides(s.el, true)
  }
  const syncZ = (el: HTMLElement): void => {
    const list = el.closest('[data-sonner-toaster]')
    const z = list && win ? Number.parseInt(win.getComputedStyle(list).zIndex, 10) : Number.NaN
    wrap.style.zIndex = String(Number.isFinite(z) ? Math.max(0, z - 1) : DEFAULT_Z)
  }

  const scan = (initial: boolean): void => {
    const found = new Set<HTMLElement>()
    for (const node of Array.from(root.querySelectorAll<HTMLElement>(TOAST_SELECTOR))) {
      found.add(node)
      let s = toasts.get(node)
      if (!s) {
        const id = nextId++
        s = {
          el: node,
          id,
          seed: id * 7.31 + 1,
          born: initial || node.getAttribute('data-removed') === 'true' ? -Infinity : clock,
          left: null,
          swipe: null,
          leftRect: null,
          rect: rectOf(node),
          drawn: NONE,
          hidden: false,
          radius: 8,
          color: '',
          edge: node.getAttribute('data-y-position') === 'top' ? 'top' : 'bottom',
          goo: false,
        }
        toasts.set(node, s)
        readLook(s)
        syncZ(node)
      }
      if (s.left === null && node.getAttribute('data-removed') === 'true') startLeave(s)
    }
    for (const s of toasts.values()) if (!found.has(s.el) && s.left === null) startLeave(s)
  }
  const startLeave = (s: ToastState): void => {
    s.left = clock
    const swipe = s.el.getAttribute('data-swipe-direction')
    s.swipe = s.el.getAttribute('data-swipe-out') === 'true' && isSwipe(swipe) ? swipe : null
    if (s.el.isConnected) s.rect = rectOf(s.el)
    s.leftRect = { ...s.rect }
    // Not drawn last frame (sonner had it faded out): it leaves without goo.
    s.hidden = s.drawn.width <= 0 && clock > s.born
  }

  const strength = (k: keyof ToasterEffects): number => (reduced ? 0 : emergeMomentumStrength(opts[k]))

  /** Draw one frame; returns true while anything is animating. */
  const draw = (dt: number): boolean => {
    let busy = false
    const dropK = strength('dropIn')
    const mergeK = strength('merge')
    const dripK = strength('drips')
    const leaveEnd = toastLeaveEnd(preset)
    const dropEnd = toastDropEnd(preset)
    const shapes: { body: ToastBody | null; circles: ToastCircle[]; color: string }[] = []
    const lists = new Map<Element, ToastState[]>()
    let sig = ''
    for (const s of Array.from(toasts.values())) {
      if (s.el.isConnected) s.rect = rectOf(s.el)
      if (s.left !== null) {
        const age = clock - s.left
        if (reduced || !s.goo || s.hidden || age >= leaveEnd) {
          // Done (or no goo to drip, or it was faded out, past `visibleToasts`): the toast shows its own look while sonner fades it.
          if (s.el.hasAttribute(TOAST_GOO_ATTR)) setOverrides(s.el, false)
          if (!s.el.isConnected) toasts.delete(s.el)
          continue
        }
        busy = true
        shapes.push({
          ...toastLeavePose(age, s.leftRect ?? s.rect, {
            preset,
            strength: dripK,
            radius: s.radius,
            seed: s.seed,
            swipe: s.swipe,
            // Unmounted mid-drip: stay where the toast last was (s.rect isn't re-measured
            // once it's gone). Falling back to where it started leaving would jump the body
            // back over sonner's removal lift.
            bodyRect: s.rect,
          }),
          color: s.color,
        })
        continue
      }
      s.drawn = NONE
      if (!s.goo) continue
      const { x, y, width, height } = s.rect
      if (width <= 0 || height <= 0) continue
      const age = clock - s.born
      const dropping = age < dropEnd && dropK > 0
      // Sonner fades toasts in/out (past `visibleToasts`, the one revealed when a toast above
      // it leaves): follow its live opacity so the goo never pops ahead of the toast (a new
      // toast's mount fade is covered by the drop-in). Reduced motion: no inflate, the static
      // body shows once the toast is mostly there.
      const op = dropping ? 1 : opacityOf(s.el)
      if (op <= 0.001 || (reduced && op < 0.5)) continue
      sig += `${x | 0},${y | 0},${width | 0},${height | 0},${(op * 100) | 0};`
      let drawn: EmergeRect = s.rect
      if (dropping) {
        busy = true
        shapes.push({ ...toastDropPose(age, s.rect, s.edge, { preset, strength: dropK, radius: s.radius, seed: s.seed }), color: s.color })
      } else {
        const body = reduced ? restBody(s.rect, s.radius) : toastFadeBody(s.rect, op, s.radius)
        if (!body) continue
        if (op < 0.999 && !reduced) busy = true
        drawn = { x: body.x, y: body.y, width: body.w, height: body.h }
        shapes.push({ body, circles: [], color: s.color })
      }
      s.drawn = drawn
      const list = s.el.parentElement
      if (list) {
        const arr = lists.get(list) ?? []
        arr.push(s)
        lists.set(list, arr)
      }
    }
    // Necks between vertical neighbours of each list.
    for (const p of pairs.values()) p.seen = false
    if (mergeK > 0) {
      for (const arr of lists.values()) {
        arr.sort((a, b) => a.drawn.y + a.drawn.height / 2 - (b.drawn.y + b.drawn.height / 2))
        for (let i = 0; i + 1 < arr.length; i++) {
          const a = arr[i]!
          const b = arr[i + 1]!
          const key = `${a.id}:${b.id}`
          const gap = toastNeckGap(a.drawn, b.drawn)
          let p = pairs.get(key)
          if (!p) {
            const attached = gap < feel.mergeGap
            // Already merged at first sight: fully grown; already apart: no recoil.
            p = { attached, age: attached ? (clock < 0.05 ? 1 : 0) : Infinity, seen: true }
            pairs.set(key, p)
          }
          p.seen = true
          p.age += dt
          if (p.attached && gap > feel.snapGap) {
            p.attached = false
            p.age = 0
          } else if (!p.attached && gap < feel.mergeGap) {
            p.attached = true
            p.age = 0
          }
          const grow = p.attached ? smooth(p.age / NECK_GROW) : 1
          if ((p.attached && grow < 1) || (!p.attached && p.age < feel.recoil)) busy = true
          const circles = toastNeck(a.drawn, b.drawn, {
            preset,
            strength: mergeK,
            grow,
            snapAge: p.attached ? undefined : p.age,
          })
          if (circles.length) shapes.push({ body: null, circles, color: a.color || b.color })
        }
      }
    }
    for (const [k, p] of pairs) if (!p.seen) pairs.delete(k)
    render(shapes)
    if (sig !== lastSig) {
      lastSig = sig
      still = 0
    } else still++
    return busy || still < STILL_FRAMES
  }

  let lastBox = ''
  const render = (shapes: { body: ToastBody | null; circles: ToastCircle[]; color: string }[]): void => {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    const grow = (ax: number, ay: number, bx: number, by: number): void => {
      if (ax < x0) x0 = ax
      if (ay < y0) y0 = ay
      if (bx > x1) x1 = bx
      if (by > y1) y1 = by
    }
    for (const sh of shapes) {
      if (sh.body) grow(sh.body.x, sh.body.y, sh.body.x + sh.body.w, sh.body.y + sh.body.h)
      for (const c of sh.circles) {
        if (c.r <= 0) continue
        const rx = c.r * (c.sx ?? 1)
        const ry = c.r * (c.sy ?? 1)
        grow(c.x - rx, c.y - ry, c.x + rx, c.y + ry)
      }
    }
    const empty = !Number.isFinite(x0)
    const pad = Math.ceil(feel.softness * 3) + 4
    // Snap the box to 16px steps so it doesn't resize every frame.
    const bx = empty ? 0 : Math.floor((x0 - pad) / 16) * 16
    const by = empty ? 0 : Math.floor((y0 - pad) / 16) * 16
    const bw = empty ? 0 : Math.ceil((x1 + pad - bx) / 16) * 16
    const bh = empty ? 0 : Math.ceil((y1 + pad - by) / 16) * 16
    const box = `${bx},${by},${bw},${bh}`
    if (box !== lastBox) {
      lastBox = box
      wrap.style.display = empty ? 'none' : ''
      layer.style.transform = `translate(${bx}px,${by}px)`
      layer.style.width = `${bw}px`
      layer.style.height = `${bh}px`
    }
    let bi = 0
    let di = 0
    for (const sh of shapes) {
      if (sh.body && sh.body.w > 0 && sh.body.h > 0) {
        const el = bodyEl(bi++)
        const b = sh.body
        const st = el.style
        st.display = ''
        st.transform = `translate(${fmt(b.x - bx)}px,${fmt(b.y - by)}px)`
        st.width = `${fmt(b.w)}px`
        st.height = `${fmt(b.h)}px`
        st.borderRadius = `${fmt(b.r)}px`
        st.background = sh.color
      }
      for (const c of sh.circles) {
        if (c.r <= 0.3) continue
        const d = dot(di++)
        const kk = c.r / BASE_R
        const t = `translate(${fmt(c.x - bx)}px,${fmt(c.y - by)}px) scale(${(kk * (c.sx ?? 1)).toFixed(3)},${(kk * (c.sy ?? 1)).toFixed(3)})`
        if (t !== d.t) d.el.style.transform = d.t = t
        const o = c.o === undefined || c.o >= 1 ? '1' : String(Math.round(c.o * 1000) / 1000)
        if (o !== d.o) d.el.style.opacity = d.o = o
        if (sh.color !== d.c) d.el.style.background = d.c = sh.color
      }
    }
    for (let i = bi; i < bodies.length; i++) bodies[i]!.style.display = 'none'
    for (let i = di; i < dots.length; i++) {
      const d = dots[i]!
      if (d.t !== 'scale(0)') d.el.style.transform = d.t = 'scale(0)'
    }
  }

  const tick: Ticker = (dt) => {
    if (destroyed) return false
    const step = dt * Math.max(0.05, opts.speed ?? 1)
    clock += step
    return draw(step)
  }
  const wake = (): void => {
    if (destroyed) return
    still = 0
    wakeTicker(tick)
  }

  const mo = typeof MutationObserver === 'function'
    ? new MutationObserver((records) => {
        let restyle = false
        for (const r of records) {
          if (r.type === 'attributes' && r.target instanceof Element && r.target.matches(TOAST_SELECTOR)) {
            const n = r.attributeName
            const s = toasts.get(r.target as HTMLElement)
            if (s && (n === 'class' || n === 'data-type' || n === 'data-rich-colors' || n === 'data-invert')) readLook(s)
            else if (s && n === 'style' && s.el.hasAttribute(TOAST_GOO_ATTR) && s.el.style.getPropertyPriority('background') !== 'important') {
              // The framework re-applied the toast's own inline background over ours: adopt it.
              saved.delete(s.el)
              s.el.removeAttribute(TOAST_GOO_ATTR)
              if (s.left === null) readLook(s)
            }
          }
          if (r.type === 'attributes' && r.attributeName === 'data-sonner-theme') restyle = true
        }
        if (restyle) for (const s of toasts.values()) readLook(s)
        scan(false)
        wake()
      })
    : null
  mo?.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-removed', 'data-swipe-out', 'data-expanded', 'data-front', 'data-visible', 'data-mounted', 'data-swiping', 'data-type', 'data-rich-colors', 'data-invert', 'data-sonner-theme', 'class', 'style'],
  })
  const events = ['pointerenter', 'pointerleave', 'pointermove', 'transitionrun', 'focusin', 'focusout'] as const
  for (const e of events) root.addEventListener(e, wake, true)
  win?.addEventListener('resize', wake)

  scan(true)
  draw(0)
  wake()

  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    wake()
  })

  return {
    update(next = {}) {
      if (destroyed) return
      opts = { ...opts, ...next }
      const nextPreset = readPreset(root, opts.preset)
      if (nextPreset !== preset) {
        preset = nextPreset
        feel = TOAST_FEEL[preset]
        const l = acquireGooFilter(doc, toastGooParams(preset))
        lease.release()
        lease = l
        layer.style.filter = `url(#${lease.id})`
      }
      reduced = readReduced()
      wake()
    },
    refresh() {
      if (destroyed) return
      scan(false)
      draw(0)
      wake()
    },
    get layer() {
      return wrap
    },
    get count() {
      return toasts.size
    },
    get reducedMotion() {
      return reduced
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      unwatch()
      mo?.disconnect()
      for (const e of events) root.removeEventListener(e, wake, true)
      win?.removeEventListener('resize', wake)
      for (const s of toasts.values()) setOverrides(s.el, false)
      toasts.clear()
      pairs.clear()
      wrap.remove()
      lease.release()
    },
  }
}

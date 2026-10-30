// Dialog goo: the panel and the backdrop of a modal (Dialog, AlertDialog).
//
// Panel: the popover's bloom (`./emerge`, `detached: true`): a dialog has no trigger to grow
// out of, so it blooms from its own center with nothing to keep clear of; the overshoot and
// the big all-around splash reach every side, and close pulls in, wobbles and shrinks back to
// the center. DIALOG_FEEL is a touch slower and softer than the popover's (a bigger surface).
// AlertDialog is the serious one: same bloom with a lighter splash and slosh
// (ALERT_DIALOG_SPLASH / ALERT_DIALOG_MOMENTUM).
//
// Backdrop (`attachBackdrop`): the dimmed overlay pours down over the page as a goo sheet
// whose leading edge runs ahead in lumpy drips, and on close drains off the bottom with the
// drips trailing behind. `drips: false` keeps a straight edge (a plain wipe). The sheet is
// opaque goo (`--goop-color`, default black) on an aria-hidden surface whose opacity
// (`--goop-backdrop-opacity`, default 0.5) dims the page: goo can't paint translucent color.
//
// Pure pose (`backdropPose`) + a thin DOM driver, like emerge. Reduced motion: no pour, the
// backdrop is just there (open) or gone (close, 0ms).

import type { GoopPreset } from './constants'
import type { EmergeFeel } from './emerge'
import type { EmergeDripOptions, EmergeMomentumEffects } from './emerge-momentum'
import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import { readPreset } from './tuning'

// ---- panel ---------------------------------------------------------------------------------

/** Per-preset emerge feel for dialogs (bloom only). Pass as `attachEmerge(host, { feel })`. */
export const DIALOG_FEEL: Readonly<Record<GoopPreset, Readonly<EmergeFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.42, close: 0.28, bulb: 0.34, decay: 7, travel: 0.45, snap: 0.45, softness: 4.5, bloomOpen: 0.5, bloomClose: 0.26, bloomOvershoot: 3 }),
  playful: Object.freeze({ open: 0.56, close: 0.34, bulb: 0.42, decay: 4.5, travel: 1, snap: 0.65, softness: 5.5, bloomOpen: 0.62, bloomClose: 0.32, bloomOvershoot: 5 }),
  wild: Object.freeze({ open: 0.72, close: 0.4, bulb: 0.5, decay: 3, travel: 1.6, snap: 0.9, softness: 6.5, bloomOpen: 0.76, bloomClose: 0.38, bloomOvershoot: 7.5 }),
})

/** AlertDialog momentum: a lighter slosh (0..2 strengths, see EmergeMomentumEffects). */
export const ALERT_DIALOG_MOMENTUM: Readonly<Required<Pick<EmergeMomentumEffects, 'openSlosh' | 'closeSlosh'>>> = Object.freeze({
  openSlosh: 0.6,
  closeSlosh: 0.7,
})

/** AlertDialog splash: fewer, smaller drops flung a shorter way (the dialog's is the
 *  popover's big all-around splash). */
export const ALERT_DIALOG_SPLASH: Readonly<
  Required<Pick<EmergeMomentumEffects, 'openDrips'>> & Required<Pick<EmergeDripOptions, 'openDripAmount' | 'openDripSize' | 'openDripFling'>>
> = Object.freeze({
  openDrips: 1,
  openDripAmount: 0.35,
  openDripSize: 0.75,
  openDripFling: 0.6,
})

// ---- backdrop ------------------------------------------------------------------------------

export interface BackdropFeel {
  /** Pour (open) and drain (close) durations, s at speed 1. */
  open: number
  close: number
  /** Goo blur (px). */
  softness: number
}

export const BACKDROP_FEEL: Readonly<Record<GoopPreset, Readonly<BackdropFeel>>> = Object.freeze({
  subtle: Object.freeze({ open: 0.36, close: 0.26, softness: 6 }),
  playful: Object.freeze({ open: 0.46, close: 0.32, softness: 8 }),
  wild: Object.freeze({ open: 0.58, close: 0.38, softness: 10 }),
})

/** Most drips along the sheet's edge. */
export const BACKDROP_DRIPS = 24
/** Blobs the driver allocates: a head and a neck per drip. */
export const BACKDROP_LUMPS = BACKDROP_DRIPS * 2

const LUMP = {
  /** Px of edge per lump, and the lump count bounds. */
  spacing: 95,
  min: 4,
  /** Lump radius: fraction of the spacing, clamped (px). */
  size: 0.42,
  rMin: 16,
  rMax: 48,
  /** How far a lump runs ahead of the edge (x its radius) at strength 1: hash range. */
  leadMin: -0.1,
  leadMax: 2,
} as const

export type BackdropPhase = 'open' | 'close'

export interface BackdropPose {
  /** The sheet's top and bottom (px, host space; may lie outside 0..H). top >= bottom hides it. */
  top: number
  bottom: number
  /** Drip lumps (zero radius when unused), BACKDROP_LUMPS long. */
  lumps: { x: number; y: number; r: number }[]
}

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v))
const smooth = (x: number): number => {
  const t = clamp(x)
  return t * t * (3 - 2 * t)
}
function hash(seed: number, a: number, b: number): number {
  const s = Math.sin(seed * 91.7 + a * 127.1 + b * 311.7 + 17.3) * 43758.5453
  return s - Math.floor(s)
}

/** Lump count for an edge `width` px wide. */
export function backdropLumpCount(width: number): number {
  return Math.max(LUMP.min, Math.min(BACKDROP_DRIPS, Math.round(width / LUMP.spacing)))
}

/**
 * Backdrop pose at phase progress `t` (0..1) for a `width` x `height` host. Open: a sheet
 * pours down from above the top, its edge led by drips; at t = 1 it covers everything. Close:
 * the sheet's top drains down past the bottom, drips trailing above it. `drips`: 0..2 lump
 * strength (0: a straight edge). Pure.
 */
export function backdropPose(t: number, phase: BackdropPhase, width: number, height: number, drips = 1, seed = 0): BackdropPose {
  const lumps = Array.from({ length: BACKDROP_LUMPS }, () => ({ x: 0, y: 0, r: 0 }))
  const W = Math.max(0, width)
  const H = Math.max(0, height)
  if (phase === 'open' && t >= 1) return { top: 0, bottom: H, lumps }
  if (phase === 'close' && t >= 1) return { top: H, bottom: H, lumps }
  const n = backdropLumpCount(W)
  const R = clamp((W / n) * LUMP.size, LUMP.rMin, LUMP.rMax)
  const k = clamp(drips, 0, 2)
  // Travel far enough that the lumps start and end out of view.
  const reach = R * (1 + LUMP.leadMax * k) + R
  const span = H + 2 * reach
  let top: number
  let bottom: number
  let edge: number
  let sign: number
  let amp: number
  if (phase === 'open') {
    const e = 1 - (1 - clamp(t)) ** 2.2
    top = 0
    edge = -reach + span * e
    bottom = edge
    sign = 1
    amp = smooth(t / 0.3)
  } else {
    const e = clamp(t) ** 1.8
    edge = -reach + span * e
    top = edge
    bottom = H
    sign = -1
    amp = smooth(t / 0.25)
  }
  if (k > 0) {
    for (let i = 0; i < n; i++) {
      const r = R * (0.55 + 0.7 * hash(seed, i, 1))
      const lead = LUMP.leadMin + (LUMP.leadMax - LUMP.leadMin) * hash(seed, i, 2) ** 1.6
      const x = ((i + 0.5 + (hash(seed, i, 3) - 0.5) * 0.6) * W) / n
      // Center tucked into the sheet, then run ahead (open: down; close: trail up).
      const run = lead * k * amp
      const y = edge + sign * r * (run - 0.4)
      lumps[i] = { x, y, r }
      // A long drip keeps a neck back to the sheet, so it reads as a finger, not a loose drop.
      if (run > 0.5) lumps[BACKDROP_DRIPS + i] = { x, y: edge + sign * r * (run - 0.4) * 0.5, r: r * 0.6 }
    }
  }
  return { top, bottom, lumps }
}

export interface BackdropOptions {
  /** Drippy leading edge: `true` (1), `false` (a straight edge) or a 0..2 strength. Default true. */
  drips?: boolean | number
  /** Animation speed multiplier. Default 1. */
  speed?: number
  /** Feel preset. Default: `--goop-preset` on the host, then 'playful'. */
  preset?: GoopPreset
  /** 'svg' (default), 'canvas', or a custom renderer factory. */
  renderer?: GoopRendererOption
  /** true / false force it; 'auto' (default) follows prefers-reduced-motion and
   *  `<html data-reduced-motion="true">`, live. */
  reducedMotion?: boolean | 'auto'
  /** Use this element as the goo surface instead of creating one (must be a child of host). */
  surface?: HTMLElement
  /** Per-open seed for the lump layout. Default: changes every open. */
  seed?: number
}

export type BackdropState = 'closed' | 'opening' | 'open' | 'closing'

export interface BackdropHandle {
  open(): void
  /** Play the drain. Returns its duration in ms (0 under reduced motion). */
  close(): number
  update(opts?: BackdropOptions): void
  refresh(): void
  readonly state: BackdropState
  readonly reducedMotion: boolean
  readonly closeDuration: number
  destroy(): void
}

/** Attribute on the host: the backdrop state (`data-goop-still` marks reduced motion). */
export const BACKDROP_STATE_ATTR = 'data-goop-backdrop'
export const BACKDROP_STILL_ATTR = 'data-goop-still'
/** CSS custom property: the close (drain) duration, for a stylesheet's hold animation. */
export const BACKDROP_CLOSE_VAR = '--goop-backdrop-close'

/** Drip strength from a toggle (`true` = 1). */
export function backdropDripStrength(v: boolean | number | undefined): number {
  if (v === undefined || v === true) return 1
  if (v === false) return 0
  return Number.isFinite(v) ? clamp(v, 0, 2) : 1
}

/**
 * Attach a pouring goo backdrop to `host` (a fixed, full-viewport overlay). Starts closed:
 * call `open()`. The host's own background should be clear; the goo paints it.
 */
export function attachBackdrop(host: HTMLElement, options: BackdropOptions = {}): BackdropHandle {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let opts: BackdropOptions = { ...options }
  let presetName = readPreset(host, opts.preset)
  let feel = BACKDROP_FEEL[presetName]
  let renderer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let state: BackdropState = 'closed'
  let t = 0
  let seed = opts.seed ?? 0
  let destroyed = false

  const readReduced = (): boolean => opts.reducedMotion === true || (opts.reducedMotion !== false && isReducedMotion(doc))
  let reduced = readReduced()

  const ownSurface = !opts.surface
  const surface = opts.surface ?? doc.createElement('span')
  if (ownSurface) host.prepend(surface)
  surface.setAttribute('data-goop', 'surface')
  surface.setAttribute('aria-hidden', 'true')
  const prevSurfaceCss = surface.style.cssText
  surface.style.cssText +=
    ';position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:var(--goop-backdrop-opacity,0.5);'
  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  const speed = (): number => Math.max(0.05, opts.speed ?? 1)
  const dur = (phase: BackdropPhase): number => (phase === 'open' ? feel.open : feel.close)
  const closeMs = (): number => (reduced ? 0 : Math.round((dur('close') * 1000) / speed()))
  const params = (): GooFilterParams => ({ blur: feel.softness, contrast: 20, threshold: 0.4 })

  const size = (): { w: number; h: number } => {
    const r = host.getBoundingClientRect()
    return { w: r.width || host.offsetWidth || win?.innerWidth || 0, h: r.height || host.offsetHeight || win?.innerHeight || 0 }
  }

  const draw = (pose: BackdropPose, w: number, h: number): void => {
    if (!renderer) return
    // Overscan past the sides (and past top/bottom at rest) so the goo's blurred rim never
    // shows inside the viewport.
    const ov = Math.ceil(feel.softness * 3)
    const top = pose.top <= 0 ? -ov : pose.top
    const bottom = pose.bottom >= h ? h + ov : pose.bottom
    const W = w || 1
    const H = h || 1
    const hidden = bottom - top < 0.5
    const sx = hidden ? 0 : (W + 2 * ov) / W
    const sy = hidden ? 0 : (bottom - top) / H
    const ty = hidden ? 0 : (top + bottom) / 2 - H / 2
    if (renderer.setBodyTransform) renderer.setBodyTransform({ tx: 0, ty, skew: 0, sx, sy })
    else renderer.setBodyScale(sx, sy)
    for (let i = 0; i < blobs.length; i++) {
      const c = pose.lumps[i]
      if (c && c.r > 0) blobs[i]!.set(c.x, c.y, c.r)
      else blobs[i]!.set(0, 0, 0)
    }
    renderer.flush()
  }

  const drawNow = (): void => {
    const { w, h } = size()
    const drips = backdropDripStrength(opts.drips)
    let pose: BackdropPose
    if (state === 'open' || (reduced && state === 'opening')) pose = backdropPose(1, 'open', w, h, drips, seed)
    else if (state === 'closed' || (reduced && state === 'closing')) pose = backdropPose(1, 'close', w, h, drips, seed)
    else pose = backdropPose(t, state === 'opening' ? 'open' : 'close', w, h, drips, seed)
    draw(pose, w, h)
  }

  const syncAttrs = (hold?: number): void => {
    host.setAttribute(BACKDROP_STATE_ATTR, state)
    if (reduced) host.setAttribute(BACKDROP_STILL_ATTR, '')
    else host.removeAttribute(BACKDROP_STILL_ATTR)
    const ms = hold ?? (state === 'closing' || state === 'closed' ? undefined : closeMs())
    if (ms !== undefined || !host.style.getPropertyValue(BACKDROP_CLOSE_VAR)) {
      host.style.setProperty(BACKDROP_CLOSE_VAR, `${ms ?? closeMs()}ms`)
    }
  }

  const build = (): void => {
    for (const bl of blobs) bl.remove()
    renderer?.destroy()
    renderer = resolveRenderer(opts.renderer)(surface, params())
    renderer.setPadding({ side: 0, bottom: 0 })
    blobs = Array.from({ length: BACKDROP_LUMPS }, () => renderer!.createBlob())
    drawNow()
  }

  const tick: Ticker = (dt) => {
    if (destroyed || (state !== 'opening' && state !== 'closing')) return false
    t = Math.min(1, t + (dt * speed()) / dur(state === 'opening' ? 'open' : 'close'))
    if (t >= 1) {
      state = state === 'opening' ? 'open' : 'closed'
      syncAttrs()
      drawNow()
      return false
    }
    drawNow()
    return true
  }

  build()
  syncAttrs()

  const settle = (): void => {
    removeTicker(tick)
    if (state === 'opening') state = 'open'
    if (state === 'closing') state = 'closed'
  }
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) settle()
    syncAttrs()
    drawNow()
  })

  return {
    open() {
      if (destroyed || state === 'open' || state === 'opening') return
      if (reduced) {
        state = 'open'
        syncAttrs()
        drawNow()
        return
      }
      // Reversing a drain: pour from (about) where the sheet is.
      const from = state === 'closing' ? clamp(1 - t, 0, 0.9) : 0
      if (from === 0) seed = opts.seed ?? seed + 1
      state = 'opening'
      t = from
      syncAttrs()
      drawNow()
      wakeTicker(tick)
    },
    close() {
      if (destroyed || state === 'closed' || state === 'closing') return 0
      if (reduced) {
        state = 'closed'
        syncAttrs()
        drawNow()
        return 0
      }
      const from = state === 'opening' ? clamp(1 - t, 0, 0.9) : 0
      state = 'closing'
      t = from
      const ms = Math.round(((1 - t) * dur('close') * 1000) / speed())
      syncAttrs(ms)
      drawNow()
      wakeTicker(tick)
      return ms
    },
    update(next = {}) {
      if (destroyed) return
      const rendererChanged = 'renderer' in next && next.renderer !== opts.renderer
      opts = { ...opts, ...next }
      presetName = readPreset(host, opts.preset)
      const nextFeel = BACKDROP_FEEL[presetName]
      const rebuild = rendererChanged || nextFeel.softness !== feel.softness
      feel = nextFeel
      reduced = readReduced()
      if (reduced) settle()
      syncAttrs()
      if (rebuild) build()
      else drawNow()
    },
    refresh() {
      if (!destroyed) drawNow()
    },
    get state() {
      return state
    },
    get reducedMotion() {
      return reduced
    },
    get closeDuration() {
      return closeMs()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      unwatch()
      for (const bl of blobs) bl.remove()
      blobs = []
      renderer?.destroy()
      renderer = null
      if (ownSurface) surface.remove()
      else surface.style.cssText = prevSurfaceCss
      host.removeAttribute(BACKDROP_STATE_ATTR)
      host.removeAttribute(BACKDROP_STILL_ATTR)
      host.style.removeProperty(BACKDROP_CLOSE_VAR)
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

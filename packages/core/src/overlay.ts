// Escape-mode overlay: ONE page-level layer per document that splash/shockwave particles
// hand off to so they can fly across the page. Ref-counted: created by the first element in
// escape mode, removed with the last. Particles live in PAGE coordinates (so scrolling moves
// them with the content) and are drawn in viewport coordinates.
//
// Rendering is behind `GoopOverlay` (a renderer concern): the SVG implementation below sizes
// a fixed, pointer-events:none, filtered element to the particles' bounding box each frame,
// so the goo filter only processes the area actually in use. A canvas renderer can supply
// its own overlay via `attachGoop(el, { overlay })`.

import { GOOP_DEFAULTS } from './constants'
import { acquireGooFilter, gooVanishRadius, type GooFilterParams } from './filter'
import { ParticleFluid, type ParticleSpawn } from './fluid'
import { removeTicker, wakeTicker } from './loop'
import { GOOP_PART_ATTR, type GoopBlob } from './renderer'

export interface GoopOverlay {
  /** Blob in VIEWPORT coordinates, filled with `color` (CSS). */
  createBlob(color?: string): GoopBlob
  /** Called once per frame after all blobs are set. */
  flush(): void
  destroy(): void
}

export type GoopOverlayFactory = (doc: Document, params: GooFilterParams) => GoopOverlay

/** Attribute on the shared overlay element. */
export const GOOP_OVERLAY_ATTR = 'data-goop-overlay'

/** Default overlay: a fixed, filtered element sized to the particles' bounding box. */
export function createSvgOverlay(doc: Document, params: GooFilterParams): GoopOverlay {
  const lease = acquireGooFilter(doc, params)
  const pad = Math.ceil(params.blur * 3 + 4)
  const el = doc.createElement('div')
  el.setAttribute(GOOP_OVERLAY_ATTR, '')
  el.setAttribute('aria-hidden', 'true')
  el.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;pointer-events:none;z-index:2147483000;' +
    `overflow:visible;display:none;filter:url(#${lease.id});`
  ;(doc.body ?? doc.documentElement).append(el)

  interface Rec {
    el: HTMLSpanElement
    x: number
    y: number
    r: number
    sx: number
    sy: number
    o: number
  }
  const blobs = new Set<Rec>()
  const BASE_R = 10
  return {
    createBlob(color) {
      const s = doc.createElement('span')
      s.setAttribute(GOOP_PART_ATTR, 'blob')
      s.style.cssText =
        `position:absolute;display:block;left:${-BASE_R}px;top:${-BASE_R}px;width:${BASE_R * 2}px;` +
        `height:${BASE_R * 2}px;border-radius:50%;transform:scale(0);background:${color ?? 'currentColor'};`
      el.append(s)
      const rec: Rec = { el: s, x: 0, y: 0, r: 0, sx: 1, sy: 1, o: 1 }
      blobs.add(rec)
      return {
        set(x, y, r, o = 1, sx = 1, sy = 1) {
          Object.assign(rec, { x, y, r, o, sx, sy })
        },
        remove() {
          blobs.delete(rec)
          s.remove()
        },
      }
    },
    flush() {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const b of blobs) {
        if (b.r <= 0.01) continue
        const rr = b.r * Math.max(b.sx, b.sy)
        minX = Math.min(minX, b.x - rr)
        minY = Math.min(minY, b.y - rr)
        maxX = Math.max(maxX, b.x + rr)
        maxY = Math.max(maxY, b.y + rr)
      }
      if (minX === Infinity) {
        el.style.display = 'none'
        return
      }
      const ox = Math.floor(minX - pad)
      const oy = Math.floor(minY - pad)
      el.style.display = 'block'
      el.style.left = `${ox}px`
      el.style.top = `${oy}px`
      el.style.width = `${Math.ceil(maxX + pad) - ox}px`
      el.style.height = `${Math.ceil(maxY + pad) - oy}px`
      for (const b of blobs) {
        const k = Math.max(0, b.r) / BASE_R
        b.el.style.transform =
          k < 0.005
            ? 'scale(0)'
            : `translate(${(b.x - ox).toFixed(2)}px,${(b.y - oy).toFixed(2)}px) scale(${(k * b.sx).toFixed(3)},${(k * b.sy).toFixed(3)})`
      }
    },
    destroy() {
      el.remove()
      lease.release()
    },
  }
}

// ---- shared escape layer --------------------------------------------------------

interface EscapeShared {
  overlay: GoopOverlay
  fluid: ParticleFluid
  vanish: number
  refs: number
  tick: (dt: number) => boolean
}
const shared = new WeakMap<Document, EscapeShared>()

export interface EscapeLease {
  /** Spawn a particle in PAGE coordinates. Its `vanish` is overridden by the overlay's filter. */
  spawn(p: ParticleSpawn): boolean
  /** Room left under the overlay + global caps. */
  room(): number
  release(): void
}

/** Max particles in the shared overlay (all escape-mode elements together). */
export const ESCAPE_MAX_PARTICLES = 200

export function acquireEscapeLayer(
  doc: Document,
  factory: GoopOverlayFactory = createSvgOverlay,
  params: GooFilterParams = { blur: GOOP_DEFAULTS.blur, contrast: GOOP_DEFAULTS.contrast, threshold: GOOP_DEFAULTS.threshold },
): EscapeLease {
  let s = shared.get(doc)
  if (!s) {
    const overlay = factory(doc, params)
    const fluid = new ParticleFluid((c) => overlay.createBlob(c), ESCAPE_MAX_PARTICLES)
    const win = doc.defaultView
    const st: EscapeShared = {
      overlay,
      fluid,
      vanish: gooVanishRadius(params),
      refs: 0,
      tick: (dt) => {
        const sx = win?.scrollX ?? 0
        const sy = win?.scrollY ?? 0
        const vw = win?.innerWidth ?? 1e5
        const vh = win?.innerHeight ?? 1e5
        // Anything far off-screen drains fast instead of simulating forever.
        const live = fluid.step(dt, { minX: sx - 300, minY: sy - 300, maxX: sx + vw + 300, maxY: sy + vh + 300 }, sx, sy)
        overlay.flush()
        return live
      },
    }
    shared.set(doc, st)
    s = st
  }
  const st = s
  st.refs++
  let live = true
  return {
    spawn(p) {
      if (!live) return false
      const ok = st.fluid.spawn({ ...p, vanish: st.vanish })
      if (ok) wakeTicker(st.tick)
      return ok
    },
    room() {
      return st.fluid.room()
    },
    release() {
      if (!live) return
      live = false
      if (--st.refs > 0) return
      removeTicker(st.tick)
      st.fluid.clear()
      st.overlay.destroy()
      shared.delete(doc)
    },
  }
}

/** For tests / devtools: refs on the document's escape layer (0 = none). */
export function escapeLayerRefs(doc: Document): number {
  return shared.get(doc)?.refs ?? 0
}

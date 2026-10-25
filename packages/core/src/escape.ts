// Escape-mode splash: ONE shared particle fluid per document that splash/shockwave particles
// hand off to so they can fly across the page. Particles live in PAGE coordinates (scrolling
// carries them with the content) and are drawn through the shared page overlay
// (`acquireGoopOverlay`, renderers/overlay.ts) in viewport coordinates, so they render with
// whichever renderer the overlay uses ('canvas' by default, 'svg' available). Overlays are
// per color, so each goo color gets its own overlay reference while particles of every color
// still share one simulation. Ref-counted: the last release tears everything down.

import { GOOP_DEFAULTS } from './constants'
import { gooVanishRadius, type GooFilterParams } from './filter'
import { ParticleFluid, type ParticleSpawn } from './fluid'
import { removeTicker, wakeTicker } from './loop'
import { PuddleSet } from './puddles'
import { acquireGoopOverlay, type GoopOverlay } from './renderers/overlay'
import type { GoopRendererOption } from './renderers/resolve'

/** Max particles in the shared escape fluid (all escape-mode elements together). */
export const ESCAPE_MAX_PARTICLES = 200

interface EscapeShared {
  fluid: ParticleFluid
  overlays: Map<string, GoopOverlay>
  vanish: number
  /** Puddle life (s) at the viewport bottom; 0 = drops just drain mid-air. */
  puddleLife: number
  puddles: PuddleSet
  refs: number
  tick: (dt: number) => boolean
}
const shared = new WeakMap<Document, EscapeShared>()

export interface EscapeOptions {
  /** Renderer for the page overlay. Default 'canvas'. */
  renderer?: GoopRendererOption
  /** Filter params (blur/contrast/threshold) for the overlay. Default GOOP_DEFAULTS. */
  params?: GooFilterParams
  /** Pool drops at the viewport bottom for this many seconds (any acquirer can turn it on). */
  puddleLife?: number
}

export interface EscapeLease {
  /** Spawn a particle in PAGE coordinates (its `color` picks the overlay). */
  spawn(p: ParticleSpawn): boolean
  /** Room left under the escape + global caps. */
  room(): number
  release(): void
}

/** Join the document's shared escape fluid (created on first use). */
export function acquireEscapeLayer(doc: Document, options: EscapeOptions = {}): EscapeLease {
  let s = shared.get(doc)
  if (!s) {
    const params = options.params ?? {
      blur: GOOP_DEFAULTS.blur,
      contrast: GOOP_DEFAULTS.contrast,
      threshold: GOOP_DEFAULTS.threshold,
    }
    const overlays = new Map<string, GoopOverlay>()
    const overlayFor = (color: string): GoopOverlay => {
      let o = overlays.get(color)
      if (!o) {
        o = acquireGoopOverlay(doc, { renderer: options.renderer ?? 'canvas', color: color || undefined, params })
        overlays.set(color, o)
      }
      return o
    }
    const fluid = new ParticleFluid((c) => overlayFor(c ?? '').createBlob(), ESCAPE_MAX_PARTICLES)
    const puddles = new PuddleSet((c) => overlayFor(c ?? '').createBlob())
    const win = doc.defaultView
    const st: EscapeShared = {
      fluid,
      overlays,
      vanish: gooVanishRadius(params),
      puddleLife: options.puddleLife ?? 0,
      puddles,
      refs: 0,
      tick: (dt) => {
        const sx = win?.scrollX ?? 0
        const sy = win?.scrollY ?? 0
        const vw = win?.innerWidth ?? 1e5
        const vh = win?.innerHeight ?? 1e5
        if (st.puddleLife > 0) {
          // Floor = the viewport bottom (page coordinates).
          fluid.floor = sy + vh - 2
          fluid.onLand = (l) =>
            puddles.add({ x: l.x, floor: l.y, r: l.r, vx: l.vx, vanish: l.vanish, life: st.puddleLife, color: l.color }, sx, sy)
        } else {
          fluid.floor = undefined
          fluid.onLand = null
        }
        // Anything far off-screen drains fast instead of simulating forever.
        const live = fluid.step(dt, { minX: sx - 300, minY: sy - 300, maxX: sx + vw + 300, maxY: sy + vh + 300 }, sx, sy)
        const pooling = puddles.step(dt, sx, sy)
        for (const o of overlays.values()) o.flush()
        return live || pooling
      },
    }
    shared.set(doc, st)
    s = st
  }
  const st = s
  if ((options.puddleLife ?? 0) > 0) st.puddleLife = Math.max(st.puddleLife, options.puddleLife!)
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
      st.puddles.clear()
      for (const o of st.overlays.values()) o.release()
      st.overlays.clear()
      shared.delete(doc)
    },
  }
}

/** For tests / devtools: refs on the document's escape layer (0 = none). */
export function escapeLayerRefs(doc: Document): number {
  return shared.get(doc)?.refs ?? 0
}

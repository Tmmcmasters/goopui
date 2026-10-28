// Shared runner for small goo toggles (checkbox, radio group): one aria-hidden goo layer on the
// host, a ticker on the shared rAF loop advancing toggle progress `t`, live reduced motion,
// ResizeObserver, and the host's `data-goop-pending` attribute (set while the real mark, e.g.
// the check icon, should stay hidden because the goo hasn't settled yet).
//
// The component supplies the pose: each frame is a pure function of `t`, so reduced motion,
// first paint and every animation frame agree.

import type { GooFilterParams } from './filter'
import { removeTicker, wakeTicker, type Ticker } from './loop'
import { isReducedMotion, watchReducedMotion } from './reduced-motion'
import type { GoopBlob, GoopBodyTransform, GoopLayerPadding, GoopRenderer } from './renderer'
import { resolveRenderer, type GoopRendererOption } from './renderers/resolve'
import type { GooCircle } from './liquid'

/** Host attribute present while the real mark should stay hidden (the goo is still landing). */
export const GOO_PENDING_ATTR = 'data-goop-pending'

/** One drawn frame. */
export interface GooToggleFrame {
  /** Exactly `circles` circles (r = 0 hides one). */
  circles: GooCircle[]
  /** The layer's body (a goo copy of the host's own box) or null to hide it. */
  body: GoopBodyTransform | null
  /** True while the real mark should stay hidden. */
  pending: boolean
}

export interface GooToggleSpec {
  /** Value for the layer's --goop-color. */
  color: string
  /** Value of the layer's `data-goop-part` attribute (for tests / styling). */
  part: string
  /** Number of circles drawn every frame. */
  circles: number
  /** Re-measure the host; returns the filter params and the room the goo needs around it. */
  layout(): { params: GooFilterParams; padding: GoopLayerPadding }
  /** The pose at progress `t` (or the resting pose when `reduced`). */
  frame(t: number, reduced: boolean): GooToggleFrame
  /** Progress at which the current toggle has settled. */
  end(): number
  /** Seconds per unit of progress. */
  duration(): number
  speed(): number
  renderer(): GoopRendererOption | undefined
  reducedMotion(): boolean | 'auto' | undefined
}

export interface GooToggleRunner {
  /** Progress of the current toggle. */
  readonly t: number
  readonly reduced: boolean
  readonly running: boolean
  /** Start a new toggle at t = 0 (or jump to its end under reduced motion). */
  restart(): void
  /** Clamp t into the current toggle (after effects / feel change) and redraw. */
  refresh(): void
  /** Re-create the layer (renderer or softness changed). */
  rebuild(): void
  resize(): void
  destroy(): void
}

const sameParams = (a: GooFilterParams, b: GooFilterParams): boolean =>
  a.blur === b.blur && a.contrast === b.contrast && a.threshold === b.threshold

export function createGooToggle(host: HTMLElement, spec: GooToggleSpec): GooToggleRunner {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let layer: GoopRenderer | null = null
  let blobs: GoopBlob[] = []
  let params: GooFilterParams | null = null
  let t = spec.end()
  let destroyed = false

  const readReduced = (): boolean => {
    const o = spec.reducedMotion()
    return o === true || (o !== false && isReducedMotion(doc))
  }
  let reduced = readReduced()

  const draw = (): void => {
    if (!layer) return
    const f = spec.frame(reduced ? spec.end() : t, reduced)
    for (let i = 0; i < blobs.length; i++) {
      const c = f.circles[i]
      if (c) blobs[i]!.set(c.x, c.y, c.r, 1, c.sx, c.sy)
      else blobs[i]!.set(0, 0, 0)
    }
    if (f.body) {
      if (layer.setBodyTransform) layer.setBodyTransform(f.body)
      else layer.setBodyScale(f.body.sx, f.body.sy)
    } else layer.setBodyScale(0, 0)
    host.toggleAttribute(GOO_PENDING_ATTR, f.pending)
    layer.flush()
  }

  const teardown = (): void => {
    for (const b of blobs) b.remove()
    blobs = []
    layer?.destroy()
    layer = null
  }

  const build = (): void => {
    teardown()
    const l = spec.layout()
    params = l.params
    layer = resolveRenderer(spec.renderer())(host, l.params)
    layer.layer.style.setProperty('--goop-color', spec.color)
    layer.layer.setAttribute('data-goop-part', spec.part)
    layer.setBodyScale(0, 0)
    layer.setPadding(l.padding)
    blobs = Array.from({ length: spec.circles }, () => layer!.createBlob())
    draw()
  }

  const resize = (): void => {
    if (destroyed || !layer) return
    const l = spec.layout()
    if (!params || !sameParams(l.params, params)) {
      params = l.params
      layer.setParams(l.params)
    }
    layer.setPadding(l.padding)
    draw()
  }

  const shouldRun = (): boolean => !destroyed && !reduced && t < spec.end()
  const tick: Ticker = (dt) => {
    if (!shouldRun()) return false
    t = Math.min(spec.end(), t + (dt * Math.max(0.05, spec.speed())) / Math.max(0.01, spec.duration()))
    draw()
    return t < spec.end()
  }
  const sync = (): void => {
    if (shouldRun()) wakeTicker(tick)
    else removeTicker(tick)
  }

  const prevIsolation = host.style.isolation
  const prevPosition = host.style.position
  if (win?.getComputedStyle(host).position === 'static') host.style.position = 'relative'
  host.style.isolation = 'isolate'

  build()

  const RO = win?.ResizeObserver
  const ro = RO ? new RO(() => resize()) : undefined
  ro?.observe(host)
  const unwatch = watchReducedMotion(doc, () => {
    reduced = readReduced()
    if (reduced) t = spec.end()
    draw()
    sync()
  })

  return {
    get t() {
      return t
    },
    get reduced() {
      return reduced
    },
    get running() {
      return shouldRun()
    },
    restart() {
      if (destroyed) return
      reduced = readReduced()
      t = reduced ? spec.end() : 0
      draw()
      sync()
    },
    refresh() {
      if (destroyed) return
      reduced = readReduced()
      t = reduced ? spec.end() : Math.min(t, spec.end())
      if (layer) resize()
      sync()
    },
    rebuild() {
      if (destroyed) return
      build()
      sync()
    },
    resize,
    destroy() {
      if (destroyed) return
      destroyed = true
      removeTicker(tick)
      ro?.disconnect()
      unwatch()
      teardown()
      host.removeAttribute(GOO_PENDING_ATTR)
      host.style.isolation = prevIsolation
      host.style.position = prevPosition
    },
  }
}

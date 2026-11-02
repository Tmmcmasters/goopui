// Renderer seam. The sim only talks to `GoopRenderer`; the SVG-filter implementation below
// is the only one today. A canvas metaball renderer could implement the same interface.
//
// Coordinates passed to blobs are in the HOST's border-box space (0,0 = host top-left,
// y grows down), regardless of how the renderer pads its own drawing surface.

import { acquireGooFilter, createOilFilter, type GooFilterLease, type GooFilterParams, type OilFilter } from './filter'
import { isMovingGooHost, watchPageEdge, type PageEdgeCut } from './page-edge'
import { readFinish, type GoopFinish, type GoopFinishRenderer } from './renderers/finish'

export interface GoopLayerPadding {
  /** Extra room left/right/top of the host (px). */
  side: number
  /** Extra room below the host (px), for hanging and falling drips. */
  bottom: number
}

/** Body pose around the body's center: translate(tx, ty), then skewX(skew deg), then scale(sx, sy). */
export interface GoopBodyTransform {
  tx: number
  ty: number
  skew: number
  sx: number
  sy: number
}

/** Per-frame film state the sim computes from pointer motion. */
export interface GoopSheen {
  /** Accumulated band offset in px (flows with pointer motion and position). */
  phase: number
  /** 0..~2: how hard the film swirls (pointer speed). */
  swirl: number
  /** Pointer velocity px/s, only non-zero when --goop-oil-react > 0 (film follows the mouse). */
  vx: number
  vy: number
  /** Optional: body translation (px) so the film rides the goo's own jelly motion. */
  ox?: number
  oy?: number
}

/** One round goo primitive (a drip bulb, neck segment, or drop). */
export interface GoopBlob {
  /** Center (x, y) in host space, radius r (px). sx/sy stretch the circle (default 1). */
  set(x: number, y: number, r: number, opacity?: number, sx?: number, sy?: number): void
  remove(): void
}

export interface GoopRenderer {
  /** The aria-hidden element the renderer draws into (already inserted into the host). */
  readonly layer: HTMLElement
  setParams(params: GooFilterParams): void
  setPadding(padding: GoopLayerPadding): void
  /** Scale the body shape around its center. */
  setBodyScale(sx: number, sy: number): void
  /** Optional, additive: full body pose (jelly lean / skew / squash). When a renderer omits
   *  it, the sim falls back to setBodyScale(sx, sy) and drops translate/skew. */
  setBodyTransform?(t: GoopBodyTransform): void
  /** Optional, additive: per-frame sheen flow for the 'oil' finish (ignored when solid). */
  setSheen?(sheen: GoopSheen): void
  createBlob(): GoopBlob
  /** Called once per sim frame after all blobs are set (a canvas renderer draws here). */
  flush(): void
  destroy(): void
}

export type GoopRendererFactory = (host: HTMLElement, params: GooFilterParams) => GoopRenderer

/** Attribute markers so adapters/tests can find the parts. */
export const GOOP_PART_ATTR = 'data-goop'

/** Blob elements are this radius (px) at scale 1; they're scaled via transform. */
const BASE_R = 10

const fmt = (n: number): string => (Math.round(n * 100) / 100).toString()

/** How far past its box the goo filter draws, as a fraction of the box (GOO_FILTER_REGION). */
const FILTER_REACH = 0.2

/**
 * SVG-filter renderer: plain <span>s (valid inside <button>) styled as a rounded body and
 * circles, inside a goo box with `filter: url(#goo)` inside the layer. Only transform/opacity
 * change per frame.
 */
/** Oil film band size (px per color cycle) at --goop-oil-scale: 1. */
const OIL_BAND_PX = 34

export function createSvgFilterRenderer(
  host: HTMLElement,
  params: GooFilterParams,
): GoopRenderer & Required<Pick<GoopFinishRenderer, 'setFinish'>> & { setSheen(s: GoopSheen): void } {
  const doc = host.ownerDocument
  let lease: GooFilterLease = acquireGooFilter(doc, params)

  const span = (part: string, css: string): HTMLSpanElement => {
    const s = doc.createElement('span')
    s.setAttribute(GOOP_PART_ATTR, part)
    s.style.cssText = css
    return s
  }

  const fill = 'background:var(--goop-color,currentColor);'
  // z-index:-1 + host isolation:isolate puts the goo under the host's real content but
  // above the host's own background.
  const layer = span(
    'layer',
    'position:absolute;display:block;pointer-events:none;overflow:visible;z-index:-1;' +
      'border-radius:inherit;box-sizing:border-box;margin:0;padding:0;border:0;',
  )
  layer.setAttribute('aria-hidden', 'true')
  // The filtered box. It is never the element that clips: Chromium cuts a filtered element's
  // output at its own border box when it has overflow:clip (overflow-clip-margin ignored), so
  // the page-edge clip sits on the unfiltered layer around it instead.
  const gooBox = span('goo', 'position:absolute;display:block;border-radius:inherit;')
  const body = span(
    'body',
    `position:absolute;display:block;border-radius:inherit;transform-origin:50% 50%;${fill}`,
  )
  // Zero-size origin pinned to the host's top-left; blobs are positioned relative to it.
  const origin = span('drips', 'position:absolute;display:block;width:0;height:0;')
  gooBox.append(body, origin)
  layer.append(gooBox)
  gooBox.style.filter = `url(#${lease.id})`
  host.append(layer)

  let oil: OilFilter | null = null
  // Goo box: always `pad` past the host on each side. Near the page edge (page-edge.ts) the
  // layer around it is cut: its far side ends `cut` px past the host (at the page edge) and
  // it clips, so no goo grows the page. Overflow clips both sides of an axis, so its near
  // sides move out by the filter's reach: only goo past the page edge is ever cut.
  let pad: GoopLayerPadding = { side: 0, bottom: 0 }
  let cut: PageEdgeCut = { right: null, bottom: null }
  const placeLayer = (pending = false): void => {
    const { side, bottom } = pad
    const clipped = cut.right !== null || cut.bottom !== null
    // The filter region reaches FILTER_REACH of the goo box past it (GOO_FILTER_REGION).
    const mx = cut.right === null ? 0 : Math.ceil(FILTER_REACH * boxW()) + 2
    const my = cut.bottom === null ? 0 : Math.ceil(FILTER_REACH * boxH()) + 2
    const right = cut.right ?? side
    const below = cut.bottom ?? bottom
    layer.style.top = `${-side - my}px`
    layer.style.left = `${-side - mx}px`
    layer.style.right = `${-right}px`
    layer.style.bottom = `${-below}px`
    gooBox.style.top = `${my}px`
    gooBox.style.left = `${mx}px`
    gooBox.style.right = `${right - side}px`
    gooBox.style.bottom = `${below - bottom}px`
    body.style.top = `${side}px`
    body.style.left = `${side}px`
    body.style.right = `${side}px`
    body.style.bottom = `${bottom}px`
    origin.style.left = `${side}px`
    origin.style.top = `${side}px`
    layer.style.overflowX = cut.right === null ? '' : 'clip'
    layer.style.overflowY = cut.bottom === null ? '' : 'clip'
    if (!pending && clipped) {
      // overflow clips to the rounded box: square the layer and give the goo box the host's
      // corners directly (it normally inherits them through the layer).
      layer.style.borderRadius = '0'
      gooBox.style.borderRadius = doc.defaultView?.getComputedStyle(host).borderRadius ?? ''
    } else {
      layer.style.borderRadius = 'inherit'
      gooBox.style.borderRadius = 'inherit'
    }
  }
  const boxW = (): number => host.offsetWidth + pad.side * 2
  const boxH = (): number => host.offsetHeight + pad.side + pad.bottom
  const edge = watchPageEdge({
    host,
    reach: () => ({ right: pad.side + FILTER_REACH * boxW(), bottom: pad.bottom + FILTER_REACH * boxH() }),
    apply(next, pending) {
      cut = next
      placeLayer(pending)
    },
  })
  const setPadding = (p: GoopLayerPadding): void => {
    const grew = p.side > pad.side || p.bottom > pad.bottom
    pad = { side: p.side, bottom: p.bottom }
    placeLayer()
    edge.refresh(grew)
  }
  setPadding({ side: 0, bottom: 0 })
  let lastSpawn = 0
  const moving = isMovingGooHost(host)

  let bodyTransform = ''

  // ---- oil finish ----
  let goo = params
  let finish: GoopFinish = readFinish(host, { finish: 'solid' })
  const isDark = (): boolean => {
    const c = doc.defaultView?.getComputedStyle(body).backgroundColor ?? ''
    const m = c.match(/[\d.]+/g)
    if (!m || m.length < 3) return true
    const [r, g, b] = m.map(Number) as [number, number, number]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140
  }
  const oilParams = () => ({ intensity: finish.oilIntensity, scale: OIL_BAND_PX * finish.oilBandSize, dark: isDark() })
  const syncFilter = (): void => {
    if (finish.finish === 'oil') {
      if (!oil) oil = createOilFilter(doc, goo, oilParams())
      oil.setBox(gooBox.offsetWidth, gooBox.offsetHeight)
      gooBox.style.filter = `url(#${oil.id})`
    } else {
      oil?.release()
      oil = null
      gooBox.style.filter = `url(#${lease.id})`
    }
  }

  return {
    layer,
    setParams(next) {
      goo = next
      const nextLease = acquireGooFilter(doc, next)
      lease.release()
      lease = nextLease
      if (oil) {
        // Blur/threshold are baked into the oil filter: rebuild it.
        oil.release()
        oil = null
      }
      syncFilter()
    },
    setPadding(p) {
      setPadding(p)
      if (oil) oil.setBox(gooBox.offsetWidth, gooBox.offsetHeight)
    },
    setFinish(overrides) {
      // JS overrides < host --goop-finish / --goop-oil-* vars < defaults (renderers/finish.ts).
      finish = readFinish(host, overrides)
      if (oil && finish.finish === 'oil') oil.setFinish(oilParams())
      syncFilter()
    },
    setSheen({ phase, swirl, ox = 0, oy = 0 }) {
      // --goop-oil-shift offsets film thickness by whole color cycles.
      oil?.setFlow(phase + finish.oilHueShift * 2 * OIL_BAND_PX * finish.oilBandSize, swirl, ox, oy)
    },
    setBodyScale(sx, sy) {
      const t = sx === 1 && sy === 1 ? '' : `scale(${sx.toFixed(4)},${sy.toFixed(4)})`
      if (t === bodyTransform) return
      bodyTransform = t
      body.style.transform = t
    },
    setBodyTransform({ tx, ty, skew, sx, sy }) {
      const parts: string[] = []
      if (Math.abs(tx) > 0.005 || Math.abs(ty) > 0.005) parts.push(`translate(${fmt(tx)}px,${fmt(ty)}px)`)
      if (Math.abs(skew) > 0.01) parts.push(`skewX(${skew.toFixed(2)}deg)`)
      if (sx !== 1 || sy !== 1) parts.push(`scale(${sx.toFixed(4)},${sy.toFixed(4)})`)
      const t = parts.join(' ')
      if (t === bodyTransform) return
      bodyTransform = t
      body.style.transform = t
    },
    createBlob() {
      // Goo is spawning: the host may have moved since the last cut.
      const now = Date.now()
      if (now - lastSpawn > 250) {
        lastSpawn = now
        edge.refresh()
      }
      const el = span(
        'blob',
        `position:absolute;display:block;left:${-BASE_R}px;top:${-BASE_R}px;width:${BASE_R * 2}px;` +
          `height:${BASE_R * 2}px;border-radius:50%;transform:scale(0);${fill}`,
      )
      origin.append(el)
      let lastT = 'scale(0)'
      let lastO = 1
      return {
        set(x, y, r, opacity = 1, sx = 1, sy = 1) {
          const k = Math.max(0, r) / BASE_R
          const t = k < 0.005 ? 'scale(0)' : `translate(${fmt(x)}px,${fmt(y)}px) scale(${(k * sx).toFixed(3)},${(k * sy).toFixed(3)})`
          if (t !== lastT) {
            el.style.transform = t
            lastT = t
          }
          const o = Math.round(Math.max(0, Math.min(1, opacity)) * 1000) / 1000
          if (o !== lastO) {
            el.style.opacity = o === 1 ? '' : String(o)
            lastO = o
          }
        },
        remove() {
          el.remove()
        },
      }
    },
    flush() {
      if (moving) edge.track()
    },
    destroy() {
      edge.release()
      layer.remove()
      lease.release()
      oil?.release()
      oil = null
    },
  }
}

// Renderer seam. The sim only talks to `GoopRenderer`; the SVG-filter implementation below
// is the only one today. A canvas metaball renderer could implement the same interface.
//
// Coordinates passed to blobs are in the HOST's border-box space (0,0 = host top-left,
// y grows down), regardless of how the renderer pads its own drawing surface.

import { acquireGooFilter, type GooFilterLease, type GooFilterParams } from './filter'

export interface GoopLayerPadding {
  /** Extra room left/right/top of the host (px). */
  side: number
  /** Extra room below the host (px), for hanging and falling drips. */
  bottom: number
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

/**
 * SVG-filter renderer: plain <span>s (valid inside <button>) styled as a rounded body and
 * circles, inside a layer with `filter: url(#goo)`. Only transform/opacity change per frame.
 */
export function createSvgFilterRenderer(host: HTMLElement, params: GooFilterParams): GoopRenderer {
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
  const body = span(
    'body',
    `position:absolute;display:block;border-radius:inherit;transform-origin:50% 50%;${fill}`,
  )
  // Zero-size origin pinned to the host's top-left; blobs are positioned relative to it.
  const origin = span('drips', 'position:absolute;display:block;width:0;height:0;')
  layer.append(body, origin)
  layer.style.filter = `url(#${lease.id})`
  host.append(layer)

  const setPadding = ({ side, bottom }: GoopLayerPadding): void => {
    const s = `${-side}px`
    layer.style.top = s
    layer.style.left = s
    layer.style.right = s
    layer.style.bottom = `${-bottom}px`
    body.style.top = `${side}px`
    body.style.left = `${side}px`
    body.style.right = `${side}px`
    body.style.bottom = `${bottom}px`
    origin.style.left = `${side}px`
    origin.style.top = `${side}px`
  }
  setPadding({ side: 0, bottom: 0 })

  let bodyTransform = ''

  return {
    layer,
    setParams(next) {
      const nextLease = acquireGooFilter(doc, next)
      lease.release()
      lease = nextLease
      layer.style.filter = `url(#${lease.id})`
    },
    setPadding,
    setBodyScale(sx, sy) {
      const t = sx === 1 && sy === 1 ? '' : `scale(${sx.toFixed(4)},${sy.toFixed(4)})`
      if (t === bodyTransform) return
      bodyTransform = t
      body.style.transform = t
    },
    createBlob() {
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
    flush() {},
    destroy() {
      layer.remove()
      lease.release()
    },
  }
}

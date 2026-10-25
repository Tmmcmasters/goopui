// Canvas renderer: same seam as the SVG-filter renderer, drawn with WebGL2 metaballs.
//
// Each instance owns a small 2D <canvas> inside the host (z-index -1, under the content,
// like the SVG layer), so scrolling, clipping, transforms and stacking all behave exactly
// as with the SVG renderer. The GPU work is done by ONE shared WebGL2 context per document
// (see ./shared.ts and ./gl.ts) that renders every dirty instance into an atlas and copies
// each rect out, so a page with 200 buttons still uses one WebGL context.
//
// Fallback: no WebGL2 (or a software rasterizer, or a lost context) -> the instance draws
// the same shapes with Canvas 2D and applies the shared SVG goo filter to its canvas via
// CSS, so it looks like the SVG renderer. When a lost context is restored it switches back.
//
// Look parity with the SVG renderer:
//   color      : `color: var(--goop-color, currentColor)` on the canvas, read via computed style
//   shape      : body = host border box with the host's 4 corner radii; blobs are circles
//   --goop-blur      : Gaussian sigma in css px (identical)
//   --goop-threshold : blurred-alpha level of the edge (identical)
//   --goop-contrast  : edge ramp width = 1/contrast in alpha units (identical) but never
//                      sharper than ~1 device px of analytic AA, so high contrast is smooth
//                      instead of aliased.

import { acquireGooFilter, type GooFilterLease, type GooFilterParams } from '../filter'
import { GOOP_PART_ATTR, type GoopBlob, type GoopLayerPadding, type GoopRenderer, type GoopRendererFactory } from '../renderer'
import type { GlShape } from './gl'
import { acquireCanvasShared, type CanvasBackend, type CanvasInstance, type PreparedItem } from './shared'

export interface CanvasRendererOptions {
  /** 'auto' (default): shared WebGL2, falling back to Canvas 2D. '2d': always Canvas 2D +
   *  SVG filter (mostly for testing / comparison). */
  backend?: 'auto' | '2d'
  /** Use WebGL even on a software rasterizer. Default false (2D fallback instead). */
  allowSoftwareWebGL?: boolean
}

/**
 * Body pose around the body's center: translate(tx, ty) then skewX(skew deg) then
 * scale(sx, sy). Structurally identical to `GoopBodyTransform` on the core-feel branch
 * (`GoopRenderer.setBodyTransform?`), declared here so this file doesn't depend on it.
 */
export interface CanvasBodyPose {
  tx: number
  ty: number
  skew: number
  sx: number
  sy: number
}

/** The canvas renderer: a GoopRenderer that also takes a full body pose. */
export interface CanvasGoopRenderer extends GoopRenderer {
  setBodyTransform(t: CanvasBodyPose): void
}

interface BlobState {
  x: number
  y: number
  r: number
  o: number
  sx: number
  sy: number
}

const parseRadius = (v: string, w: number, h: number): number => {
  const first = v.trim().split(/\s+/)[0] ?? '0'
  const n = Number.parseFloat(first)
  if (!Number.isFinite(n)) return 0
  return first.endsWith('%') ? (n / 100) * Math.min(w, h) : n
}

/** Build a canvas renderer factory with options. `createCanvasRenderer` = defaults. */
export function makeCanvasRenderer(
  options: CanvasRendererOptions = {},
): (host: HTMLElement, params: GooFilterParams) => CanvasGoopRenderer {
  return (host, params) => createCanvasRendererImpl(host, params, options)
}

/** Canvas (WebGL2 metaball, Canvas 2D fallback) renderer with default options. */
export const createCanvasRenderer: (host: HTMLElement, params: GooFilterParams) => CanvasGoopRenderer = (host, params) =>
  createCanvasRendererImpl(host, params, {})

function createCanvasRendererImpl(
  host: HTMLElement,
  initial: GooFilterParams,
  options: CanvasRendererOptions,
): CanvasGoopRenderer {
  const doc = host.ownerDocument
  const win = doc.defaultView
  let params: GooFilterParams = { ...initial }
  const shared = acquireCanvasShared(doc, { allowSoftwareWebGL: options.allowSoftwareWebGL })

  const layer = doc.createElement('span')
  layer.setAttribute(GOOP_PART_ATTR, 'layer')
  layer.setAttribute('aria-hidden', 'true')
  layer.style.cssText =
    'position:absolute;display:block;pointer-events:none;overflow:visible;z-index:-1;' +
    'box-sizing:border-box;margin:0;padding:0;border:0;'
  const canvas = doc.createElement('canvas')
  canvas.setAttribute(GOOP_PART_ATTR, 'canvas')
  // `color` here is only used to resolve --goop-color / currentColor for drawing.
  canvas.style.cssText =
    'position:absolute;inset:0;width:100%;height:100%;display:block;color:var(--goop-color,currentColor);'
  canvas.width = 0
  canvas.height = 0
  layer.append(canvas)
  host.append(layer)

  let ctx: CanvasRenderingContext2D | null | undefined
  const get2d = (): CanvasRenderingContext2D | null => {
    if (ctx === undefined) {
      try {
        ctx = (canvas.getContext('2d') as CanvasRenderingContext2D | null) ?? null
      } catch {
        ctx = null
      }
    }
    return ctx
  }
  let cs: CSSStyleDeclaration | null = null
  const colorString = (): string => {
    cs ??= win?.getComputedStyle(canvas) ?? null
    return cs?.color || 'rgb(0, 0, 0)'
  }

  // ---- geometry -------------------------------------------------------------
  let pad: GoopLayerPadding = { side: 0, bottom: 0 }
  let hostW = host.offsetWidth
  let hostH = host.offsetHeight
  let radii: [number, number, number, number] = [0, 0, 0, 0]
  const readRadii = (): void => {
    const s = win?.getComputedStyle(host)
    if (!s) return
    const lim = Math.min(hostW, hostH) / 2
    const r = (v: string): number => Math.max(0, Math.min(lim, parseRadius(v || '0', hostW, hostH)))
    radii = [r(s.borderTopLeftRadius), r(s.borderTopRightRadius), r(s.borderBottomRightRadius), r(s.borderBottomLeftRadius)]
  }
  readRadii()
  let bodySx = 1
  let bodySy = 1
  let bodyTx = 0
  let bodyTy = 0
  /** tan(skewX). */
  let bodyShear = 0
  const blobs = new Set<BlobState>()
  const bodyVisible = (): boolean => bodySx > 0 && bodySy > 0 && hostW > 0 && hostH > 0
  /** Nothing to draw: lets a big, mostly idle surface (e.g. a page overlay) drop its pixels. */
  const isEmpty = (): boolean => {
    if (bodyVisible()) return false
    for (const b of blobs) if (b.r > 0.005 && b.o > 0) return false
    return true
  }
  const releasePixels = (): null => {
    if (canvas.width || canvas.height) {
      canvas.width = 0
      canvas.height = 0
    }
    return null
  }

  // ---- backend --------------------------------------------------------------
  let backend: CanvasBackend = 'webgl'
  let lease: GooFilterLease | null = null
  const applyFilter = (): void => {
    if (backend === '2d') {
      const next = acquireGooFilter(doc, params)
      lease?.release()
      lease = next
      canvas.style.filter = `url(#${lease.id})`
    } else {
      lease?.release()
      lease = null
      canvas.style.filter = ''
    }
  }

  const inst: CanvasInstance = {
    canvas,
    force2d: options.backend === '2d',
    dirty: true,
    visible: true,
    setBackend(b) {
      backend = b
      layer.setAttribute('data-goop-backend', b)
      applyFilter()
    },
    prepare(dpr, maxSize) {
      const cssW = hostW + pad.side * 2
      const cssH = hostH + pad.side + pad.bottom
      if (cssW <= 0 || cssH <= 0 || isEmpty()) return releasePixels()
      const k = Math.min(dpr, maxSize / cssW, maxSize / cssH)
      const w = Math.max(1, Math.round(cssW * k))
      const h = Math.max(1, Math.round(cssH * k))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      return {
        w,
        h,
        kx: w / cssW,
        ky: h / cssH,
        blur: params.blur,
        threshold: params.threshold,
        contrast: params.contrast,
        color: shared.color(colorString()),
      } satisfies PreparedItem
    },
    collect(out, ox, oy, kx, ky) {
      const k = Math.min(kx, ky)
      const px = (x: number): number => ox + (x + pad.side) * kx
      const py = (y: number): number => oy + (y + pad.side) * ky
      if (bodyVisible()) {
        out.push({
          cx: px(hostW / 2 + bodyTx),
          cy: py(hostH / 2 + bodyTy),
          hx: (hostW / 2) * kx,
          hy: (hostH / 2) * ky,
          tl: radii[0] * k,
          tr: radii[1] * k,
          br: radii[2] * k,
          bl: radii[3] * k,
          sx: bodySx,
          sy: bodySy,
          opacity: 1,
          shear: bodyShear * (kx / ky),
        } satisfies GlShape)
      }
      for (const b of blobs) {
        if (b.r <= 0.005 || b.o <= 0 || b.sx <= 0 || b.sy <= 0) continue
        const r = b.r * k
        out.push({ cx: px(b.x), cy: py(b.y), hx: r, hy: r, tl: r, tr: r, br: r, bl: r, sx: b.sx, sy: b.sy, opacity: b.o, shear: 0 })
      }
    },
    blit(src, x, y, w, h) {
      const c = get2d()
      if (!c) return
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalAlpha = 1
      c.clearRect(0, 0, canvas.width, canvas.height)
      c.drawImage(src, x, y, w, h, 0, 0, w, h)
    },
    draw2d(dpr) {
      const c = get2d()
      const cssW = hostW + pad.side * 2
      const cssH = hostH + pad.side + pad.bottom
      if (!c) return
      if (cssW <= 0 || cssH <= 0 || isEmpty()) {
        releasePixels()
        return
      }
      const w = Math.max(1, Math.round(cssW * dpr))
      const h = Math.max(1, Math.round(cssH * dpr))
      if (canvas.width !== w) canvas.width = w
      if (canvas.height !== h) canvas.height = h
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalAlpha = 1
      c.clearRect(0, 0, w, h)
      c.setTransform(w / cssW, 0, 0, h / cssH, pad.side * (w / cssW), pad.side * (h / cssH))
      c.fillStyle = colorString()
      if (bodyVisible()) {
        c.save()
        c.translate(hostW / 2 + bodyTx, hostH / 2 + bodyTy)
        if (bodyShear) c.transform(1, 0, bodyShear, 1, 0, 0)
        c.scale(bodySx, bodySy)
        roundRectPath(c, -hostW / 2, -hostH / 2, hostW, hostH, radii)
        c.fill()
        c.restore()
      }
      for (const b of blobs) {
        if (b.r <= 0.005 || b.o <= 0) continue
        c.globalAlpha = Math.min(1, b.o)
        c.beginPath()
        c.ellipse(b.x, b.y, b.r * b.sx, b.r * b.sy, 0, 0, Math.PI * 2)
        c.fill()
      }
      c.globalAlpha = 1
    },
  }
  shared.add(inst)

  const invalidate = (): void => shared.invalidate(inst)

  // ---- live inputs the SVG renderer gets for free from CSS ---------------------
  // Size: a ResizeObserver keeps the host box + radii current (no layout reads per frame).
  const RO = win?.ResizeObserver
  const ro = RO
    ? new RO(() => {
        hostW = host.offsetWidth
        hostH = host.offsetHeight
        readRadii()
        invalidate()
      })
    : undefined
  ro?.observe(host)
  // Color: repaint on things that commonly change --goop-color while the sim is idle
  // (hover/focus styles, class/style changes, color transitions).
  let raf = 0
  let transitions = 0
  let transitionUntil = 0
  const now = (): number => win?.performance?.now() ?? Date.now()
  const frame = (): void => {
    raf = 0
    cs = null
    invalidate()
    if (transitions > 0 && now() < transitionUntil) raf = win?.requestAnimationFrame(frame) ?? 0
  }
  const nextFrame = (): void => {
    if (!raf && win?.requestAnimationFrame) raf = win.requestAnimationFrame(frame)
  }
  const onTransitionRun = (): void => {
    transitions++
    transitionUntil = now() + 3000
    nextFrame()
  }
  const onTransitionEnd = (): void => {
    transitions = Math.max(0, transitions - 1)
    nextFrame()
  }
  const hostEvents: [string, EventListener][] = [
    ['pointerenter', nextFrame],
    ['pointerleave', nextFrame],
    ['focusin', nextFrame],
    ['focusout', nextFrame],
    ['transitionrun', onTransitionRun],
    ['transitionend', onTransitionEnd],
    ['transitioncancel', onTransitionEnd],
  ]
  for (const [t, l] of hostEvents) host.addEventListener(t, l)
  const MO = win?.MutationObserver
  const mo = MO ? new MO(nextFrame) : undefined
  mo?.observe(host, { attributes: true, attributeFilter: ['class', 'style', 'data-state', 'data-variant', 'disabled'] })

  let destroyed = false

  return {
    layer,
    setParams(next) {
      params = { ...next }
      if (backend === '2d') applyFilter()
      cs = null
      readRadii()
      invalidate()
    },
    setPadding(p) {
      pad = { side: p.side, bottom: p.bottom }
      layer.style.top = `${-p.side}px`
      layer.style.left = `${-p.side}px`
      layer.style.right = `${-p.side}px`
      layer.style.bottom = `${-p.bottom}px`
      invalidate()
    },
    setBodyScale(sx, sy) {
      if (sx === bodySx && sy === bodySy && !bodyTx && !bodyTy && !bodyShear) return
      bodySx = sx
      bodySy = sy
      bodyTx = 0
      bodyTy = 0
      bodyShear = 0
      inst.dirty = true
    },
    setBodyTransform({ tx, ty, skew, sx, sy }) {
      const shear = Math.tan((skew * Math.PI) / 180)
      if (tx === bodyTx && ty === bodyTy && shear === bodyShear && sx === bodySx && sy === bodySy) return
      bodyTx = tx
      bodyTy = ty
      bodyShear = Number.isFinite(shear) ? shear : 0
      bodySx = sx
      bodySy = sy
      inst.dirty = true
    },
    createBlob(): GoopBlob {
      const b: BlobState = { x: 0, y: 0, r: 0, o: 1, sx: 1, sy: 1 }
      blobs.add(b)
      return {
        set(x, y, r, opacity = 1, sx = 1, sy = 1) {
          b.x = x
          b.y = y
          b.r = Math.max(0, r)
          b.o = Math.max(0, Math.min(1, opacity))
          b.sx = sx
          b.sy = sy
          inst.dirty = true
        },
        remove() {
          if (blobs.delete(b)) inst.dirty = true
        },
      }
    },
    flush() {
      if (inst.dirty) invalidate()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      ro?.disconnect()
      mo?.disconnect()
      for (const [t, l] of hostEvents) host.removeEventListener(t, l)
      if (raf) win?.cancelAnimationFrame(raf)
      shared.remove(inst)
      shared.release()
      lease?.release()
      lease = null
      blobs.clear()
      canvas.width = 0
      canvas.height = 0
      layer.remove()
    },
  }
}

function roundRectPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  [tl, tr, br, bl]: readonly [number, number, number, number],
): void {
  c.beginPath()
  c.moveTo(x + tl, y)
  c.lineTo(x + w - tr, y)
  c.arcTo(x + w, y, x + w, y + tr, tr)
  c.lineTo(x + w, y + h - br)
  c.arcTo(x + w, y + h, x + w - br, y + h, br)
  c.lineTo(x + bl, y + h)
  c.arcTo(x, y + h, x, y + h - bl, bl)
  c.lineTo(x, y + tl)
  c.arcTo(x, y, x + tl, y, tl)
  c.closePath()
}

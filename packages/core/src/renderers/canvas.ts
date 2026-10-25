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
import { isReducedMotion, watchReducedMotion } from '../reduced-motion'
import { readFinish, type GoopFinish } from './finish'
import type { GlOil, GlShape } from './gl'
import { acquireCanvasShared, type CanvasBackend, type CanvasInstance, type PreparedItem } from './shared'

export interface CanvasRendererOptions {
  /** 'auto' (default): shared WebGL2, falling back to Canvas 2D. '2d': always Canvas 2D +
   *  SVG filter (mostly for testing / comparison). */
  backend?: 'auto' | '2d'
  /** Use WebGL even on a software rasterizer. Default false (2D fallback instead). */
  allowSoftwareWebGL?: boolean
  /** Finish overrides (otherwise `--goop-finish` / `--goop-oil-*` on the host). */
  finish?: Partial<GoopFinish>
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
  /** Finish overrides; unspecified fields come from the host's CSS vars, then defaults. */
  setFinish(overrides: Partial<GoopFinish>): void
}

/** 2D-fallback film palette (magenta, gold, green, cyan, violet). */
const OIL_PALETTE: readonly (readonly [number, number, number])[] = [
  [1, 0.25, 0.75],
  [1, 0.78, 0.25],
  [0.3, 0.9, 0.55],
  [0.25, 0.78, 1],
  [0.6, 0.38, 1],
]

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

  // GPU path display: a second canvas with an 'bitmaprenderer' context. Each frame the
  // shared WebGL canvas is cropped with createImageBitmap (a GPU-side snapshot) and handed
  // over with transferFromImageBitmap, so nothing is read back to the CPU. The previous
  // path, drawImage(webglCanvas) into a 2D canvas, makes Chrome stall on ReadPixels whenever
  // that 2D canvas isn't GPU-backed. The 2D canvas stays for the 2D-backend fallback.
  const canBitmap = typeof createImageBitmap === 'function'
  let bmp: HTMLCanvasElement | null = null
  let bctx: ImageBitmapRenderingContext | null = null
  let blitSeq = 0
  let dead = false
  const bitmapCtx = (): ImageBitmapRenderingContext | null => {
    if (!canBitmap) return null
    if (!bmp) {
      bmp = doc.createElement('canvas')
      bmp.setAttribute(GOOP_PART_ATTR, 'canvas-gpu')
      bmp.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;'
      layer.append(bmp)
      try {
        bctx = (bmp.getContext('bitmaprenderer') as ImageBitmapRenderingContext | null) ?? null
      } catch {
        bctx = null
      }
    }
    return bctx
  }
  const hideBitmap = (): void => {
    blitSeq++
    if (bmp) bmp.style.display = 'none'
  }

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
    if (bctx && bmp && bmp.style.display !== 'none') {
      blitSeq++
      bctx.transferFromImageBitmap(null)
    }
    return null
  }

  // ---- finish (oil film) ---------------------------------------------------------
  let finishOverrides: Partial<GoopFinish> = { ...options.finish }
  let finish = readFinish(host, finishOverrides)
  let reduced = isReducedMotion(doc)
  const unwatchReduced = watchReducedMotion(doc, (r) => {
    reduced = r
    invalidate()
  })
  const clock = (): number => win?.performance?.now() ?? Date.now()
  const born = clock()
  /** Pointer state in host css px; velocity in px/s; flow = accumulated noise offset. */
  const ptr = { x: Number.NaN, y: Number.NaN, vx: 0, vy: 0, flowX: 0, flowY: 0, t: 0, inside: false }
  const oilOn = (): boolean => finish.finish === 'oil' && finish.oilIntensity > 0
  const oilFor = (k: number): GlOil | null => {
    if (!oilOn()) return null
    const live = !reduced
    // Pointer coupling is opt-in (--goop-oil-react); by default the film ignores the mouse,
    // drifts slowly on its own (shader time) and uses a fixed top-left key light.
    const react = live ? finish.oilReact : 0
    const speed = react > 0 ? Math.hypot(ptr.vx, ptr.vy) : 0
    const stretch = Math.min(1.2, speed / 900) * react
    const hasPtr = react > 0 && ptr.inside && Number.isFinite(ptr.x)
    return {
      intensity: finish.oilIntensity,
      scale: finish.oilScale,
      shift: finish.oilShift,
      time: live ? (clock() - born) / 1000 : 0,
      flowX: react > 0 ? ptr.flowX * react : 0,
      flowY: react > 0 ? ptr.flowY * react : 0,
      stretchX: speed > 1 ? (ptr.vx / speed) * stretch : 0,
      stretchY: speed > 1 ? (ptr.vy / speed) * stretch : 0,
      lightX: hasPtr ? ptr.x + pad.side : pad.side + hostW * 0.3,
      lightY: hasPtr ? ptr.y + pad.side : pad.side - 24,
      k,
      pointer: hasPtr ? Math.min(1, react) : 0,
    }
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
      // The 2D canvas only needs pixels when it is the display (no bitmap path).
      if (!bitmapCtx()) {
        if (canvas.width !== w) canvas.width = w
        if (canvas.height !== h) canvas.height = h
      }
      return {
        w,
        h,
        kx: w / cssW,
        ky: h / cssH,
        blur: params.blur,
        threshold: params.threshold,
        contrast: params.contrast,
        color: shared.color(colorString()),
        oil: oilFor(w / cssW),
        gloss: params.gloss ?? 0,
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
      const b = bitmapCtx()
      if (b && bmp) {
        if (canvas.width || canvas.height) {
          canvas.width = 0
          canvas.height = 0
        }
        bmp.style.display = 'block'
        const seq = ++blitSeq
        createImageBitmap(src, x, y, w, h).then(
          (img) => {
            // A newer frame (or teardown) superseded this one: drop it.
            if (seq !== blitSeq || dead) img.close()
            else b.transferFromImageBitmap(img)
          },
          () => {},
        )
        return
      }
      const c = get2d()
      if (!c) return
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.globalAlpha = 1
      c.clearRect(0, 0, canvas.width, canvas.height)
      c.drawImage(src, x, y, w, h, 0, 0, w, h)
    },
    draw2d(dpr) {
      hideBitmap()
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
      const oil = oilFor(1)
      c.fillStyle = oil ? oilGradient(c, shared.color(colorString()), oil, hostW, hostH) : colorString()
      if (bodyVisible()) {
        c.save()
        c.translate(hostW / 2 + bodyTx, hostH / 2 + bodyTy)
        if (bodyShear) c.transform(1, 0, bodyShear, 1, 0, 0)
        c.scale(bodySx, bodySy)
        roundRectPath(c, -hostW / 2, -hostH / 2, hostW, hostH, radii)
        c.restore() // path keeps the body transform; fill (gradient) in host space
        c.fill()
      }
      for (const b of blobs) {
        if (b.r <= 0.005 || b.o <= 0) continue
        c.globalAlpha = Math.min(1, b.o)
        c.beginPath()
        c.ellipse(b.x, b.y, b.r * b.sx, b.r * b.sy, 0, 0, Math.PI * 2)
        c.fill()
      }
      c.globalAlpha = 1
      const gloss = params.gloss ?? 0
      if (gloss > 0 && !oil) {
        // 2D fallback wet look: a soft top-left highlight clipped to the goo.
        const r = Math.min(hostW, hostH) * 0.7
        const g = c.createRadialGradient(hostW * 0.28, hostH * 0.18, 0, hostW * 0.28, hostH * 0.18, r)
        g.addColorStop(0, `rgba(255,255,255,${(0.28 * gloss).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        c.globalCompositeOperation = 'source-atop'
        c.fillStyle = g
        c.fillRect(-pad.side, -pad.side, cssW, cssH)
        c.globalCompositeOperation = 'source-over'
      }
      if (oil) {
        // Soft specular, clipped to the goo already drawn (the SVG filter keeps it).
        const lx = oil.lightX - pad.side
        const ly = oil.lightY - pad.side
        const r = Math.min(hostW, hostH) * 0.55
        const sy = Math.max(r * 0.4, Math.min(hostH * 0.3, ly + 24))
        const g = c.createRadialGradient(lx, sy, 0, lx, sy, r)
        g.addColorStop(0, `rgba(255,255,255,${(0.3 * oil.intensity).toFixed(3)})`)
        g.addColorStop(1, 'rgba(255,255,255,0)')
        c.globalCompositeOperation = 'source-atop'
        c.fillStyle = g
        c.fillRect(-pad.side, -pad.side, cssW, cssH)
        c.globalCompositeOperation = 'source-over'
      }
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
    finish = readFinish(host, finishOverrides)
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
  // Pointer flow for the oil film: bands drift with the pointer and stretch along its
  // velocity. A small rAF loop runs only while an oil instance is hovered or coasting.
  let sheenRaf = 0
  let sheenLast = 0
  const sheen = (t: number): void => {
    sheenRaf = 0
    const dt = sheenLast ? Math.min(0.05, (t - sheenLast) / 1000) : 1 / 60
    sheenLast = t
    const decay = Math.exp(-dt * (ptr.inside ? 3 : 5))
    ptr.vx *= decay
    ptr.vy *= decay
    ptr.flowX -= ptr.vx * dt * 0.12
    ptr.flowY -= ptr.vy * dt * 0.12
    invalidate()
    if (oilOn() && !reduced && (ptr.inside || Math.hypot(ptr.vx, ptr.vy) > 4)) sheenRaf = win?.requestAnimationFrame(sheen) ?? 0
    else sheenLast = 0
  }
  const wakeSheen = (): void => {
    if (!sheenRaf && oilOn() && !reduced && finish.oilReact > 0 && win?.requestAnimationFrame)
      sheenRaf = win.requestAnimationFrame(sheen)
  }
  const onPointerMove = (e: PointerEvent): void => {
    if (!oilOn() || reduced || finish.oilReact <= 0) return
    const rect = host.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const x = ((e.clientX - rect.left) / rect.width) * hostW
    const y = ((e.clientY - rect.top) / rect.height) * hostH
    const t = e.timeStamp || clock()
    if (Number.isFinite(ptr.x) && ptr.t && t > ptr.t) {
      const dt = Math.max(0.008, (t - ptr.t) / 1000)
      ptr.vx += ((x - ptr.x) / dt - ptr.vx) * 0.35
      ptr.vy += ((y - ptr.y) / dt - ptr.vy) * 0.35
    }
    ptr.x = x
    ptr.y = y
    ptr.t = t
    ptr.inside = true
    wakeSheen()
  }
  const onPointerOut = (): void => {
    ptr.inside = false
    ptr.t = 0
    wakeSheen()
  }
  hostEvents.push(['pointermove', onPointerMove as EventListener], ['pointerleave', onPointerOut])
  host.addEventListener('pointermove', onPointerMove as EventListener)
  host.addEventListener('pointerleave', onPointerOut)

  const MO = win?.MutationObserver
  const mo = MO ? new MO(nextFrame) : undefined
  mo?.observe(host, { attributes: true, attributeFilter: ['class', 'style', 'data-state', 'data-variant', 'disabled'] })

  let destroyed = false

  return {
    layer,
    setFinish(overrides) {
      finishOverrides = { ...finishOverrides, ...overrides }
      finish = readFinish(host, finishOverrides)
      invalidate()
    },
    setParams(next) {
      params = { ...next }
      finish = readFinish(host, finishOverrides)
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
      if (sheenRaf) win?.cancelAnimationFrame(sheenRaf)
      unwatchReduced()
      shared.remove(inst)
      shared.release()
      lease?.release()
      lease = null
      blobs.clear()
      dead = true
      blitSeq++
      canvas.width = 0
      canvas.height = 0
      layer.remove()
    },
  }
}

/** 2D fallback film: a diagonal multi-band gradient over the base color. */
function oilGradient(
  c: CanvasRenderingContext2D,
  premul: readonly [number, number, number, number],
  oil: GlOil,
  w: number,
  h: number,
): CanvasGradient {
  const a = premul[3] || 1
  const base = [premul[0] / a, premul[1] / a, premul[2] / a]
  // Mostly horizontal bands, so drips share the colors of the body right above them.
  const len = w * 0.7 * oil.scale
  const ang = Math.atan2((oil.stretchY || 0) * 0.3 + 0.18, 1) + Math.sin(oil.time * 0.2) * 0.08
  const cx = w / 2 + oil.flowX * 0.5
  const cy = h / 2 + oil.flowY * 0.5
  const dx = (Math.cos(ang) * len) / 2
  const dy = (Math.sin(ang) * len) / 2
  const g = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy)
  const lum = 0.2126 * base[0]! + 0.7152 * base[1]! + 0.0722 * base[2]!
  const mixAmt = oil.intensity * (lum < 0.5 ? 0.4 : 0.32)
  const n = OIL_PALETTE.length
  const phase = ((oil.shift % 1) + 1) % 1
  for (let i = 0; i <= 8; i++) {
    const p = OIL_PALETTE[(i + Math.floor(phase * n)) % n]!
    const col = base.map((b, j) => {
      // Dark bases get a screen-like lift, light bases a tint.
      const film = lum < 0.5 ? 1 - (1 - b) * (1 - p[j]! * 0.85) : b * (0.55 + 0.6 * p[j]!)
      return Math.round(255 * (b + (film - b) * mixAmt))
    })
    g.addColorStop(i / 8, `rgba(${col[0]},${col[1]},${col[2]},${a})`)
  }
  return g
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

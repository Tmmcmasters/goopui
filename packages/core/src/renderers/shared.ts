// Per-document shared state for the canvas renderer: one WebGL2 context, one render
// scheduler (all dirty instances drawn together in a microtask after the sim frame), one
// IntersectionObserver (offscreen instances are skipped until visible), DPR + theme
// watchers, and a ref count. Created on first acquire, torn down on last release.

import { GlGooEngine, type GlBatch, type GlItem, type GlOil, type GlShape } from './gl'

export type CanvasBackend = 'webgl' | '2d'

/** What a canvas-goop instance exposes to the shared scheduler. */
export interface CanvasInstance {
  readonly canvas: HTMLCanvasElement
  /** Instance asked for the 2D backend explicitly. */
  readonly force2d: boolean
  dirty: boolean
  visible: boolean
  /** Shared state switched this instance's backend (initial, context lost/restored). */
  setBackend(b: CanvasBackend): void
  /**
   * Measure for a GL render. Returns null when there is nothing to draw (detached, zero
   * size). Sizes the target canvas backing store as a side effect.
   */
  prepare(dpr: number, maxSize: number): PreparedItem | null
  /** Push this instance's shapes, in field px, into `out`. */
  collect(out: GlShape[], ox: number, oy: number, kx: number, ky: number): void
  /** Copy the rendered rect out of the shared canvas into the instance canvas. */
  blit(src: HTMLCanvasElement, x: number, y: number, w: number, h: number): void
  /** Draw with Canvas 2D (fallback backend). */
  draw2d(dpr: number): void
}

export interface PreparedItem {
  /** Device px size of the target canvas. */
  w: number
  h: number
  /** Device px per css px (x / y). */
  kx: number
  ky: number
  blur: number
  threshold: number
  contrast: number
  color: readonly [number, number, number, number]
  /** Oil finish parameters, or null for solid. */
  oil: GlOil | null
  /** 0..1 wet-look gloss. */
  gloss?: number
}

export interface CanvasShared {
  readonly backend: CanvasBackend
  add(inst: CanvasInstance): void
  remove(inst: CanvasInstance): void
  /** Mark dirty and schedule a render. */
  invalidate(inst: CanvasInstance): void
  /** Probe-based CSS color -> premultiplied RGBA (0..1). Cached. */
  color(css: string): readonly [number, number, number, number]
  release(): void
}

export interface SharedOptions {
  /** Allow WebGL on a software rasterizer (SwiftShader etc.). Default false: use 2D. */
  allowSoftwareWebGL?: boolean
}

interface Registry {
  refs: number
  shared: SharedImpl
}

const registries = new WeakMap<Document, Registry>()

/** For tests / devtools: how many canvas renderers share `doc`'s context (0 if none). */
export function gooCanvasRefCount(doc: Document): number {
  return registries.get(doc)?.refs ?? 0
}

/** For tests / devtools: the backend the shared context is currently on, or null. */
export function gooCanvasBackend(doc: Document): CanvasBackend | null {
  return registries.get(doc)?.shared.backend ?? null
}

/** Take a reference on `doc`'s shared canvas-goop state. */
export function acquireCanvasShared(doc: Document, opts: SharedOptions = {}): CanvasShared {
  let reg = registries.get(doc)
  if (!reg) {
    reg = { refs: 0, shared: new SharedImpl(doc, opts) }
    registries.set(doc, reg)
  }
  reg.refs++
  const r = reg
  let released = false
  const s = r.shared
  return {
    get backend() {
      return s.backend
    },
    add: (i) => s.add(i),
    remove: (i) => s.remove(i),
    invalidate: (i) => s.invalidate(i),
    color: (c) => s.color(c),
    release() {
      if (released) return
      released = true
      r.refs--
      if (r.refs <= 0) {
        s.dispose()
        if (registries.get(doc) === r) registries.delete(doc)
      }
    },
  }
}

const TRANSPARENT = Object.freeze([0, 0, 0, 0] as const)

/** Field downscale for a blur of `sigmaDev` device px: keep sigma in field px around 4. */
export function fieldScale(sigmaDev: number): number {
  if (sigmaDev < 6) return 1
  return Math.max(1, Math.min(8, Math.round(sigmaDev / 4)))
}

/** Parse `rgb()/rgba()` fast; anything else (oklch, color(), names) goes through a probe. */
export function parseRgb(css: string): [number, number, number, number] | null {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+)(%)?)?\s*\)$/i.exec(css.trim())
  if (!m) return null
  let a = m[4] === undefined ? 1 : Number(m[4])
  if (m[5]) a /= 100
  return [Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255, Math.max(0, Math.min(1, a))]
}

class SharedImpl {
  private instances = new Set<CanvasInstance>()
  private scheduled = false
  private engine: GlGooEngine | null = null
  private glCanvas: HTMLCanvasElement | null = null
  private lost = false
  private io: IntersectionObserver | undefined
  private mo: MutationObserver | undefined
  private unwatchDpr: () => void = () => {}
  private colorCache = new Map<string, readonly [number, number, number, number]>()
  private probe: CanvasRenderingContext2D | null | undefined
  private disposed = false
  private readonly win: (Window & typeof globalThis) | null

  constructor(
    private readonly doc: Document,
    opts: SharedOptions,
  ) {
    this.win = doc.defaultView as (Window & typeof globalThis) | null
    this.initGl(!!opts.allowSoftwareWebGL)
    const IO = this.win?.IntersectionObserver
    this.io = IO
      ? new IO(
          (entries) => {
            for (const e of entries) {
              const inst = this.byCanvas.get(e.target as HTMLCanvasElement)
              if (!inst) continue
              inst.visible = e.isIntersecting
              if (inst.visible && inst.dirty) this.schedule()
            }
          },
          { rootMargin: '128px' },
        )
      : undefined
    // Theme switches (class/style/data-theme on <html>/<body>) can change --goop-color
    // while every instance is idle; repaint them all.
    const MO = this.win?.MutationObserver
    this.mo = MO ? new MO(() => this.invalidateAll()) : undefined
    for (const el of [doc.documentElement, doc.body]) {
      if (el) this.mo?.observe(el, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] })
    }
    this.watchDpr()
  }

  private byCanvas = new Map<HTMLCanvasElement, CanvasInstance>()

  get backend(): CanvasBackend {
    return this.engine && !this.lost ? 'webgl' : '2d'
  }

  private initGl(allowSoftware: boolean): void {
    let canvas: HTMLCanvasElement | null = null
    try {
      canvas = this.doc.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'low-power',
        failIfMajorPerformanceCaveat: !allowSoftware,
      }) as WebGL2RenderingContext | null
      if (!gl || typeof gl.createShader !== 'function') return
      // Software WebGL (SwiftShader, llvmpipe, ...) composites by reading every frame back to
      // the CPU ("GPU stall due to ReadPixels", even for a bare on-screen WebGL canvas) and is
      // slower than Canvas 2D anyway. Some setups don't flag it as a "major performance
      // caveat", so check the renderer string too, and fall back to 2D.
      if (!allowSoftware && isSoftwareGl(gl)) {
        gl.getExtension('WEBGL_lose_context')?.loseContext()
        return
      }
      this.engine = new GlGooEngine(canvas, gl)
      this.glCanvas = canvas
      canvas.addEventListener('webglcontextlost', this.onLost, false)
      canvas.addEventListener('webglcontextrestored', this.onRestored, false)
    } catch (err) {
      console.warn('[goopui] WebGL2 goo unavailable, using Canvas 2D', err)
      this.engine = null
      this.glCanvas = null
    }
  }

  private onLost = (e: Event): void => {
    e.preventDefault() // lets the browser restore it
    this.lost = true
    for (const i of this.instances) i.setBackend('2d')
    this.invalidateAll()
  }

  private onRestored = (): void => {
    if (!this.engine) return
    try {
      this.engine.init()
      this.lost = false
      for (const i of this.instances) if (!i.force2d) i.setBackend('webgl')
    } catch (err) {
      console.warn('[goopui] WebGL2 restore failed, staying on Canvas 2D', err)
    }
    this.invalidateAll()
  }

  private watchDpr(): void {
    const win = this.win
    if (!win?.matchMedia) return
    const mq = win.matchMedia(`(resolution: ${win.devicePixelRatio || 1}dppx)`)
    const onChange = (): void => {
      this.unwatchDpr()
      this.watchDpr()
      this.invalidateAll()
    }
    mq.addEventListener?.('change', onChange)
    this.unwatchDpr = () => mq.removeEventListener?.('change', onChange)
  }

  add(inst: CanvasInstance): void {
    this.instances.add(inst)
    this.byCanvas.set(inst.canvas, inst)
    inst.setBackend(inst.force2d ? '2d' : this.backend)
    this.io?.observe(inst.canvas)
  }

  remove(inst: CanvasInstance): void {
    this.instances.delete(inst)
    this.byCanvas.delete(inst.canvas)
    this.io?.unobserve(inst.canvas)
  }

  invalidate(inst: CanvasInstance): void {
    inst.dirty = true
    this.schedule()
  }

  private invalidateAll(): void {
    for (const i of this.instances) i.dirty = true
    this.schedule()
  }

  private schedule(): void {
    if (this.scheduled || this.disposed) return
    this.scheduled = true
    // After the current task / rAF callback: every instance the sim flushed this frame is
    // drawn in one batch, before the browser paints.
    queueMicrotask(this.run)
  }

  private run = (): void => {
    this.scheduled = false
    if (this.disposed) return
    const dpr = Math.max(0.5, Math.min(4, this.win?.devicePixelRatio || 1))
    const gl: CanvasInstance[] = []
    for (const inst of this.instances) {
      if (!inst.dirty || !inst.visible || !inst.canvas.isConnected) continue
      inst.dirty = false
      if (this.backend === 'webgl' && !inst.force2d) gl.push(inst)
      else inst.draw2d(dpr)
    }
    if (gl.length && this.engine) {
      try {
        this.renderGl(gl, dpr)
      } catch (err) {
        console.error('[goopui] canvas goo render failed', err)
      }
    }
  }

  private renderGl(list: CanvasInstance[], dpr: number): void {
    const engine = this.engine!
    const max = engine.maxSize
    // Group by blur in device px (shares field scale + kernel).
    const groups = new Map<number, { inst: CanvasInstance; p: PreparedItem }[]>()
    for (const inst of list) {
      const p = inst.prepare(dpr, max)
      if (!p) continue
      const key = Math.round(p.blur * p.kx * 100) / 100
      let g = groups.get(key)
      if (!g) groups.set(key, (g = []))
      g.push({ inst, p })
    }
    for (const [sigmaDev, entries] of groups) {
      const n = fieldScale(sigmaDev)
      const sigma = sigmaDev / n
      // Gap between atlas rects: the blur reach in device px, aligned to n.
      const gap = Math.ceil((Math.ceil(sigma * 3) + 2) * n / n) * n
      const align = (v: number): number => Math.ceil(v / n) * n
      let atlasW = Math.min(max, Math.max(2048, ...entries.map((e) => align(e.p.w) + gap * 2)))
      const atlasH = max
      atlasW = Math.min(max, atlasW)
      let batch: GlBatch = { n, sigma, width: 0, height: 0, items: [], shapes: [] }
      let owners: CanvasInstance[] = []
      let cx = gap
      let cy = gap
      let shelf = 0
      const flush = (): void => {
        if (!batch.items.length) return
        engine.render(batch)
        batch.items.forEach((it, i) => owners[i]!.blit(engine.canvas, it.x, it.y, it.w, it.h))
        batch = { n, sigma, width: 0, height: 0, items: [], shapes: [] }
        owners = []
        cx = gap
        cy = gap
        shelf = 0
      }
      for (const { inst, p } of entries) {
        const w = align(p.w)
        const h = align(p.h)
        if (cx + w + gap > atlasW) {
          cx = gap
          cy += shelf + gap
          shelf = 0
        }
        if (cy + h + gap > atlasH) {
          flush()
        }
        const item: GlItem = { x: cx, y: cy, w: p.w, h: p.h, color: p.color, threshold: p.threshold, contrast: p.contrast, oil: p.oil, gloss: p.gloss }
        batch.items.push(item)
        owners.push(inst)
        inst.collect(batch.shapes, cx / n, cy / n, p.kx / n, p.ky / n)
        batch.width = Math.max(batch.width, cx + w + gap)
        batch.height = Math.max(batch.height, cy + h + gap)
        cx += w + gap
        shelf = Math.max(shelf, h)
      }
      flush()
    }
  }

  color(css: string): readonly [number, number, number, number] {
    let c = this.colorCache.get(css)
    if (c) return c
    let rgba = parseRgb(css)
    if (!rgba) {
      if (this.probe === undefined) {
        const cv = this.doc.createElement('canvas')
        cv.width = 1
        cv.height = 1
        this.probe = (cv.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null) ?? null
      }
      const ctx = this.probe
      if (ctx) {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = '#000'
        ctx.fillStyle = css
        ctx.fillRect(0, 0, 1, 1)
        const d = ctx.getImageData(0, 0, 1, 1).data
        rgba = [d[0]! / 255, d[1]! / 255, d[2]! / 255, d[3]! / 255]
        // getImageData is un-premultiplied already.
      }
    }
    c = rgba ? Object.freeze([rgba[0] * rgba[3], rgba[1] * rgba[3], rgba[2] * rgba[3], rgba[3]] as const) : TRANSPARENT
    if (this.colorCache.size > 256) this.colorCache.clear()
    this.colorCache.set(css, c)
    return c
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.io?.disconnect()
    this.mo?.disconnect()
    this.unwatchDpr()
    if (this.glCanvas) {
      this.glCanvas.removeEventListener('webglcontextlost', this.onLost, false)
      this.glCanvas.removeEventListener('webglcontextrestored', this.onRestored, false)
    }
    this.engine?.dispose()
    this.engine = null
    this.glCanvas = null
    this.instances.clear()
    this.byCanvas.clear()
  }
}

/** True for software-rasterized WebGL (SwiftShader, llvmpipe, Microsoft Basic Render, ...). */
export function isSoftwareGl(gl: WebGL2RenderingContext): boolean {
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).toLowerCase()
    return /swiftshader|llvmpipe|softpipe|software|basic render/.test(name)
  } catch {
    return false
  }
}

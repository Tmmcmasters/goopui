import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  GOOP_OVERLAY_ATTR,
  GOOP_PART_ATTR,
  acquireGoopOverlay,
  activeTickerCount,
  attachGoop,
  createCanvasRenderer,
  createSvgFilterRenderer,
  gooCanvasBackend,
  gooCanvasRefCount,
  gooFilterRefCount,
  goopOverlayCount,
  makeCanvasRenderer,
  resolveRenderer,
  type GoopHandle,
} from '../src'
import { fieldScale, parseRgb } from '../src/renderers/shared'
import { gaussianTaps } from '../src/renderers/gl'

const PARAMS = { blur: 4, contrast: 20, threshold: 0.4 }
const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0))

function makeHost(w = 120, h = 40): HTMLButtonElement {
  const el = document.createElement('button')
  el.textContent = 'Click'
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => w })
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => h })
  document.body.append(el)
  return el
}

/** A WebGL2 stand-in: every call succeeds, constants are stable numbers. */
function fakeWebGL2() {
  const loseContext = vi.fn()
  const calls: string[] = []
  const consts = new Map<string, number>()
  const gl = new Proxy(
    {},
    {
      get(_t, prop: string) {
        if (/^[A-Z0-9_]+$/.test(prop)) {
          if (!consts.has(prop)) consts.set(prop, consts.size + 1)
          return consts.get(prop)
        }
        return (...args: unknown[]) => {
          calls.push(prop)
          switch (prop) {
            case 'getShaderParameter':
            case 'getProgramParameter':
              return true
            case 'isContextLost':
              return false
            case 'getParameter':
              return args[0] === consts.get('MAX_VIEWPORT_DIMS') ? [4096, 4096] : 4096
            case 'checkFramebufferStatus':
              return consts.get('FRAMEBUFFER_COMPLETE')
            case 'getExtension':
              return args[0] === 'WEBGL_lose_context' ? { loseContext } : {}
            default:
              return prop.startsWith('create') || prop === 'getUniformLocation' ? {} : undefined
          }
        }
      },
    },
  )
  let glCanvas: HTMLCanvasElement | null = null
  const orig = HTMLCanvasElement.prototype.getContext
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
    if (type === 'webgl2') {
      glCanvas = this
      return gl as unknown as WebGL2RenderingContext
    }
    return (orig as (...a: unknown[]) => unknown).call(this, type, ...rest) as RenderingContext | null
  } as typeof HTMLCanvasElement.prototype.getContext)
  return { loseContext, calls, canvas: () => glCanvas! }
}

let handles: GoopHandle[] = []
const attach = (el: HTMLElement, o?: Parameters<typeof attachGoop>[1]) => {
  const h = attachGoop(el, { random: () => 0.5, ...o })
  handles.push(h)
  return h
}

afterEach(() => {
  for (const h of handles) h.destroy()
  handles = []
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('renderer selection', () => {
  it("resolves 'svg' | 'canvas' | factory, default svg", () => {
    expect(resolveRenderer(undefined)).toBe(createSvgFilterRenderer)
    expect(resolveRenderer('svg')).toBe(createSvgFilterRenderer)
    expect(resolveRenderer('canvas')).toBe(createCanvasRenderer)
    const custom = makeCanvasRenderer({ backend: '2d' })
    expect(resolveRenderer(custom)).toBe(custom)
  })

  it("renderer: 'canvas' builds a canvas layer; default stays SVG", () => {
    const a = makeHost()
    const b = makeHost()
    attach(a, { renderer: 'canvas' })
    attach(b)
    expect(a.querySelector(`[${GOOP_PART_ATTR}="canvas"]`)).toBeInstanceOf(HTMLCanvasElement)
    expect(b.querySelector(`[${GOOP_PART_ATTR}="canvas"]`)).toBeNull()
    expect(b.querySelector(`[${GOOP_PART_ATTR}="body"]`)).not.toBeNull()
  })

  it('accepts a factory directly (createCanvasRenderer)', () => {
    const host = makeHost()
    const h = attach(host, { renderer: createCanvasRenderer })
    expect(h.layer.querySelector('canvas')).not.toBeNull()
  })
})

describe('canvas renderer without WebGL (happy-dom)', () => {
  it('falls back to Canvas 2D + the shared SVG goo filter', () => {
    const host = makeHost()
    const h = attach(host, { renderer: 'canvas' })
    expect(gooCanvasBackend(document)).toBe('2d')
    expect(h.layer.getAttribute('data-goop-backend')).toBe('2d')
    expect(h.layer.getAttribute('aria-hidden')).toBe('true')
    expect(h.layer.style.zIndex).toBe('-1')
    expect(h.layer.style.pointerEvents).toBe('none')
    const canvas = h.layer.querySelector('canvas')!
    expect(canvas.style.filter).toMatch(/^url\(#goop-goo-/)
  })

  it('destroy() removes DOM, filter ref, shared ref, listeners, and restores host styles', async () => {
    const host = makeHost()
    const h = attach(host, { renderer: 'canvas' })
    const id = /url\(#(.+)\)/.exec(h.layer.querySelector('canvas')!.style.filter)![1]!
    expect(gooFilterRefCount(document, id)).toBe(1)
    expect(gooCanvasRefCount(document)).toBe(1)
    const removeSpy = vi.spyOn(host, 'removeEventListener')
    h.destroy()
    handles = []
    expect(host.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
    expect(gooFilterRefCount(document, id)).toBe(0)
    expect(gooCanvasRefCount(document)).toBe(0)
    expect(gooCanvasBackend(document)).toBeNull()
    expect(host.style.isolation).toBe('')
    expect(removeSpy.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['pointerenter', 'pointerleave', 'transitionrun', 'transitionend']),
    )
    expect(activeTickerCount()).toBe(0)
    await flushMicrotasks() // a scheduled render after destroy must not throw
  })

  it('ref-counts the shared state across instances', () => {
    const hs = [makeHost(), makeHost(), makeHost()].map((el) => attach(el, { renderer: 'canvas' }))
    expect(gooCanvasRefCount(document)).toBe(3)
    hs[0]!.destroy()
    expect(gooCanvasRefCount(document)).toBe(2)
    hs[0]!.destroy() // idempotent
    expect(gooCanvasRefCount(document)).toBe(2)
    hs[1]!.destroy()
    hs[2]!.destroy()
    expect(gooCanvasRefCount(document)).toBe(0)
  })

  it('update() swaps the 2D fallback filter when params change', () => {
    const host = makeHost()
    const h = attach(host, { renderer: 'canvas' })
    const before = h.layer.querySelector('canvas')!.style.filter
    h.update({ blur: 7 })
    const after = h.layer.querySelector('canvas')!.style.filter
    expect(after).not.toBe(before)
    expect(gooFilterRefCount(document, /url\(#(.+)\)/.exec(before)![1]!)).toBe(0)
  })

  it('reduced motion: static goo, no ticker, same as svg', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const host = makeHost()
    const h = attach(host, { renderer: 'canvas', restingDrips: 2 })
    expect(h.reducedMotion).toBe(true)
    h.hover(true)
    h.drip()
    expect(activeTickerCount()).toBe(0)
    expect(h.layer.querySelector('canvas')).not.toBeNull()
  })

  it('exposes setBodyTransform (body jelly pose)', () => {
    const host = makeHost()
    const r = createCanvasRenderer(host, PARAMS)
    expect(typeof r.setBodyTransform).toBe('function')
    expect(() => r.setBodyTransform({ tx: 2, ty: -1, skew: 8, sx: 1.02, sy: 0.95 })).not.toThrow()
    r.destroy()
  })
})

describe('canvas renderer with (fake) WebGL2', () => {
  it('uses ONE shared context for many instances and renders without errors', async () => {
    const fake = fakeWebGL2()
    const hs = Array.from({ length: 5 }, () => attach(makeHost(), { renderer: 'canvas' }))
    expect(gooCanvasBackend(document)).toBe('webgl')
    expect(gooCanvasRefCount(document)).toBe(5)
    for (const h of hs) {
      expect(h.layer.getAttribute('data-goop-backend')).toBe('webgl')
      expect(h.layer.querySelector('canvas')!.style.filter).toBe('')
    }
    const webglContexts = (HTMLCanvasElement.prototype.getContext as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter(
      (c) => c[0] === 'webgl2',
    )
    expect(webglContexts).toHaveLength(1)
    hs[0]!.drip()
    await flushMicrotasks()
    expect(fake.calls).toContain('drawArraysInstanced')
  })

  it('context loss switches every instance to the 2D fallback, restore switches back', () => {
    const fake = fakeWebGL2()
    const h = attach(makeHost(), { renderer: 'canvas' })
    const lost = new Event('webglcontextlost', { cancelable: true })
    fake.canvas().dispatchEvent(lost)
    expect(lost.defaultPrevented).toBe(true)
    expect(gooCanvasBackend(document)).toBe('2d')
    expect(h.layer.getAttribute('data-goop-backend')).toBe('2d')
    expect(h.layer.querySelector('canvas')!.style.filter).toMatch(/^url\(#goop-goo-/)
    fake.canvas().dispatchEvent(new Event('webglcontextrestored'))
    expect(gooCanvasBackend(document)).toBe('webgl')
    expect(h.layer.getAttribute('data-goop-backend')).toBe('webgl')
    expect(h.layer.querySelector('canvas')!.style.filter).toBe('')
  })

  it("backend: '2d' opts one instance out of WebGL", () => {
    fakeWebGL2()
    const h = attach(makeHost(), { renderer: makeCanvasRenderer({ backend: '2d' }) })
    expect(gooCanvasBackend(document)).toBe('webgl')
    expect(h.layer.getAttribute('data-goop-backend')).toBe('2d')
  })

  it('frees the context when the last instance is destroyed', () => {
    const fake = fakeWebGL2()
    const a = attach(makeHost(), { renderer: 'canvas' })
    const b = attach(makeHost(), { renderer: 'canvas' })
    a.destroy()
    expect(fake.loseContext).not.toHaveBeenCalled()
    b.destroy()
    expect(fake.loseContext).toHaveBeenCalledTimes(1)
    expect(gooCanvasRefCount(document)).toBe(0)
  })
})

describe('page overlay', () => {
  it('shares one fixed host per renderer/color/params and removes it with the last release', () => {
    const a = acquireGoopOverlay(document, { color: 'red' })
    const b = acquireGoopOverlay(document, { color: 'red' })
    const c = acquireGoopOverlay(document, { color: 'blue', renderer: 'svg' })
    expect(a.host).toBe(b.host)
    expect(goopOverlayCount(document)).toBe(2)
    expect(document.querySelectorAll(`[${GOOP_OVERLAY_ATTR}]`)).toHaveLength(2)
    expect(a.host.style.position).toBe('fixed')
    expect(a.host.style.pointerEvents).toBe('none')
    const blob = a.createBlob()
    blob.set(10, 10, 4)
    a.flush()
    a.release()
    a.release() // idempotent
    expect(a.host.isConnected).toBe(true)
    b.release()
    expect(a.host.isConnected).toBe(false)
    c.release()
    expect(goopOverlayCount(document)).toBe(0)
    expect(gooCanvasRefCount(document)).toBe(0)
  })
})

describe('helpers', () => {
  it('parses rgb()/rgba() in both syntaxes', () => {
    expect(parseRgb('rgb(255, 0, 0)')).toEqual([1, 0, 0, 1])
    expect(parseRgb('rgba(0, 0, 255, 0.5)')).toEqual([0, 0, 1, 0.5])
    expect(parseRgb('rgb(0 255 0 / 50%)')).toEqual([0, 1, 0, 0.5])
    expect(parseRgb('oklch(0.6 0.2 250)')).toBeNull()
  })

  it('keeps the blur in field px around 4 by downscaling', () => {
    expect(fieldScale(4)).toBe(1)
    expect(fieldScale(8)).toBe(2)
    expect(fieldScale(24)).toBe(6)
    expect(fieldScale(500)).toBe(8)
  })

  it('gaussian taps are normalized', () => {
    for (const s of [1, 2.5, 4, 9]) {
      const t = gaussianTaps(s)
      let sum = t.w0
      for (let i = 0; i < t.count; i++) sum += 2 * t.taps[i * 2 + 1]!
      expect(sum).toBeCloseTo(1, 5)
    }
  })
})

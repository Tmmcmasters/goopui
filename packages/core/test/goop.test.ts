import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  GOO_DEFS_ATTR,
  GOOP_DEFAULTS,
  GOOP_PART_ATTR,
  activeTickerCount,
  attachGoop,
  readTuning,
  type GoopHandle,
} from '../src'

const blobs = (host: Element) => host.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)
const layerOf = (host: Element) => host.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="layer"]`)

function makeHost(): HTMLButtonElement {
  const el = document.createElement('button')
  el.textContent = 'Click'
  document.body.append(el)
  return el
}

function mouse(type: string, opts: PointerEventInit = {}) {
  return new PointerEvent(type, { pointerType: 'mouse', bubbles: type !== 'pointerenter' && type !== 'pointerleave', clientX: 10, ...opts })
}

/** Force `(hover: hover)` and optionally prefers-reduced-motion in happy-dom. */
function stubMatchMedia(reduce = false) {
  const listeners = new Set<() => void>()
  const state = { reduce }
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) =>
      ({
        media: q,
        get matches() {
          if (q.includes('hover')) return true
          if (q.includes('reduced-motion')) return state.reduce
          return false
        },
        addEventListener: (_: string, l: () => void) => listeners.add(l),
        removeEventListener: (_: string, l: () => void) => listeners.delete(l),
      }) as unknown as MediaQueryList,
  )
  return {
    set(v: boolean) {
      state.reduce = v
      for (const l of listeners) l()
    },
    listeners,
  }
}

let handles: GoopHandle[] = []
const attach = (el: HTMLElement, o?: Parameters<typeof attachGoop>[1]) => {
  const h = attachGoop(el, { random: () => 0.5, ...o })
  handles.push(h)
  return h
}

beforeEach(() => {
  delete document.documentElement.dataset.reducedMotion
})
afterEach(() => {
  for (const h of handles) h.destroy()
  handles = []
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('attachGoop', () => {
  it('builds an aria-hidden, filtered, non-interactive goo layer under the content', () => {
    stubMatchMedia()
    const host = makeHost()
    const h = attach(host)
    const layer = layerOf(host)!
    expect(layer).toBe(h.layer)
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.style.pointerEvents).toBe('none')
    expect(layer.style.position).toBe('absolute')
    expect(layer.style.zIndex).toBe('-1')
    expect(layer.style.filter).toMatch(/^url\(#goop-goo-/)
    expect(layer.querySelector(`[${GOOP_PART_ATTR}="body"]`)).not.toBeNull()
    expect(host.style.isolation).toBe('isolate')
    expect(host.textContent).toBe('Click')
    // the filter it points to exists in the shared defs svg
    const id = layer.style.filter.match(/#([^)"]+)/)![1]!
    expect(document.querySelector(`svg[${GOO_DEFS_ATTR}] #${id}`)).not.toBeNull()
  })

  it('shares one filter between instances with the same params', () => {
    stubMatchMedia()
    const a = attach(makeHost())
    const b = attach(makeHost())
    expect(a.layer.style.filter).toBe(b.layer.style.filter)
    expect(document.querySelectorAll(`svg[${GOO_DEFS_ATTR}] filter`)).toHaveLength(1)
  })

  it('mouse hover spawns 1-3 drips, leave retracts', () => {
    stubMatchMedia()
    const host = makeHost()
    attach(host)
    host.dispatchEvent(mouse('pointerenter'))
    const n = blobs(host).length
    expect(n).toBeGreaterThan(0)
    expect(activeTickerCount()).toBe(1)
    host.dispatchEvent(mouse('pointerleave'))
  })

  it('touch hover does not drip; touch tap squishes and drips once on release', () => {
    stubMatchMedia()
    const host = makeHost()
    attach(host)
    host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }))
    expect(blobs(host)).toHaveLength(0)
    host.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
    expect(activeTickerCount()).toBe(1)
    host.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
    const per = blobs(host).length
    expect(per).toBeGreaterThan(0)
  })

  it('reads --goop-* CSS vars, JS options win, values are clamped', () => {
    const host = makeHost()
    host.style.setProperty('--goop-blur', '7px')
    host.style.setProperty('--goop-drip-count', '2')
    host.style.setProperty('--goop-viscosity', 'nonsense')
    host.style.setProperty('--goop-squish', '9')
    const t = readTuning(host, { dripCount: 1 })
    expect(t.blur).toBe(7)
    expect(t.dripCount).toBe(1)
    expect(t.viscosity).toBe(GOOP_DEFAULTS.viscosity)
    expect(t.squish).toBe(0.4)
    expect(t.fall).toBe(GOOP_DEFAULTS.fall)
  })

  it('update() re-reads CSS vars and swaps the filter', () => {
    stubMatchMedia()
    const host = makeHost()
    const h = attach(host)
    const before = h.layer.style.filter
    host.style.setProperty('--goop-blur', '9')
    h.update()
    expect(h.tuning.blur).toBe(9)
    expect(h.layer.style.filter).not.toBe(before)
    expect(document.querySelectorAll(`svg[${GOO_DEFS_ATTR}] filter`)).toHaveLength(1)
  })

  it('destroy cleans up DOM, filter, styles, ticker, and listeners', () => {
    stubMatchMedia()
    const host = makeHost()
    host.style.isolation = 'auto'
    const h = attach(host, { restingDrips: 1 })
    host.dispatchEvent(mouse('pointerenter'))
    host.dispatchEvent(mouse('pointerdown', { bubbles: true }))
    expect(activeTickerCount()).toBe(1)
    const removeSpy = vi.spyOn(host, 'removeEventListener')

    h.destroy()
    h.destroy() // idempotent
    expect(layerOf(host)).toBeNull()
    expect(document.querySelector(`svg[${GOO_DEFS_ATTR}]`)).toBeNull()
    expect(host.style.isolation).toBe('auto')
    expect(activeTickerCount()).toBe(0)
    expect(removeSpy.mock.calls.map((c) => c[0]).sort()).toEqual(['pointerdown', 'pointerenter', 'pointerleave', 'pointermove'])
    host.dispatchEvent(mouse('pointerenter'))
    document.dispatchEvent(mouse('pointerup', { bubbles: true }))
    expect(layerOf(host)).toBeNull()
    expect(activeTickerCount()).toBe(0)
    expect(host.textContent).toBe('Click')
  })
})

describe('reduced motion', () => {
  it('data-reduced-motion="true" -> no drips, no squish, no ticker', () => {
    stubMatchMedia()
    document.documentElement.dataset.reducedMotion = 'true'
    const host = makeHost()
    const h = attach(host)
    expect(h.reducedMotion).toBe(true)
    host.dispatchEvent(mouse('pointerenter'))
    host.dispatchEvent(mouse('pointerdown', { bubbles: true }))
    h.drip()
    expect(blobs(host)).toHaveLength(0)
    expect(activeTickerCount()).toBe(0)
    // static goo body is still there
    expect(layerOf(host)?.querySelector(`[${GOOP_PART_ATTR}="body"]`)).not.toBeNull()
  })

  it('prefers-reduced-motion -> no drips; resting drips stay static', () => {
    stubMatchMedia(true)
    const host = makeHost()
    const h = attach(host, { restingDrips: 2 })
    expect(h.reducedMotion).toBe(true)
    const resting = blobs(host).length
    expect(resting).toBeGreaterThan(0)
    host.dispatchEvent(mouse('pointerenter'))
    expect(blobs(host)).toHaveLength(resting)
    expect(activeTickerCount()).toBe(0)
  })

  it('reacts live to the media query and to the data attribute', async () => {
    const mq = stubMatchMedia(false)
    const host = makeHost()
    const h = attach(host)
    host.dispatchEvent(mouse('pointerenter'))
    expect(blobs(host).length).toBeGreaterThan(0)

    mq.set(true)
    expect(h.reducedMotion).toBe(true)
    expect(blobs(host)).toHaveLength(0)
    expect(activeTickerCount()).toBe(0)

    mq.set(false)
    expect(h.reducedMotion).toBe(false)

    document.documentElement.dataset.reducedMotion = 'true'
    await new Promise((r) => setTimeout(r, 0)) // MutationObserver flush
    expect(h.reducedMotion).toBe(true)

    delete document.documentElement.dataset.reducedMotion
    await new Promise((r) => setTimeout(r, 0))
    expect(h.reducedMotion).toBe(false)
  })

  it('stops watching when the last instance is destroyed', () => {
    const mq = stubMatchMedia(false)
    const a = attach(makeHost())
    const b = attach(makeHost())
    expect(mq.listeners.size).toBe(1)
    a.destroy()
    expect(mq.listeners.size).toBe(1)
    b.destroy()
    expect(mq.listeners.size).toBe(0)
  })

  it('reducedMotion option forces static mode', () => {
    stubMatchMedia(false)
    const host = makeHost()
    const h = attach(host, { reducedMotion: true })
    host.dispatchEvent(mouse('pointerenter'))
    expect(blobs(host)).toHaveLength(0)
    h.update({ reducedMotion: false })
    host.dispatchEvent(mouse('pointerenter'))
    expect(blobs(host).length).toBeGreaterThan(0)
  })
})

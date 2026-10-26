import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  SPINNER_FEEL,
  activeTickerCount,
  attachSpinner,
  isLoopRunning,
  spinnerCircleCount,
  spinnerPose,
  spinnerStaticPose,
} from '../src'

const blobs = (host: Element) => host.querySelectorAll<HTMLElement>(`[${GOOP_PART_ATTR}="blob"]`)
const host = () => {
  const el = document.createElement('span')
  document.body.append(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

describe('spinnerPose', () => {
  it('is deterministic and stays inside the box', () => {
    for (const n of [3, 4, 6]) {
      for (let p = 0; p < 2; p += 0.05) {
        const pose = spinnerPose(p, n)
        expect(pose).toHaveLength(spinnerCircleCount(n))
        expect(pose).toEqual(spinnerPose(p, n))
        for (const c of pose) expect(Math.hypot(c.x, c.y) + c.r).toBeLessThanOrEqual(0.5)
      }
    }
  })

  it('clamps the blob count to 3..6', () => {
    expect(spinnerPose(0, 1)).toHaveLength(spinnerCircleCount(3))
    expect(spinnerPose(0, 99)).toHaveLength(spinnerCircleCount(6))
  })

  it('merges when slow and splits when the leader surges', () => {
    const gapAt = (p: number) => {
      const [a, b] = spinnerPose(p, 4)
      return Math.hypot(a!.x - b!.x, a!.y - b!.y) - a!.r - b!.r
    }
    expect(gapAt(0.08)).toBeLessThan(0) // overlapping: merged
    expect(gapAt(0.55)).toBeGreaterThan(0) // apart: split
  })

  it('the neck stretches, snaps, and only reconnects on contact', () => {
    const neck = { necked: true }
    const neckR = (p: number) => spinnerPose(p, 4, SPINNER_FEEL.playful, neck).at(-1)!.r
    const seen: number[] = []
    for (let p = 0; p <= 1.2; p += 0.01) seen.push(neckR(p))
    expect(Math.max(...seen)).toBeGreaterThan(0)
    expect(seen).toContain(0) // snapped at some point in the cycle
    expect(seen.at(-1)).toBeGreaterThan(0) // reconnected by the next slow phase
  })

  it('static pose is the merged chain', () => {
    const pose = spinnerStaticPose(4)
    const [a, b] = pose
    expect(Math.hypot(a!.x - b!.x, a!.y - b!.y)).toBeLessThan(a!.r + b!.r)
    expect(pose.at(-1)!.r).toBeGreaterThan(0)
  })
})

describe('attachSpinner', () => {
  it('draws blobs (no body) on the shared loop and cleans up fully', () => {
    const el = host()
    const h = attachSpinner(el, { blobs: 5 })
    expect(blobs(el)).toHaveLength(spinnerCircleCount(5))
    expect(el.querySelector<HTMLElement>(`[${GOOP_PART_ATTR}="body"]`)!.style.transform).toContain('scale(0.0000')
    expect(el.querySelector(`[${GOOP_PART_ATTR}="layer"]`)!.getAttribute('aria-hidden')).toBe('true')
    expect(h.running).toBe(true)
    expect(isLoopRunning()).toBe(true)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(isLoopRunning()).toBe(false)
    expect(el.children).toHaveLength(0)
    expect(document.querySelector('[data-goop-defs]')).toBeNull()
  })

  it('reduced motion: static pose, no ticker; live toggle resumes', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const el = host()
    const h = attachSpinner(el)
    expect(h.reducedMotion).toBe(true)
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    const before = Array.from(blobs(el), (b) => b.style.transform)
    expect(before.every((t) => t.startsWith('translate'))).toBe(true)
    h.update({ speed: 3 })
    expect(Array.from(blobs(el), (b) => b.style.transform)).toEqual(before)
    h.update({ reducedMotion: false })
    expect(h.running).toBe(true)
    h.destroy()
  })

  it('pauses while the tab is hidden', () => {
    const el = host()
    const h = attachSpinner(el)
    const desc = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(h.running).toBe(false)
    expect(activeTickerCount()).toBe(0)
    if (desc) Object.defineProperty(document, 'visibilityState', desc)
    else delete (document as { visibilityState?: unknown }).visibilityState
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(h.running).toBe(true)
    h.destroy()
    delete (document as { visibilityState?: unknown }).visibilityState
  })

  it('update rebuilds for a new blob count', () => {
    const el = host()
    const h = attachSpinner(el, { blobs: 3 })
    h.update({ blobs: 6 })
    expect(blobs(el)).toHaveLength(spinnerCircleCount(6))
    h.destroy()
  })
})

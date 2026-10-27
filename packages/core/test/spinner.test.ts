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
  spinnerVariantPose,
  SPINNER_VARIANTS,
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

  it('the neck stretches, snaps, and only reconnects when nearly touching', () => {
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

describe('spinner variants', () => {
  it('every variant is deterministic, fixed-length and stays inside the box', () => {
    for (const v of SPINNER_VARIANTS) {
      for (const n of [3, 4, 6]) {
        const len = spinnerCircleCount(n, false, v)
        for (let p = 0; p < 2.5; p += 0.04) {
          const pose = spinnerVariantPose(v, p, n)
          expect(pose).toHaveLength(len)
          expect(pose).toEqual(spinnerVariantPose(v, p, n))
          for (const c of pose) {
            expect(c.r).toBeGreaterThanOrEqual(0)
            expect(Math.hypot(c.x, c.y) + c.r).toBeLessThanOrEqual(0.5)
          }
        }
      }
      expect(spinnerStaticPose(4, SPINNER_FEEL.playful, v)).toHaveLength(spinnerCircleCount(4, false, v))
    }
  })

  it('orbit is spinnerPose; unknown variants fall back to orbit', () => {
    expect(spinnerVariantPose('orbit', 0.3, 4)).toEqual(spinnerPose(0.3, 4))
    expect(spinnerVariantPose('nope' as never, 0.3, 4)).toEqual(spinnerPose(0.3, 4))
  })

  it('never stalls: the leader keeps more than half its average speed', () => {
    const angle = (p: number) => Math.atan2(spinnerPose(p, 4)[0]!.y, spinnerPose(p, 4)[0]!.x)
    const avg = (2 * Math.PI) / 100
    for (let p = 0; p < 1; p += 0.01) {
      let d = angle(p + 0.01) - angle(p)
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI))
      expect(d).toBeGreaterThan(avg * 0.5)
    }
  })

  it('attachSpinner allocates blobs for the variant and rebuilds on change', () => {
    const el = host()
    const h = attachSpinner(el, { variant: 'comet' })
    expect(blobs(el)).toHaveLength(spinnerCircleCount(4, false, 'comet'))
    h.update({ variant: 'pulse', blobs: 5 })
    expect(blobs(el)).toHaveLength(spinnerCircleCount(5, false, 'pulse'))
    h.destroy()
  })
})

describe('spinner drips', () => {
  it('sheds drips that fall below the ring center; none when off', () => {
    const vanish = 0.066
    const n = 4
    const base = spinnerCircleCount(n)
    const alive = (p: number) => spinnerPose(p, n, SPINNER_FEEL.playful, { necked: true }, { vanish }).slice(base).filter((c) => c.r > 0)
    expect(spinnerPose(1, n)).toHaveLength(base)
    expect(spinnerPose(1, n, SPINNER_FEEL.playful, { necked: true }, { vanish })).toHaveLength(spinnerCircleCount(n, true))
    let fell = false
    for (let p = 0.6; p < 3; p += 0.01) {
      const a = alive(p)
      const b = alive(p + 0.02)
      expect(a.length).toBeLessThanOrEqual(3 * 3)
      for (const c of a) if (c.y > 0.05 && b.some((d) => Math.abs(d.x - c.x) < 1e-9 && d.y > c.y)) fell = true
    }
    expect(fell).toBe(true)
  })

  it('attachSpinner allocates drip blobs only when drips are on', () => {
    const on = host()
    const a = attachSpinner(on, { blobs: 4 })
    const el = host()
    const off = attachSpinner(el, { blobs: 4, drips: false })
    expect(blobs(on)).toHaveLength(spinnerCircleCount(4, true))
    expect(blobs(el)).toHaveLength(spinnerCircleCount(4))
    a.destroy()
    off.destroy()
  })
})

describe('attachSpinner', () => {
  it('draws blobs (no body) on the shared loop and cleans up fully', () => {
    const el = host()
    const h = attachSpinner(el, { blobs: 5 })
    expect(blobs(el)).toHaveLength(spinnerCircleCount(5, true))
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
    expect(blobs(el)).toHaveLength(spinnerCircleCount(6, true))
    h.destroy()
  })
})

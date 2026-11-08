import { afterEach, describe, expect, it } from 'vitest'
import {
  SKELETON_REVEAL_FEEL,
  SKELETON_REVEAL_GOO,
  attachSkeletonReveal,
  matchRevealTargets,
  rectOverlap,
  resolveSkeletonReveal,
  revealOrder,
  revealTimings,
  skeletonBlocks,
  skeletonGooBlur,
  type RevealRect,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  delete document.documentElement.dataset.reducedMotion
})

const r = (x: number, y: number, w: number, h: number, rad = 0): RevealRect => ({ x, y, w, h, r: rad })

describe('resolveSkeletonReveal', () => {
  it('defaults to playful with everything on', () => {
    const f = resolveSkeletonReveal()
    expect(f.sheenOn && f.breatheOn && f.meltOn).toBe(true)
    expect(f.sheenPeriod).toBe(SKELETON_REVEAL_FEEL.playful.sheenPeriod)
  })

  it('turns effects off individually', () => {
    const f = resolveSkeletonReveal({ sheen: false, breathe: false, melt: false })
    expect(f.sheenOn || f.breatheOn || f.meltOn).toBe(false)
    expect(f.breathe).toBe(0)
  })

  it('keeps the sheen band under the goo edge, so it never shows on its own', () => {
    const edge = SKELETON_REVEAL_GOO.threshold + 0.5 / SKELETON_REVEAL_GOO.contrast
    for (const preset of ['subtle', 'playful', 'wild'] as const) {
      expect(resolveSkeletonReveal({ preset, sheen: 2 }).sheenBridge).toBeLessThan(edge)
    }
  })

  it('speed shortens every duration', () => {
    const a = resolveSkeletonReveal()
    const b = resolveSkeletonReveal({ speed: 2 })
    expect(b.sheenPeriod).toBeCloseTo(a.sheenPeriod / 2)
    expect(b.drain).toBeCloseTo(a.drain / 2)
    expect(b.response).toBeCloseTo(a.response / 2)
  })

  it('presets go from calm to lively', () => {
    const s = SKELETON_REVEAL_FEEL.subtle
    const w = SKELETON_REVEAL_FEEL.wild
    expect(s.breathe).toBeLessThan(w.breathe)
    expect(s.swell).toBeLessThan(w.swell)
    expect(s.damping).toBeGreaterThan(w.damping)
  })

  it('swells are low: a few px, never a knob', () => {
    for (const f of Object.values(SKELETON_REVEAL_FEEL)) {
      expect(f.swell).toBeLessThanOrEqual(4)
      expect(f.breathe).toBeLessThanOrEqual(1.5)
    }
  })
})

describe('matching blocks to targets', () => {
  it('overlap scores', () => {
    expect(rectOverlap(r(0, 0, 10, 10), r(0, 0, 10, 10))).toBe(1)
    expect(rectOverlap(r(0, 0, 10, 10), r(20, 0, 10, 10))).toBe(0)
    expect(rectOverlap(r(0, 0, 10, 10), r(5, 0, 10, 10))).toBeCloseTo(50 / 150)
  })

  it('pairs a profile skeleton with its avatar, text lines and button', () => {
    const blocks = [r(0, 0, 48, 48, 24), r(64, 6, 128, 16), r(64, 28, 96, 14), r(0, 72, 300, 14), r(0, 92, 240, 14), r(0, 124, 112, 32)]
    const targets = [
      r(0, 72, 280, 14), // bio line 1
      r(0, 0, 48, 48, 24), // avatar
      r(0, 124, 112, 32, 8), // button
      r(64, 4, 95, 15), // name
      r(0, 92, 290, 14), // bio line 2
      r(64, 27, 104, 14), // handle
    ]
    expect(matchRevealTargets(blocks, targets)).toEqual([1, 3, 5, 0, 4, 2])
  })

  it('a block with nothing nearby drains in place', () => {
    expect(matchRevealTargets([r(0, 0, 10, 10), r(500, 500, 10, 10)], [r(0, 0, 10, 10)])).toEqual([0, -1])
  })

  it('reaches a near target it does not overlap', () => {
    expect(matchRevealTargets([r(0, 0, 40, 10)], [r(0, 20, 40, 10)])).toEqual([0])
  })

  it('two bars over one paragraph both flow into it', () => {
    const para = r(0, 0, 300, 40)
    expect(matchRevealTargets([r(0, 2, 300, 16), r(0, 22, 240, 16)], [para])).toEqual([0, 0])
  })

  it('reveals top to bottom, left to right', () => {
    expect(revealOrder([r(0, 100, 10, 10), r(60, 2, 10, 10), r(0, 0, 10, 14)])).toEqual([2, 1, 0])
  })

  it('timings stagger and each blob drains after its morph', () => {
    const t = revealTimings(3, SKELETON_REVEAL_FEEL.playful)
    expect(t[1]!.start).toBeGreaterThan(t[0]!.start)
    for (const x of t) {
      expect(x.drainStart).toBeGreaterThan(x.start)
      expect(x.end).toBeGreaterThan(x.drainStart)
    }
  })

  it('caps the blur for thin blocks', () => {
    expect(skeletonGooBlur(3, [r(0, 0, 100, 16)])).toBe(3)
    expect(skeletonGooBlur(3, [r(0, 0, 100, 6)])).toBeLessThan(2)
    expect(skeletonGooBlur(3, [])).toBe(3)
  })
})

/** happy-dom has no layout: give elements fixed boxes. */
function box(el: Element, x: number, y: number, w: number, h: number): void {
  el.getBoundingClientRect = () => ({ x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) }) as DOMRect
}

function group(): { host: HTMLElement; skeleton: HTMLElement; blocks: HTMLElement[] } {
  const host = document.createElement('div')
  Object.defineProperty(host, 'clientWidth', { value: 320 })
  Object.defineProperty(host, 'clientHeight', { value: 160 })
  box(host, 0, 0, 320, 160)
  const skeleton = document.createElement('div')
  const blocks = [0, 1].map((i) => {
    const b = document.createElement('div')
    b.dataset.slot = 'skeleton'
    b.className = 'bg-accent rounded-md h-4 w-full'
    box(b, 0, i * 24, 300, 16)
    skeleton.append(b)
    return b
  })
  host.append(skeleton)
  document.body.append(host)
  return { host, skeleton, blocks }
}

describe('attachSkeletonReveal', () => {
  it('finds skeleton blocks', () => {
    const { skeleton, blocks } = group()
    expect(skeletonBlocks(skeleton)).toEqual(blocks)
  })

  it('pools the blocks into one aria-hidden goo layer and hides the originals', () => {
    const { host, skeleton, blocks } = group()
    const h = attachSkeletonReveal(host)
    h.pool(skeleton)
    const layer = host.querySelector('[data-goop-skeleton-goo]') as HTMLElement
    expect(layer).toBeTruthy()
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.style.overflow).toBe('hidden')
    expect(layer.style.filter).toContain('url(#')
    // Two blobs plus the sheen band; the blobs copy the blocks' classes (theme colour).
    expect(layer.children.length).toBe(3)
    expect((layer.children[0] as HTMLElement).className).toContain('bg-accent')
    for (const b of blocks) expect(b.style.visibility).toBe('hidden')
    h.destroy()
    expect(host.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    for (const b of blocks) expect(b.style.visibility).toBe('')
  })

  it('without the sheen there is no band', () => {
    const { host, skeleton } = group()
    const h = attachSkeletonReveal(host, { sheen: false })
    h.pool(skeleton)
    expect(host.querySelector('[data-goop-skeleton-goo]')!.children.length).toBe(2)
    h.destroy()
  })

  it('reduced motion: no goo layer, the blocks stay as they are', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { host, skeleton, blocks } = group()
    const h = attachSkeletonReveal(host)
    h.pool(skeleton)
    expect(host.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    for (const b of blocks) expect(b.style.visibility).toBe('')
    h.destroy()
  })

  it('reveal with melt off resolves at once and leaves no layer', async () => {
    const { host, skeleton } = group()
    const h = attachSkeletonReveal(host, { melt: false })
    h.pool(skeleton)
    h.capture()
    skeleton.remove()
    const content = document.createElement('div')
    content.innerHTML = '<p>Hello</p>'
    host.append(content)
    await h.reveal(content)
    expect(host.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    h.destroy()
  })

  it('cancel stops a running melt and removes the layer', async () => {
    const { host, skeleton } = group()
    const h = attachSkeletonReveal(host)
    h.pool(skeleton)
    h.capture()
    skeleton.remove()
    const content = document.createElement('div')
    const btn = document.createElement('button')
    box(btn, 0, 0, 120, 32)
    content.append(btn)
    host.append(content)
    const done = h.reveal(content)
    expect(host.querySelector('[data-goop-skeleton-goo]')).toBeTruthy()
    h.cancel()
    await done
    expect(host.querySelector('[data-goop-skeleton-goo]')).toBeNull()
    h.destroy()
  })
})

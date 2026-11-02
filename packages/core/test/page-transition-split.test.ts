import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PAGE_TRANSITION_ATTR,
  PAGE_TRANSITION_CLIP_NONE,
  PAGE_TRANSITION_OLD_ATTR,
  PAGE_TRANSITION_SAMPLES,
  PAGE_TRANSITION_SEAM_INSET,
  PAGE_TRANSITION_VT_NAME,
  activeTickerCount,
  createPageTransition,
  pageTransitionEdge,
  pageTransitionFrame,
  pageTransitionMounds,
  pageTransitionSplitClip,
  pageTransitionSplitEdge,
  pageTransitionSweepEase,
  type PageTransitionFrameInput,
  type PageTransitionHandle,
} from '../src'

const overlay = (): SVGSVGElement | null => document.querySelector(`svg[${PAGE_TRANSITION_ATTR}]`)
const wallD = (): string => overlay()?.querySelectorAll('path')[1]?.getAttribute('d') ?? ''
/** Subpaths of a path, each as its [x, y] points (control points included). */
const subpaths = (d: string): [number, number][][] =>
  d
    .split('M')
    .slice(1)
    .map((s) => {
      const n = (s.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i]!, n[i + 1]!])
      return pts
    })
const yRange = (d: string): [number, number] => {
  const ys = subpaths(d)[0]!.map((p) => p[1])
  return [Math.min(...ys), Math.max(...ys)]
}
/** Points on the front run of a path: M, then a control point + midpoint per sample. */
const FRONT_POINTS = 1 + 2 * (PAGE_TRANSITION_SAMPLES + 1)

describe('split geometry', () => {
  const input = (direction: PageTransitionFrameInput['direction'], front: number): PageTransitionFrameInput => ({
    direction,
    width: 1000,
    height: 800,
    front,
    tail: front - 400,
    frontAmp: 50,
    tailAmp: 40,
    frontMounds: pageTransitionMounds(4),
    tailMounds: pageTransitionMounds(5),
    time: 0.3,
    wobble: 0.26,
    hz: 2.4,
    dents: [{ edge: 'front', at: 0.4, half: 0.1, depth: 20 }],
  })

  it('the seam sits just inside the goo front, at every sample', () => {
    const f = input('down', 420)
    const seam = pageTransitionSplitEdge(f)
    expect(seam).toHaveLength(PAGE_TRANSITION_SAMPLES + 1)
    seam.forEach((s, i) => expect(s).toBeCloseTo(pageTransitionEdge(f, 'front', i / PAGE_TRANSITION_SAMPLES) - PAGE_TRANSITION_SEAM_INSET, 6))
  })

  it('the clip follows the same curve as the goo front, offset into the goo', () => {
    const f = { ...input('down', 420), holes: [] }
    const clip = subpaths(pageTransitionSplitClip(f, pageTransitionSplitEdge(f)))[0]!
    const goo = subpaths(pageTransitionFrame(f).d)[0]!
    for (let i = 0; i < FRONT_POINTS; i++) {
      expect(clip[i]![0]).toBeCloseTo(goo[i]![0], 0)
      const gap = goo[i]![1] - clip[i]![1]
      expect(gap).toBeGreaterThan(PAGE_TRANSITION_SEAM_INSET - 0.2)
      expect(gap).toBeLessThan(PAGE_TRANSITION_SEAM_INSET + 0.2)
    }
  })

  it('covers the old side (ahead of the front) for every direction', () => {
    const far = { down: [1, 806], up: [1, -6], right: [0, 1006], left: [0, -6] } as const
    for (const dir of ['down', 'up', 'right', 'left'] as const) {
      const f = input(dir, 300)
      const pts = subpaths(pageTransitionSplitClip(f, pageTransitionSplitEdge(f)))[0]!
      const [axis, edge] = far[dir]
      // The last two points are the far corners.
      expect(pts.at(-1)![axis]).toBe(edge)
      expect(pts.at(-2)![axis]).toBe(edge)
    }
  })

  it('given the last seam it never moves back, but always stays inside the goo', () => {
    const a = input('down', 420)
    const prev = pageTransitionSplitEdge(a)
    const b = { ...a, front: 415 }
    const next = pageTransitionSplitEdge(b, PAGE_TRANSITION_SEAM_INSET, prev)
    next.forEach((s, i) => {
      const fe = pageTransitionEdge(b, 'front', i / PAGE_TRANSITION_SAMPLES)
      expect(s).toBeLessThanOrEqual(fe - 1 + 1e-9)
      if (fe - 1 >= prev[i]!) expect(s).toBeGreaterThanOrEqual(prev[i]!)
    })
  })

  it('is empty once the seam is past the far edge; the sweep ease is monotonic 0 -> 1', () => {
    const f = input('down', 2000)
    expect(pageTransitionSplitClip(f, pageTransitionSplitEdge(f))).toBe(PAGE_TRANSITION_CLIP_NONE)
    let prev = -1
    for (let i = 0; i <= 100; i++) {
      const e = pageTransitionSweepEase(i / 100)
      expect(e).toBeGreaterThan(prev)
      prev = e
    }
    expect(pageTransitionSweepEase(0)).toBe(0)
    expect(pageTransitionSweepEase(1)).toBeCloseTo(1, 9)
  })
})

describe('createPageTransition split', () => {
  let pt: PageTransitionHandle | null = null
  const doc = document as unknown as { startViewTransition?: unknown }
  const g = globalThis as unknown as { KeyframeEffect?: unknown }
  const savedKE = g.KeyframeEffect
  const clone = (): HTMLElement | null => document.querySelector(`div[${PAGE_TRANSITION_OLD_ATTR}]`)
  const vtStyle = (): Element | null => document.querySelector(`style[${PAGE_TRANSITION_OLD_ATTR}]`)
  const clipOf = (v: string): string => v.match(/path\('([^']*)'\)/)?.[1] ?? ''
  /** Mean share of the viewport height still showing the old page, from a clip path. */
  const oldShare = (d: string): number => {
    if (!d || d === PAGE_TRANSITION_CLIP_NONE) return 0
    const pts = subpaths(d)[0]!.slice(1, FRONT_POINTS)
    return pts.reduce((s, p) => s + (innerHeight - Math.min(innerHeight, Math.max(0, p[1]))), 0) / pts.length / innerHeight
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0.37)
    document.body.innerHTML = '<main id="app"><h1>Old page</h1><p>text</p></main>'
  })
  afterEach(() => {
    pt?.destroy()
    pt = null
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete doc.startViewTransition
    g.KeyframeEffect = savedKE
    delete (document.documentElement as { animate?: unknown }).animate
    delete document.documentElement.dataset.reducedMotion
    document.body.innerHTML = ''
  })

  /** A stand-in for document.startViewTransition: the update runs a tick later, ready once
   *  it has resolved, finished once the test (or skipTransition) says so. */
  const fakeVT = () => {
    const log = { bandShownAtCapture: null as boolean | null, skipped: 0, finish: () => {} }
    doc.startViewTransition = (update: () => Promise<void>) => {
      const band = overlay()
      log.bandShownAtCapture = !!band && band.style.display !== 'none'
      let finish!: () => void
      const finished = new Promise<void>((r) => (finish = r))
      log.finish = finish
      const done = Promise.resolve().then(() => update())
      return {
        ready: done.then(() => undefined),
        finished,
        skipTransition: () => {
          log.skipped++
          finish()
        },
      }
    }
    return log
  }
  /** Web Animations on pseudo-elements, recorded. */
  const fakeWAAPI = () => {
    const frames: string[] = []
    const anim = {
      opts: null as KeyframeAnimationOptions | null,
      finished: 0,
      cancelled: 0,
      effect: { setKeyframes: (k: { clipPath: string }[]) => void frames.push(clipOf(k[0]!.clipPath)) },
      finish() {
        this.finished++
      },
      cancel() {
        this.cancelled++
      },
    }
    class KE {
      get pseudoElement() {
        return null
      }
    }
    g.KeyframeEffect = KE
    ;(document.documentElement as unknown as { animate: unknown }).animate = (_k: unknown, o: KeyframeAnimationOptions) => {
      anim.opts = o
      return anim
    }
    return { frames, anim }
  }
  const flushPromises = async () => {
    for (let i = 0; i < 8; i++) await Promise.resolve()
  }

  it('picks the view transition, else the clone; no split when off, the wall or reduced motion', () => {
    fakeVT()
    pt = createPageTransition({ reducedMotion: false })
    expect(pt.seam).toBe('view-transition')
    delete doc.startViewTransition
    expect(pt.seam).toBe('clone')
    pt.update({ split: false })
    expect(pt.seam).toBeNull()
    pt.update({ split: true, band: false })
    expect(pt.seam).toBeNull()
    pt.update({ band: true, reducedMotion: true })
    expect(pt.seam).toBeNull()
  })

  it('view transition: the band is not in the old snapshot, then sweeps with the clip on its front', async () => {
    const vt = fakeVT()
    const { frames, anim } = fakeWAAPI()
    pt = createPageTransition({ reducedMotion: false, seed: 3 })
    const covered = pt.cover()
    expect(pt.phase).toBe('covering')
    expect(vt.bandShownAtCapture).toBe(false)
    await covered
    // Snapshot taken: the band is its own live group; nothing moves until the page is ready.
    expect(pt.phase).toBe('covered')
    expect(overlay()!.style.getPropertyValue('view-transition-name')).toBe(PAGE_TRANSITION_VT_NAME)
    expect(activeTickerCount()).toBe(0)
    expect(vtStyle()?.textContent).toContain('animation:none')
    const revealed = pt.reveal()
    await flushPromises()
    expect(anim.opts?.pseudoElement).toBe('::view-transition-old(root)')
    const walls: string[] = []
    for (let i = 0; i < 120 && pt.phase !== 'idle'; i++) {
      vi.advanceTimersByTime(16)
      walls.push(wallD())
    }
    await revealed
    expect(pt.phase).toBe('idle')
    // Every clip frame matches the goo's front on that frame; the old side only shrinks.
    let last = 1
    let checked = 0
    let exact = 0
    frames.forEach((d, i) => {
      const share = oldShare(d)
      expect(share).toBeLessThanOrEqual(last + 1e-9)
      last = share
      // frames[0] is drawn when the transition is ready, before the first tick.
      const goo = subpaths(walls[i - 1] ?? '')[0]
      const clip = subpaths(d)[0]
      if (!goo || goo.length < FRONT_POINTS || !clip || d === PAGE_TRANSITION_CLIP_NONE) return
      for (let k = 1; k < FRONT_POINTS; k++) {
        const gy = goo[k]![1]
        const cy = clip[k]![1]
        if (gy <= 0 || gy >= innerHeight || cy <= 0) continue
        // Always under the goo; where the front briefly recedes (a pop notch, mounds
        // settling) the seam holds its place rather than giving old page back.
        expect(gy - cy).toBeGreaterThanOrEqual(1 - 0.11)
        expect(gy - cy).toBeLessThan(innerHeight * 0.1)
        if (gy - cy <= PAGE_TRANSITION_SEAM_INSET + 0.11) exact++
        checked++
      }
    })
    expect(checked).toBeGreaterThan(100)
    expect(exact / checked).toBeGreaterThan(0.8)
    expect(frames.at(-1)).toBe(PAGE_TRANSITION_CLIP_NONE)
    // Ends cleanly: the empty clip holds (finished, fill forwards) until the transition is done.
    expect(anim.finished).toBe(1)
    expect(anim.cancelled).toBe(0)
    vt.finish()
    await flushPromises()
    expect(anim.cancelled).toBe(1)
    expect(vtStyle()).toBeNull()
    expect(overlay()!.style.getPropertyValue('view-transition-name')).toBe('')
    expect(overlay()!.style.display).toBe('none')
    expect(activeTickerCount()).toBe(0)
  })

  it('view transition without Web Animations on pseudo-elements: a rewritten style rule', async () => {
    const vt = fakeVT()
    pt = createPageTransition({ reducedMotion: false, seed: 3 })
    await pt.cover()
    const revealed = pt.reveal()
    await flushPromises()
    vi.advanceTimersByTime(400)
    expect(vtStyle()?.textContent).toMatch(/::view-transition-old\(root\)\{clip-path:path\('M/)
    expect(vtStyle()?.textContent).toContain('goop-pt-hold')
    vi.advanceTimersByTime(1500)
    await revealed
    expect(vtStyle()?.textContent ?? '').not.toContain('goop-pt-hold')
    vt.finish()
    await flushPromises()
    expect(vtStyle()).toBeNull()
  })

  it('clone fallback: holds near the top until ready, then the old side shrinks to nothing', async () => {
    pt = createPageTransition({ reducedMotion: false, seed: 5, bubbles: false })
    expect(pt.seam).toBe('clone')
    await pt.cover()
    const c = clone()!
    expect(c).not.toBeNull()
    expect(c.getAttribute('aria-hidden')).toBe('true')
    expect(c.textContent).toContain('Old page')
    expect(Number(c.style.zIndex)).toBeLessThan(Number(overlay()!.style.zIndex))
    // Not ready: the band pours in, but the new page never shows (its tail stays off the top).
    vi.advanceTimersByTime(2000)
    expect(pt.phase).toBe('covered')
    const [top, bottom] = yRange(wallD())
    expect(top).toBeLessThanOrEqual(0)
    expect(bottom).toBeGreaterThan(0)
    const shares: number[] = [oldShare(clipOf(c.style.clipPath))]
    expect(shares[0]).toBeGreaterThan(0.4)
    const revealed = pt.reveal()
    for (let i = 0; i < 120 && pt.phase !== 'idle'; i++) {
      vi.advanceTimersByTime(16)
      if (clone()) shares.push(oldShare(clipOf(c.style.clipPath)))
    }
    await revealed
    for (let i = 1; i < shares.length; i++) expect(shares[i]).toBeLessThanOrEqual(shares[i - 1]! + 1e-9)
    expect(shares.at(-1)).toBeLessThan(0.02)
    expect(clone()).toBeNull()
    expect(pt.phase).toBe('idle')
    expect(activeTickerCount()).toBe(0)
  })

  it('with bubbles, in every direction, the run ends with nothing left over', async () => {
    for (const direction of ['down', 'up', 'left', 'right'] as const) {
      pt?.destroy()
      pt = createPageTransition({ reducedMotion: false, seed: 9, direction })
      await pt.cover()
      const r = pt.reveal()
      vi.advanceTimersByTime(2000)
      await r
      expect(pt.phase).toBe('idle')
      expect(pt.bubbleCount).toBe(0)
      expect(clone()).toBeNull()
      expect(wallD()).toBe('')
    }
  })

  it('falls back: a throwing view transition -> the clone; nothing to clone -> the swap', async () => {
    doc.startViewTransition = () => {
      throw new Error('nope')
    }
    pt = createPageTransition({ reducedMotion: false })
    await pt.cover()
    expect(clone()).not.toBeNull()
    expect(vtStyle()).toBeNull()
    pt.destroy()
    expect(clone()).toBeNull()
    delete doc.startViewTransition
    document.body.innerHTML = ''
    pt = createPageTransition({ reducedMotion: false })
    const c = pt.cover()
    expect(pt.phase).toBe('covering')
    expect(pt.seam).toBeNull()
    vi.advanceTimersByTime(600)
    await c
    expect(pt.phase).toBe('covered')
  })

  it('a new cover mid-sweep ends the old run and starts a fresh one; destroy cleans up', async () => {
    const vt = fakeVT()
    fakeWAAPI()
    pt = createPageTransition({ reducedMotion: false })
    await pt.cover()
    const r = pt.reveal()
    await flushPromises()
    vi.advanceTimersByTime(300)
    expect(pt.phase).toBe('revealing')
    const c2 = pt.cover()
    await r
    expect(vt.skipped).toBe(1)
    await c2
    expect(pt.phase).toBe('covered')
    pt.destroy()
    expect(vt.skipped).toBe(2)
    expect(vtStyle()).toBeNull()
    expect(overlay()).toBeNull()
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: the plain fade, no split, no clone', async () => {
    fakeVT()
    document.documentElement.dataset.reducedMotion = 'true'
    pt = createPageTransition()
    expect(pt.seam).toBeNull()
    const c = pt.cover()
    vi.advanceTimersByTime(200)
    await c
    expect(clone()).toBeNull()
    expect(vtStyle()).toBeNull()
    expect(wallD()).toMatch(/^M0 0H\d+V\d+H0Z$/)
  })

  it('split: false keeps the swap: the band rests mid-screen while covered', async () => {
    fakeVT()
    pt = createPageTransition({ reducedMotion: false, split: false })
    const c = pt.cover()
    vi.advanceTimersByTime(600)
    await c
    expect(clone()).toBeNull()
    expect(vtStyle()).toBeNull()
    const [top, bottom] = yRange(wallD())
    expect(top).toBeGreaterThan(0)
    expect(bottom).toBeLessThan(innerHeight)
  })
})

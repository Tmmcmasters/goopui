import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PAGE_TRANSITION_ATTR,
  PAGE_TRANSITION_FEEL,
  PAGE_TRANSITION_HOLE_POINTS,
  PAGE_TRANSITION_MOUNDS,
  PAGE_TRANSITION_SAMPLES,
  activeTickerCount,
  createPageTransition,
  cubicBezier,
  pageTransitionBubbles,
  pageTransitionEdge,
  pageTransitionFrame,
  pageTransitionMounds,
  pageTransitionProfile,
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

describe('pageTransitionMounds', () => {
  it('is deterministic per seed and varies between seeds', () => {
    expect(pageTransitionMounds(3)).toEqual(pageTransitionMounds(3))
    expect(pageTransitionMounds(3)).not.toEqual(pageTransitionMounds(4))
  })

  it('gives low, wide mounds spread across the edge, never one centred knob', () => {
    for (let seed = 0; seed < 40; seed++) {
      const ms = pageTransitionMounds(seed)
      expect(ms).toHaveLength(PAGE_TRANSITION_MOUNDS)
      for (const m of ms) {
        expect(m.lo).toBeGreaterThanOrEqual(0.15)
        expect(m.hi).toBeGreaterThanOrEqual(0.15)
        expect(m.height).toBeLessThanOrEqual(1)
      }
      const tallest = ms.reduce((a, b) => (b.height > a.height ? b : a))
      expect(Math.abs(tallest.at - 0.5)).toBeGreaterThan(0.1)
    }
  })
})

describe('pageTransitionProfile', () => {
  it('is smooth: no step between neighbouring samples bigger than a gentle slope', () => {
    const ms = pageTransitionMounds(11)
    const amp = 60
    let prev = pageTransitionProfile(0, ms, amp, 0.1, 0.3, 3)
    for (let i = 1; i <= 400; i++) {
      const h = pageTransitionProfile(i / 400, ms, amp, 0.1, 0.3, 3)
      // 1/400 of a 1000px edge = 2.5px; slope stays well under 1:1.
      expect(Math.abs(h - prev)).toBeLessThan(2.5)
      prev = h
    }
  })

  it('drags back at the side walls', () => {
    const flat = [{ at: 0.5, lo: 2, hi: 2, height: 0, phase: 0, drift: 0 }]
    expect(pageTransitionProfile(0, flat, 50, 0, 0, 3)).toBeLessThan(0)
    expect(pageTransitionProfile(0.5, flat, 50, 0, 0, 3)).toBe(0)
  })
})

describe('pageTransitionFrame', () => {
  const base: PageTransitionFrameInput = {
    direction: 'down',
    width: 390,
    height: 844,
    front: 400,
    tail: -100,
    frontAmp: 40,
    tailAmp: 0,
    frontMounds: pageTransitionMounds(1),
    tailMounds: pageTransitionMounds(2),
    time: 0.1,
    wobble: 0.25,
    hz: 3,
  }

  it('is empty before the front enters and after the tail leaves', () => {
    expect(pageTransitionFrame({ ...base, front: -200 }).d).toBe('')
    expect(pageTransitionFrame({ ...base, front: 2000, tail: 2000 }).d).toBe('')
  })

  it('is a plain rect when fully covered', () => {
    const { d } = pageTransitionFrame({ ...base, front: 900, frontAmp: 0 })
    expect(d).toMatch(/^M-6 -6H396V850H-6Z$/)
  })

  it('keeps the point count modest and coordinates inside a small pad', () => {
    const { d } = pageTransitionFrame({ ...base, tail: 300, tailAmp: 50 })
    const cmds = d.match(/[MLQ]/g) ?? []
    expect(cmds.length).toBeLessThanOrEqual(2 * (PAGE_TRANSITION_SAMPLES + 4))
    const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number)
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(-6)
    expect(Math.max(...nums)).toBeLessThanOrEqual(850)
  })

  it('maps every direction into the viewport', () => {
    for (const direction of ['up', 'down', 'left', 'right'] as const) {
      const { d } = pageTransitionFrame({ ...base, direction, width: 1440, height: 900 })
      expect(d.length).toBeGreaterThan(10)
      expect(d.endsWith('Z')).toBe(true)
    }
  })

  it('adds an accent lip only when asked', () => {
    expect(pageTransitionFrame(base).accent).toBe('')
    expect(pageTransitionFrame({ ...base, rim: 8 }).accent).not.toBe('')
  })
})

describe('cubicBezier', () => {
  it('runs 0 -> 1 monotonically', () => {
    const e = cubicBezier(0.5, 0.05, 0.22, 1)
    let prev = -1
    for (let i = 0; i <= 50; i++) {
      const v = e(i / 50)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    expect(e(0)).toBe(0)
    expect(e(1)).toBe(1)
  })
})

describe('createPageTransition', () => {
  let pt: PageTransitionHandle | null = null
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    pt?.destroy()
    pt = null
    vi.useRealTimers()
    delete document.documentElement.dataset.reducedMotion
  })

  it('mounts nothing until the first cover', () => {
    pt = createPageTransition({ split: false, reducedMotion: false })
    expect(overlay()).toBeNull()
    expect(pt.phase).toBe('idle')
  })

  it('covers, holds, then reveals, in order', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false, accent: '#1fa64a' })
    const log: string[] = []
    const covered = pt.cover().then(() => log.push('covered'))
    const el = overlay()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.position).toBe('fixed')
    expect(pt.phase).toBe('covering')
    // Blocks clicks while covering.
    expect(el.style.pointerEvents).toBe('auto')
    vi.advanceTimersByTime(250)
    expect(log).toEqual([])
    vi.advanceTimersByTime(350)
    await covered
    expect(pt.phase).toBe('covered')
    // The band rests over the middle: page visible above and below it.
    const [top, bottom] = yRange(wallD())
    expect(top).toBeGreaterThan(0)
    expect(bottom).toBeLessThan(innerHeight)
    expect(top).toBeLessThan(innerHeight / 2)
    expect(bottom).toBeGreaterThan(innerHeight / 2)
    // Holds until reveal().
    vi.advanceTimersByTime(2000)
    expect(pt.phase).toBe('covered')
    const revealed = pt.reveal().then(() => log.push('revealed'))
    expect(pt.phase).toBe('revealing')
    expect(el.style.pointerEvents).toBe('none')
    vi.advanceTimersByTime(900)
    await revealed
    expect(log).toEqual(['covered', 'revealed'])
    expect(pt.phase).toBe('idle')
    expect(el.style.display).toBe('none')
    expect(activeTickerCount()).toBe(0)
  })

  it('a reveal called mid-cover waits for the cover to finish', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false })
    const log: string[] = []
    pt.cover().then(() => log.push('covered'))
    vi.advanceTimersByTime(50)
    const r = pt.reveal().then(() => log.push('revealed'))
    expect(pt.phase).toBe('covering')
    vi.advanceTimersByTime(1500)
    await r
    expect(log).toEqual(['covered', 'revealed'])
    expect(pt.phase).toBe('idle')
  })

  it('a cover mid-reveal re-covers and settles the superseded reveal', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false })
    pt.cover()
    vi.advanceTimersByTime(600)
    const r = pt.reveal()
    vi.advanceTimersByTime(100)
    expect(pt.phase).toBe('revealing')
    const c = pt.cover()
    await r
    expect(pt.phase).toBe('covering')
    vi.advanceTimersByTime(600)
    await c
    expect(pt.phase).toBe('covered')
  })

  it('reveal while idle and cover while covered resolve at once', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false })
    await pt.reveal()
    pt.cover()
    vi.advanceTimersByTime(600)
    expect(pt.phase).toBe('covered')
    await pt.cover()
    expect(pt.phase).toBe('covered')
  })

  it('destroy removes the overlay, stops the loop and settles pending promises', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false })
    const c = pt.cover()
    vi.advanceTimersByTime(50)
    pt.destroy()
    await c
    expect(overlay()).toBeNull()
    expect(activeTickerCount()).toBe(0)
    await pt.cover()
    expect(overlay()).toBeNull()
  })

  it('disabled: resolves at once and draws nothing', async () => {
    pt = createPageTransition({ enabled: false })
    await pt.cover()
    await pt.reveal()
    expect(overlay()).toBeNull()
  })

  it('reduced motion: a plain fade, no goo shape', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    pt = createPageTransition()
    expect(pt.reducedMotion).toBe(true)
    const c = pt.cover()
    const el = overlay()!
    vi.advanceTimersByTime(48)
    const mid = Number(el.style.opacity)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    // The wall is the full viewport rect the whole time (no mounds, no lip).
    const [lip, wall] = el.querySelectorAll('path')
    expect(wall!.getAttribute('d')).toMatch(/^M0 0H\d+V\d+H0Z$/)
    expect(lip!.getAttribute('d')).toBe('')
    vi.advanceTimersByTime(200)
    await c
    expect(el.style.opacity).toBe('1')
    const r = pt.reveal()
    vi.advanceTimersByTime(300)
    await r
    expect(pt.phase).toBe('idle')
  })

  it('duration splits across cover and reveal', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false, duration: 200 })
    const c = pt.cover()
    vi.advanceTimersByTime(130)
    await c
    expect(pt.phase).toBe('covered')
  })
})

describe('pageTransitionBubbles', () => {
  it('is deterministic per seed, varies between seeds, and respects the count', () => {
    expect(pageTransitionBubbles(4, 6)).toEqual(pageTransitionBubbles(4, 6))
    expect(pageTransitionBubbles(4, 6)).not.toEqual(pageTransitionBubbles(5, 6))
    for (const n of [0, 1, 4, 6, 8, 12]) expect(pageTransitionBubbles(1, n)).toHaveLength(n)
    expect(pageTransitionBubbles(1, 99).length).toBeLessThanOrEqual(14)
  })

  it('mixes sizes (a couple big, some small), sets up a merge, spawns during the run', () => {
    for (let seed = 0; seed < 30; seed++) {
      const bs = pageTransitionBubbles(seed, 6)
      expect(bs.filter((b) => b.size > 0.8).length).toBeGreaterThanOrEqual(1)
      expect(bs.filter((b) => b.size < 0.4).length).toBeGreaterThanOrEqual(1)
      expect(bs.some((b) => b.follow >= 0)).toBe(true)
      for (const b of bs) {
        expect(b.at).toBeGreaterThan(0)
        expect(b.at).toBeLessThan(1)
        expect(b.depth).toBeGreaterThan(0)
        expect(b.depth).toBeLessThan(1)
      }
      // Most spawn during the cover, a few as the reveal starts.
      expect(bs.filter((b) => b.at < 0.5).length).toBeGreaterThan(bs.length / 2)
    }
  })
})

describe('pageTransitionFrame holes', () => {
  const base: PageTransitionFrameInput = {
    direction: 'down',
    width: 390,
    height: 844,
    front: 600,
    tail: 200,
    frontAmp: 30,
    tailAmp: 30,
    frontMounds: pageTransitionMounds(1),
    tailMounds: pageTransitionMounds(2),
    time: 0.2,
    wobble: 0.26,
    hz: 2.4,
  }

  it('adds one closed subpath per hole, with a modest point count', () => {
    const holes = [
      { main: 400, cross: 100, r: 20, squash: 0.1, phase: 1 },
      { main: 450, cross: 280, r: 8, squash: 0, phase: 2 },
    ]
    const { d } = pageTransitionFrame({ ...base, holes })
    const subs = subpaths(d)
    expect(subs).toHaveLength(3)
    expect((d.match(/Z/g) ?? []).length).toBe(3)
    // Each hole: a Q (control + end) per point, plus its start.
    expect(subs[1]!.length).toBe(2 * PAGE_TRANSITION_HOLE_POINTS + 1)
    // Holes wobble: not a perfect circle.
    const radii = subs[1]!.map(([x, y]) => Math.hypot(x - 100, y - 400))
    expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(0.5)
  })

  it('clamps holes inside the goo body, never past an edge', () => {
    // A hole straddling the trailing edge and one past the front.
    const holes = [
      { main: 205, cross: 150, r: 30, squash: 0, phase: 0 },
      { main: 640, cross: 250, r: 25, squash: 0, phase: 0 },
    ]
    const f = { ...base, holes }
    const subs = subpaths(pageTransitionFrame(f).d)
    for (const sub of subs.slice(1)) {
      for (const [x, y] of sub) {
        const u = Math.min(1, Math.max(0, x / 390))
        // Midpoints / control points of the loop stay within a hair of the clamped samples.
        expect(y).toBeGreaterThanOrEqual(pageTransitionEdge(f, 'tail', u) - 3)
        expect(y).toBeLessThanOrEqual(pageTransitionEdge(f, 'front', u) + 3)
      }
    }
  })

  it('draws a merging pair as one hole (a lobe), not two overlapping ones', () => {
    const one = pageTransitionFrame({ ...base, holes: [{ main: 400, cross: 150, r: 24, squash: 0, phase: 0, partner: { main: 400, cross: 190, r: 12 } }] })
    expect(subpaths(one.d)).toHaveLength(2)
    const xs = subpaths(one.d)[1]!.map((p) => p[0])
    expect(Math.max(...xs)).toBeGreaterThan(150 + 24 + 8)
  })

  it('a pop notch dips the edge into the goo where it popped, and only there', () => {
    const dents = [{ edge: 'tail' as const, at: 0.5, half: 0.15, depth: 18 }]
    const plain = pageTransitionEdge(base, 'tail', 0.5)
    expect(pageTransitionEdge({ ...base, dents }, 'tail', 0.5)).toBeCloseTo(plain + 18, 5)
    expect(pageTransitionEdge({ ...base, dents }, 'tail', 0.9)).toBeCloseTo(pageTransitionEdge(base, 'tail', 0.9), 5)
    expect(pageTransitionEdge({ ...base, dents }, 'front', 0.5)).toBe(pageTransitionEdge(base, 'front', 0.5))
  })

  it('the accent lip has smaller holes (a goo rim round each bubble)', () => {
    const holes = [{ main: 400, cross: 150, r: 24, squash: 0, phase: 0 }]
    const { d, accent } = pageTransitionFrame({ ...base, holes, rim: 6 })
    const span = (p: string): number => {
      const xs = subpaths(p)[1]!.map((q) => q[0])
      return Math.max(...xs) - Math.min(...xs)
    }
    expect(span(accent)).toBeLessThan(span(d))
  })
})

describe('createPageTransition bubbles', () => {
  let pt: PageTransitionHandle | null = null
  beforeEach(() => {
    vi.useFakeTimers()
    // The reveal re-rolls its trailing mounds with Math.random: pin it so runs repeat.
    vi.spyOn(Math, 'random').mockReturnValue(0.37)
  })
  afterEach(() => {
    pt?.destroy()
    pt = null
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete document.documentElement.dataset.reducedMotion
  })

  /** Run a full transition (short hold): every frame's wall path and live bubble count. */
  const runOnce = async (opts: Parameters<typeof createPageTransition>[0]): Promise<{ frames: string[]; maxHoles: number; counts: number[] }> => {
    pt?.destroy()
    pt = createPageTransition({ split: false, reducedMotion: false, seed: 9, ...opts })
    const frames: string[] = []
    const counts: number[] = []
    const c = pt.cover()
    let revealed: Promise<void> | null = null
    for (let i = 0; i < 200 && (i === 0 || pt.phase !== 'idle'); i++) {
      vi.advanceTimersByTime(16)
      if (pt.phase === 'covered' && !revealed) {
        await c
        vi.advanceTimersByTime(120)
        revealed = pt.reveal()
      }
      frames.push(wallD())
      counts.push(pt.bubbleCount)
    }
    await revealed
    const maxHoles = Math.max(0, ...frames.map((d) => Math.max(0, subpaths(d).length - 1)))
    return { frames, maxHoles, counts }
  }

  it('cuts see-through holes while it runs, and keeps them inside the band body', async () => {
    const { frames, maxHoles } = await runOnce({})
    expect(maxHoles).toBeGreaterThanOrEqual(2)
    expect(overlay()!.querySelectorAll('path')[1]!.getAttribute('fill-rule')).toBe('evenodd')
    for (const d of frames) {
      const subs = subpaths(d)
      if (subs.length < 2) continue
      const ys = subs[0]!.map((p) => p[1])
      const lo = Math.min(...ys)
      const hi = Math.max(...ys)
      for (const sub of subs.slice(1)) {
        for (const [, y] of sub) {
          expect(y).toBeGreaterThanOrEqual(lo - 1)
          expect(y).toBeLessThanOrEqual(hi + 1)
        }
      }
    }
  })

  it('bubbles: false draws no holes; the count follows the option', async () => {
    const none = await runOnce({ bubbles: false })
    expect(none.maxHoles).toBe(0)
    const few = await runOnce({ bubbles: 0.5 })
    const many = await runOnce({ bubbles: 2 })
    const playful = PAGE_TRANSITION_FEEL.playful.bubbles
    expect(few.maxHoles).toBeLessThanOrEqual(Math.round(playful * 0.5))
    expect(many.maxHoles).toBeGreaterThan(few.maxHoles)
    expect(Math.max(...many.counts)).toBeLessThanOrEqual(playful * 2 + 3)
  })

  it('subtle has fewer bubbles than wild', () => {
    expect(PAGE_TRANSITION_FEEL.subtle.bubbles).toBeLessThan(PAGE_TRANSITION_FEEL.playful.bubbles)
    expect(PAGE_TRANSITION_FEEL.playful.bubbles).toBeLessThan(PAGE_TRANSITION_FEEL.wild.bubbles)
  })

  it('bubbles pop or merge on the way, and nothing is left at idle', async () => {
    const { counts } = await runOnce({ bubbles: 2 })
    expect(pt!.phase).toBe('idle')
    expect(pt!.bubbleCount).toBe(0)
    expect(counts.at(-1)).toBe(0)
    // Some went (popped or merged) while the band was still on screen, not just at the end.
    const drops = counts.filter((n, i) => i > 0 && n < counts[i - 1]! && n > 0).length
    expect(drops).toBeGreaterThan(0)
    expect(activeTickerCount()).toBe(0)
  })

  it('reduced motion: no bubbles, just the plain fade', async () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const { frames, maxHoles } = await runOnce({ reducedMotion: 'auto' })
    expect(maxHoles).toBe(0)
    for (const d of frames) expect(d).toMatch(/^(M0 0H\d+V\d+H0Z)?$/)
  })

  it('band: false is the full-screen wall (a plain rect once covered)', async () => {
    pt = createPageTransition({ split: false, reducedMotion: false, band: false, bubbles: false })
    const c = pt.cover()
    vi.advanceTimersByTime(700)
    await c
    expect(wallD()).toMatch(/^M-6 -6H/)
  })

  it('defaults are slow enough to watch: ~1.1-1.3 s in all', () => {
    const p = PAGE_TRANSITION_FEEL.playful
    expect(p.cover + p.reveal).toBeGreaterThanOrEqual(1.1)
    expect(p.cover + p.reveal).toBeLessThanOrEqual(1.3)
    expect(PAGE_TRANSITION_FEEL.subtle.cover + PAGE_TRANSITION_FEEL.subtle.reveal).toBeLessThan(p.cover + p.reveal)
    expect(PAGE_TRANSITION_FEEL.wild.cover + PAGE_TRANSITION_FEEL.wild.reveal).toBeGreaterThan(p.cover + p.reveal)
  })
})

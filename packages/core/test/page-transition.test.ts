import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PAGE_TRANSITION_ATTR,
  PAGE_TRANSITION_MOUNDS,
  PAGE_TRANSITION_SAMPLES,
  activeTickerCount,
  createPageTransition,
  cubicBezier,
  pageTransitionFrame,
  pageTransitionMounds,
  pageTransitionProfile,
  type PageTransitionFrameInput,
  type PageTransitionHandle,
} from '../src'

const overlay = (): SVGSVGElement | null => document.querySelector(`svg[${PAGE_TRANSITION_ATTR}]`)

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
    pt = createPageTransition({ reducedMotion: false })
    expect(overlay()).toBeNull()
    expect(pt.phase).toBe('idle')
  })

  it('covers, holds, then reveals, in order', async () => {
    pt = createPageTransition({ reducedMotion: false, accent: '#1fa64a' })
    const log: string[] = []
    const covered = pt.cover().then(() => log.push('covered'))
    const el = overlay()!
    expect(el).not.toBeNull()
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(el.style.position).toBe('fixed')
    expect(pt.phase).toBe('covering')
    // Blocks clicks while covering.
    expect(el.style.pointerEvents).toBe('auto')
    vi.advanceTimersByTime(120)
    expect(log).toEqual([])
    vi.advanceTimersByTime(400)
    await covered
    expect(pt.phase).toBe('covered')
    expect(el.querySelectorAll('path')[1]!.getAttribute('d')).toMatch(/^M-6 -6H/)
    // Holds until reveal().
    vi.advanceTimersByTime(2000)
    expect(pt.phase).toBe('covered')
    const revealed = pt.reveal().then(() => log.push('revealed'))
    expect(pt.phase).toBe('revealing')
    expect(el.style.pointerEvents).toBe('none')
    vi.advanceTimersByTime(600)
    await revealed
    expect(log).toEqual(['covered', 'revealed'])
    expect(pt.phase).toBe('idle')
    expect(el.style.display).toBe('none')
    expect(activeTickerCount()).toBe(0)
  })

  it('a reveal called mid-cover waits for the cover to finish', async () => {
    pt = createPageTransition({ reducedMotion: false })
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
    pt = createPageTransition({ reducedMotion: false })
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
    pt = createPageTransition({ reducedMotion: false })
    await pt.reveal()
    pt.cover()
    vi.advanceTimersByTime(600)
    expect(pt.phase).toBe('covered')
    await pt.cover()
    expect(pt.phase).toBe('covered')
  })

  it('destroy removes the overlay, stops the loop and settles pending promises', async () => {
    pt = createPageTransition({ reducedMotion: false })
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
    pt = createPageTransition({ reducedMotion: false, duration: 200 })
    const c = pt.cover()
    vi.advanceTimersByTime(130)
    await c
    expect(pt.phase).toBe('covered')
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import {
  GOOP_PART_ATTR,
  GOOP_SOUND_CUES,
  MENU_HIGHLIGHT_CIRCLES,
  PAGINATION_EFFECTS,
  PAGINATION_FEEL,
  TABS_FEEL,
  activeTickerCount,
  attachPaginationIndicator,
  findActivePage,
  isPaginationActive,
  menuHighlightInit,
  menuHighlightPose,
  menuHighlightSettled,
  menuHighlightSnap,
  menuHighlightStep,
  type EmergeRect,
} from '../src'

// Seven 32px page squares, 2px apart (shadcn reka-nova: size-8, gap-0.5).
const page = (i: number): EmergeRect => ({ x: i * 34, y: 0, width: 32, height: 32 })
const DT = 1 / 60
type Preset = keyof typeof PAGINATION_FEEL

const slide = (from: number, to: number, preset: Preset = 'playful', fx = {}) => {
  const s = menuHighlightInit()
  menuHighlightSnap(s, page(from))
  const frames = []
  for (let t = 0; t < 2.5; t += DT) {
    menuHighlightStep(s, page(to), DT, PAGINATION_FEEL[preset], fx)
    frames.push({ s: structuredClone(s), pose: menuHighlightPose(s, PAGINATION_FEEL[preset], fx) })
  }
  return frames
}
const centerX = (i: number) => page(i).x + 16

describe('pagination blob (PAGINATION_FEEL)', () => {
  it('slides to the new page with momentum and settles exactly on it', () => {
    const frames = slide(1, 2)
    expect(Math.max(...frames.map((f) => f.s.x.x))).toBeGreaterThan(centerX(2) + 0.3)
    const last = frames.at(-1)!
    expect(menuHighlightSettled(last.s, page(2))).toBe(true)
    expect(last.pose.body).toEqual(expect.objectContaining({ w: expect.closeTo(32, 1), h: expect.closeTo(32, 1) }))
  })

  it('jumps over several pages in one slide, with a gentle bounded stretch', () => {
    const frames = slide(0, 6)
    const xs = frames.map((f) => f.s.x.x)
    // One continuous travel: it never turns back before reaching the target.
    const reach = xs.findIndex((x) => x >= centerX(6))
    expect(reach).toBeGreaterThan(0)
    for (let i = 1; i < reach; i++) expect(xs[i]!).toBeGreaterThanOrEqual(xs[i - 1]! - 1e-6)
    const widest = Math.max(...frames.map((f) => f.pose.body.w))
    expect(widest).toBeGreaterThan(32)
    expect(widest).toBeLessThanOrEqual(32 * 1.25 + 32 * PAGINATION_FEEL.playful.stretch)
    // Travelling along the row never makes it taller (no knob above or below the row).
    for (const f of frames) expect(f.pose.body.h).toBeLessThanOrEqual(32 + 1e-6)
    for (const f of frames) for (const c of f.pose.circles) if (c.r > 0) expect(c.r).toBeLessThanOrEqual(16 + 1e-6)
  })

  it('is gentler than Tabs on small squares; wild stretches more than subtle', () => {
    for (const p of ['subtle', 'playful', 'wild'] as const) {
      expect(PAGINATION_FEEL[p].stretch).toBeLessThan(TABS_FEEL[p].stretch)
      expect(PAGINATION_FEEL[p].head).toEqual(TABS_FEEL[p].head)
    }
    const widest = (p: Preset) => Math.max(...slide(0, 5, p).map((f) => f.pose.body.w))
    expect(widest('wild')).toBeGreaterThan(widest('subtle'))
  })

  it('toggles: no wobble = no overshoot; no momentum = no tail', () => {
    expect(Math.max(...slide(1, 3, 'playful', { wobble: false }).map((f) => f.s.x.x))).toBeLessThanOrEqual(centerX(3) + 0.01)
    for (const f of slide(1, 3, 'playful', { momentum: false })) expect(f.pose.circles.every((c) => c.r === 0)).toBe(true)
  })

  it('lists its toggles and has a select cue for page items', () => {
    expect([...PAGINATION_EFFECTS]).toEqual(['indicator', 'wobble', 'momentum', 'press'])
    expect(GOOP_SOUND_CUES.paginationItem).toEqual({ bind: 'select' })
  })
})

describe('current page', () => {
  it('reads data-active first, else reka-ui data-selected / aria-current', () => {
    const el = document.createElement('button')
    expect(isPaginationActive(el)).toBe(false)
    el.setAttribute('data-selected', 'true')
    expect(isPaginationActive(el)).toBe(true)
    el.setAttribute('data-active', 'false')
    expect(isPaginationActive(el)).toBe(false)
    el.setAttribute('data-active', '')
    expect(isPaginationActive(el)).toBe(true)
  })

  it('when the app marks pages (data-active), reka marking is ignored', () => {
    const list = document.createElement('div')
    list.innerHTML =
      '<button data-type="page" data-selected="true" data-active="false">1</button><button data-type="page" data-active="true">2</button>'
    expect(findActivePage(list)).toBe(list.children[1])
  })
})

describe('attachPaginationIndicator', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    delete document.documentElement.dataset.reducedMotion
  })
  const setup = () => {
    const list = document.createElement('div')
    list.innerHTML =
      '<button aria-label="Previous Page">Prev</button>' +
      '<button data-type="page" data-selected="true" aria-current="page">1</button>' +
      '<button data-type="page">2</button><button data-type="page">3</button>' +
      '<button aria-label="Next Page">Next</button>'
    document.body.append(list)
    return list
  }
  const flush = () => new Promise((r) => setTimeout(r, 0))

  it('inserts one aria-hidden blob behind the pages and follows the current page', async () => {
    const list = setup()
    const h = attachPaginationIndicator(list)
    const el = list.firstElementChild as HTMLElement
    expect(el.getAttribute(GOOP_PART_ATTR)).toBe('highlight')
    expect(el.getAttribute('aria-hidden')).toBe('true')
    expect(list.querySelectorAll(`[${GOOP_PART_ATTR}="highlight"]`)).toHaveLength(1)
    expect(el.querySelectorAll(`[${GOOP_PART_ATTR}="blob"]`)).toHaveLength(MENU_HIGHLIGHT_CIRCLES)
    const pages = list.querySelectorAll('[data-type="page"]')
    expect(h.target).toBe(pages[0])
    pages[0]!.removeAttribute('data-selected')
    pages[0]!.removeAttribute('aria-current')
    pages[2]!.setAttribute('data-selected', 'true')
    await flush()
    expect(h.target).toBe(pages[2])
    expect(h.pop()).toBe(0)
    h.destroy()
    expect(activeTickerCount()).toBe(0)
    expect(list.querySelector(`[${GOOP_PART_ATTR}]`)).toBeNull()
  })

  it('follows a re-rendered page window (new item nodes)', async () => {
    const list = setup()
    const h = attachPaginationIndicator(list)
    for (const p of list.querySelectorAll('[data-type="page"]')) p.remove()
    const fresh = document.createElement('button')
    fresh.setAttribute('data-type', 'page')
    fresh.setAttribute('data-selected', 'true')
    list.lastElementChild!.before(fresh)
    await flush()
    expect(h.target).toBe(fresh)
    h.destroy()
  })

  it('reduced motion: snaps, nothing ticks', () => {
    document.documentElement.dataset.reducedMotion = 'true'
    const h = attachPaginationIndicator(setup())
    expect(h.reducedMotion).toBe(true)
    h.refresh()
    expect(activeTickerCount()).toBe(0)
    h.destroy()
  })
})
